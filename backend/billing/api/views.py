from django.db.models import DecimalField, F, Sum, Value
from django.db.models.functions import Coalesce
from rest_framework import filters, viewsets
from rest_framework.decorators import action
from rest_framework.response import Response

from billing.api.pagination import BillingPagination
from billing.api.permissions import CanManageBilling
from billing.api.serializers import InvoiceSerializer, PaymentSerializer
from billing.models import Invoice, Payment


class InvoiceViewSet(viewsets.ModelViewSet):
    http_method_names = ["get", "post", "head", "options"]
    serializer_class = InvoiceSerializer
    permission_classes = [CanManageBilling]
    pagination_class = BillingPagination
    filter_backends = [filters.SearchFilter, filters.OrderingFilter]
    search_fields = [
        "invoice_number",
        "order__order_number",
        "order__customer__name",
        "order__customer__email",
        "items__product_code",
        "items__product_name",
    ]
    ordering_fields = ["invoice_number", "total_amount", "created_at", "updated_at"]

    def get_queryset(self):
        queryset = Invoice.objects.select_related(
            "order__customer"
        ).prefetch_related("items", "payments").annotate(
            total_paid=Coalesce(
                Sum("payments__amount"),
                Value(0),
                output_field=DecimalField(max_digits=14, decimal_places=2),
            )
        ).distinct().order_by("-created_at", "-id")

        order_id = self.request.query_params.get("order")
        customer_id = self.request.query_params.get("customer")
        payment_status = self.request.query_params.get("payment_status")
        if order_id:
            queryset = queryset.filter(order_id=order_id)
        if customer_id:
            queryset = queryset.filter(order__customer_id=customer_id)
        if payment_status == "unpaid":
            queryset = queryset.filter(total_paid=0)
        elif payment_status == "paid":
            queryset = queryset.filter(total_paid__gte=F("total_amount"))
        elif payment_status == "partial":
            queryset = queryset.filter(total_paid__gt=0, total_paid__lt=F("total_amount"))
        return queryset


    @action(
        detail=True,
        methods=["get", "post"],
        url_path="payments",
        serializer_class=PaymentSerializer,
    )
    def payments(self, request, pk=None):
        invoice = self.get_object()
        if request.method == "POST":
            serializer = self.get_serializer(
                data=request.data,
                context={
                    "request": request,
                    "invoice": invoice,
                },
            )
            serializer.is_valid(raise_exception=True)
            serializer.save()
            return Response(serializer.data, status=201)

        queryset = Payment.objects.filter(invoice=invoice).select_related("invoice", "created_by")
        page = self.paginate_queryset(queryset)
        if page is not None:
            serializer = PaymentSerializer(page, many=True, context={"request": request})
            return self.get_paginated_response(serializer.data)
        serializer = PaymentSerializer(queryset, many=True, context={"request": request})
        return Response(serializer.data)
