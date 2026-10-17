from rest_framework import filters, viewsets
from rest_framework.decorators import action
from rest_framework.exceptions import ValidationError
from rest_framework.response import Response

from orders.api.pagination import OrderPagination
from orders.api.permissions import CanManageOrders
from orders.api.serializers import SalesOrderSerializer
from orders.models import SalesOrder
from orders.services.order_service import change_order_status


class SalesOrderViewSet(viewsets.ModelViewSet):
    serializer_class = SalesOrderSerializer
    permission_classes = [CanManageOrders]
    pagination_class = OrderPagination
    filter_backends = [filters.SearchFilter, filters.OrderingFilter]
    search_fields = [
        "order_number",
        "customer__name",
        "customer__email",
        "items__product__code",
        "items__product__name",
    ]
    ordering_fields = ["order_number", "status", "total_amount", "created_at", "updated_at"]

    def get_queryset(self):
        queryset = SalesOrder.objects.select_related("customer", "created_by").prefetch_related(
            "items__product"
        ).distinct()
        order_status = self.request.query_params.get("status")
        customer_id = self.request.query_params.get("customer")
        if order_status in dict(SalesOrder.Status.choices):
            queryset = queryset.filter(status=order_status)
        if customer_id:
            queryset = queryset.filter(customer_id=customer_id)
        return queryset

    def perform_destroy(self, instance):
        if instance.status != SalesOrder.Status.PENDING:
            raise ValidationError("Only pending orders can be deleted.")
        instance.delete()

    @action(detail=True, methods=["post"])
    def confirm(self, request, pk=None):
        return self._status_response(request, pk, SalesOrder.Status.CONFIRMED)

    @action(detail=True, methods=["post"], url_path="dispatch", url_name="dispatch")
    def dispatch_action(self, request, pk=None):
        return self._status_response(request, pk, SalesOrder.Status.DISPATCHED)

    @action(detail=True, methods=["post"])
    def cancel(self, request, pk=None):
        return self._status_response(request, pk, SalesOrder.Status.CANCELLED)

    def _status_response(self, request, order_id, target_status):
        order = change_order_status(order_id, target_status, request.user)
        return Response(SalesOrderSerializer(order, context={"request": request}).data)
