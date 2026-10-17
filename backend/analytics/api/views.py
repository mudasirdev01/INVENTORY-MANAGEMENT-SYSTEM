from datetime import date
from decimal import Decimal

from django.db.models import DecimalField, F, IntegerField, Q, Sum, Value
from django.db.models.functions import Coalesce, TruncMonth
from django.utils.dateparse import parse_date
from rest_framework.exceptions import ValidationError
from rest_framework.response import Response
from rest_framework.views import APIView

from billing.models import Invoice, Payment
from customers.models import Customer
from inventory.models import Stock
from orders.models import SalesOrder, SalesOrderItem
from products.models import Product
from analytics.api.permissions import CanReadAnalytics
from analytics.api.serializers import (
    DashboardSummarySerializer,
    LowStockSerializer,
    MonthlySalesSerializer,
    RecentOrderSerializer,
    TopProductSerializer,
)


MONEY_FIELD = DecimalField(max_digits=18, decimal_places=2)
ZERO_MONEY = Value(Decimal("0.00"), output_field=MONEY_FIELD)


def date_bounds(request):
    start_value = request.query_params.get("start_date")
    end_value = request.query_params.get("end_date")
    start = parse_date(start_value) if start_value else None
    end = parse_date(end_value) if end_value else None
    if start_value and not start:
        raise ValidationError({"start_date": "Use YYYY-MM-DD format."})
    if end_value and not end:
        raise ValidationError({"end_date": "Use YYYY-MM-DD format."})
    if start and end and start > end:
        raise ValidationError({"date": "start_date cannot be after end_date."})
    return start, end


def apply_datetime_dates(queryset, field, start, end):
    if start:
        queryset = queryset.filter(**{f"{field}__date__gte": start})
    if end:
        queryset = queryset.filter(**{f"{field}__date__lte": end})
    return queryset


def low_stock_queryset(start=None, end=None):
    queryset = Product.objects.filter(is_active=True).filter(
        Q(stock__isnull=True)
        | Q(stock__physical_quantity__lte=F("stock__reserved_quantity") + F("reorder_level"))
    )
    if start:
        queryset = queryset.filter(Q(stock__isnull=True) | Q(stock__updated_at__date__gte=start))
    if end:
        queryset = queryset.filter(Q(stock__isnull=True) | Q(stock__updated_at__date__lte=end))
    return queryset.annotate(
        physical_quantity=Coalesce(F("stock__physical_quantity"), Value(0), output_field=IntegerField()),
        reserved_quantity=Coalesce(F("stock__reserved_quantity"), Value(0), output_field=IntegerField()),
        available_quantity=Coalesce(
            F("stock__physical_quantity") - F("stock__reserved_quantity"),
            Value(0),
            output_field=IntegerField(),
        ),
    ).order_by("available_quantity", "name")


def dispatched_orders(request):
    start, end = date_bounds(request)
    queryset = SalesOrder.objects.filter(status=SalesOrder.Status.DISPATCHED)
    return apply_datetime_dates(queryset, "created_at", start, end), start, end


def financial_totals(request):
    order_queryset, start, end = dispatched_orders(request)
    sales_total = order_queryset.aggregate(total=Coalesce(Sum("total_amount"), ZERO_MONEY))["total"]

    payment_queryset = Payment.objects.all()
    if start:
        payment_queryset = payment_queryset.filter(payment_date__gte=start)
    if end:
        payment_queryset = payment_queryset.filter(payment_date__lte=end)
    payments_received = payment_queryset.aggregate(total=Coalesce(Sum("amount"), ZERO_MONEY))["total"]

    invoice_queryset = apply_datetime_dates(Invoice.objects.all(), "created_at", start, end)
    invoice_total = invoice_queryset.aggregate(total=Coalesce(Sum("total_amount"), ZERO_MONEY))["total"]
    invoice_payments = Payment.objects.filter(invoice__in=invoice_queryset).aggregate(
        total=Coalesce(Sum("amount"), ZERO_MONEY)
    )["total"]
    outstanding = invoice_total - invoice_payments
    return sales_total, payments_received, outstanding


class DashboardSummaryView(APIView):
    permission_classes = [CanReadAnalytics]

    def get(self, request):
        start, end = date_bounds(request)
        order_queryset = SalesOrder.objects.exclude(status=SalesOrder.Status.CANCELLED)
        order_queryset = apply_datetime_dates(order_queryset, "created_at", start, end)
        sales_total, payments_received, outstanding = financial_totals(request)
        products = Product.objects.filter(is_active=True)
        customers = Customer.objects.filter(is_active=True)
        stock = Stock.objects.filter(product__is_active=True)
        products = apply_datetime_dates(products, "created_at", start, end)
        customers = apply_datetime_dates(customers, "created_at", start, end)
        stock = apply_datetime_dates(stock, "updated_at", start, end)
        data = {
            "products_count": products.count(),
            "customers_count": customers.count(),
            "orders_count": order_queryset.count(),
            "stock_items_count": stock.count(),
            "low_stock_count": low_stock_queryset(start, end).count(),
            "dispatched_sales_total": sales_total,
            "payments_received_total": payments_received,
            "outstanding_balance": outstanding,
        }
        return Response(DashboardSummarySerializer(data).data)


class SalesTotalsView(APIView):
    permission_classes = [CanReadAnalytics]

    def get(self, request):
        sales_total, payments_received, outstanding = financial_totals(request)
        return Response({
            "dispatched_sales_total": sales_total,
            "payments_received_total": payments_received,
            "outstanding_balance": outstanding,
        })


class MonthlySalesTrendView(APIView):
    permission_classes = [CanReadAnalytics]

    def get(self, request):
        orders, _, _ = dispatched_orders(request)
        rows = orders.annotate(month_value=TruncMonth("created_at")).values(
            "month_value"
        ).annotate(
            sales_total=Coalesce(Sum("total_amount"), ZERO_MONEY),
            order_count=Sum(Value(1), output_field=IntegerField()),
        ).order_by("month_value")
        data = [
            {
                "month": row["month_value"].strftime("%Y-%m"),
                "sales_total": row["sales_total"],
                "order_count": row["order_count"],
            }
            for row in rows
        ]
        return Response(MonthlySalesSerializer(data, many=True).data)


class TopSellingProductsView(APIView):
    permission_classes = [CanReadAnalytics]

    def get(self, request):
        orders, _, _ = dispatched_orders(request)
        limit_value = request.query_params.get("limit", "5")
        try:
            limit = min(max(int(limit_value), 1), 20)
        except ValueError:
            raise ValidationError({"limit": "Limit must be a number between 1 and 20."})

        rows = SalesOrderItem.objects.filter(order__in=orders).values(
            "product_id", "product__code", "product__name"
        ).annotate(
            quantity_sold=Coalesce(Sum("quantity"), Value(0), output_field=IntegerField()),
            sales_total=Coalesce(Sum("line_total"), ZERO_MONEY),
        ).order_by("-quantity_sold", "-sales_total", "product__name")[:limit]
        data = [
            {
                "product_id": row["product_id"],
                "code": row["product__code"],
                "name": row["product__name"],
                "quantity_sold": row["quantity_sold"],
                "sales_total": row["sales_total"],
            }
            for row in rows
        ]
        return Response(TopProductSerializer(data, many=True).data)


class RecentOrdersView(APIView):
    permission_classes = [CanReadAnalytics]

    def get(self, request):
        start, end = date_bounds(request)
        try:
            limit = min(max(int(request.query_params.get("limit", "10")), 1), 50)
        except ValueError:
            raise ValidationError({"limit": "Limit must be a number between 1 and 50."})
        orders = SalesOrder.objects.select_related("customer").exclude(
            status=SalesOrder.Status.CANCELLED
        )
        orders = apply_datetime_dates(orders, "created_at", start, end).order_by(
            "-created_at", "-id"
        )[:limit]
        data = [
            {
                "id": order.id,
                "order_number": order.order_number,
                "customer_name": order.customer.name,
                "status": order.status,
                "total_amount": order.total_amount,
                "created_at": order.created_at,
            }
            for order in orders
        ]
        return Response(RecentOrderSerializer(data, many=True).data)


class LowStockReportView(APIView):
    permission_classes = [CanReadAnalytics]

    def get(self, request):
        start, end = date_bounds(request)
        try:
            limit = min(max(int(request.query_params.get("limit", "20")), 1), 100)
        except ValueError:
            raise ValidationError({"limit": "Limit must be a number between 1 and 100."})
        rows = low_stock_queryset(start, end)[:limit]
        data = [
            {
                "product_id": row.id,
                "code": row.code,
                "name": row.name,
                "physical_quantity": row.physical_quantity,
                "reserved_quantity": row.reserved_quantity,
                "available_quantity": row.available_quantity,
                "reorder_level": row.reorder_level,
            }
            for row in rows
        ]
        return Response(LowStockSerializer(data, many=True).data)
