from rest_framework import serializers

from billing.models import Invoice, InvoiceItem, Payment
from billing.services.billing_service import create_invoice_for_order, record_payment
from orders.models import SalesOrder


class InvoiceItemSerializer(serializers.ModelSerializer):
    class Meta:
        model = InvoiceItem
        fields = [
            "id",
            "product_code",
            "product_name",
            "quantity",
            "unit_price",
            "line_total",
        ]
        read_only_fields = fields


class InvoiceSerializer(serializers.ModelSerializer):
    order_number = serializers.CharField(source="order.order_number", read_only=True)
    customer = serializers.IntegerField(source="order.customer_id", read_only=True)
    customer_name = serializers.CharField(source="order.customer.name", read_only=True)
    items = InvoiceItemSerializer(many=True, read_only=True)
    paid_amount = serializers.DecimalField(max_digits=14, decimal_places=2, read_only=True)
    outstanding_amount = serializers.DecimalField(max_digits=14, decimal_places=2, read_only=True)
    payment_status = serializers.CharField(read_only=True)
    order = serializers.PrimaryKeyRelatedField(
        queryset=SalesOrder.objects.all(),
        write_only=True,
    )

    class Meta:
        model = Invoice
        fields = [
            "id",
            "invoice_number",
            "order",
            "order_number",
            "customer",
            "customer_name",
            "items",
            "total_amount",
            "paid_amount",
            "outstanding_amount",
            "payment_status",
            "created_at",
            "updated_at",
        ]
        read_only_fields = [
            "id",
            "invoice_number",
            "order_number",
            "customer",
            "customer_name",
            "items",
            "total_amount",
            "paid_amount",
            "outstanding_amount",
            "payment_status",
            "created_at",
            "updated_at",
        ]

    def validate_order(self, order):
        if order.status != SalesOrder.Status.DISPATCHED:
            raise serializers.ValidationError("Invoices can only be created for dispatched orders.")
        if Invoice.objects.filter(order=order).exists():
            raise serializers.ValidationError("An invoice already exists for this order.")
        return order

    def create(self, validated_data):
        return create_invoice_for_order(validated_data["order"].pk)


class PaymentSerializer(serializers.ModelSerializer):
    invoice_number = serializers.CharField(source="invoice.invoice_number", read_only=True)
    payment_method_display = serializers.CharField(source="get_payment_method_display", read_only=True)

    class Meta:
        model = Payment
        fields = [
            "id",
            "invoice",
            "invoice_number",
            "amount",
            "payment_method",
            "payment_method_display",
            "reference",
            "payment_date",
            "created_by",
            "created_at",
        ]
        read_only_fields = ["id", "invoice", "invoice_number", "payment_method_display", "created_by", "created_at"]

    def create(self, validated_data):
        invoice = self.context["invoice"]
        return record_payment(invoice.pk, validated_data, self.context["request"].user)
