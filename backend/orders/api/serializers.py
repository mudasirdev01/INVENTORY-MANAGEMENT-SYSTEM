from django.db import transaction
from rest_framework import serializers

from customers.models import Customer
from orders.models import SalesOrder, SalesOrderItem
from products.models import Product


class SalesOrderItemSerializer(serializers.ModelSerializer):
    product_code = serializers.CharField(source="product.code", read_only=True)
    product_name = serializers.CharField(source="product.name", read_only=True)

    class Meta:
        model = SalesOrderItem
        fields = [
            "id",
            "product",
            "product_code",
            "product_name",
            "quantity",
            "unit_price",
            "line_total",
        ]
        read_only_fields = ["id", "product_code", "product_name", "unit_price", "line_total"]


class SalesOrderSerializer(serializers.ModelSerializer):
    items = SalesOrderItemSerializer(many=True)
    customer_name = serializers.CharField(source="customer.name", read_only=True)
    status_display = serializers.CharField(source="get_status_display", read_only=True)

    class Meta:
        model = SalesOrder
        fields = [
            "id",
            "order_number",
            "customer",
            "customer_name",
            "items",
            "status",
            "status_display",
            "total_amount",
            "created_by",
            "created_at",
            "updated_at",
        ]
        read_only_fields = [
            "id",
            "order_number",
            "customer_name",
            "status",
            "status_display",
            "total_amount",
            "created_by",
            "created_at",
            "updated_at",
        ]

    def validate_customer(self, customer):
        if not customer.is_active:
            raise serializers.ValidationError("Orders must use an active customer.")
        return customer

    def validate_items(self, items):
        if not items:
            raise serializers.ValidationError("At least one order item is required.")

        product_ids = [item["product"].id for item in items]
        if len(product_ids) != len(set(product_ids)):
            raise serializers.ValidationError("A product can appear only once per order.")

        inactive = Product.objects.filter(id__in=product_ids, is_active=False).exists()
        if inactive:
            raise serializers.ValidationError("Orders cannot contain inactive products.")
        return items

    def validate(self, attrs):
        if self.instance and self.instance.status != SalesOrder.Status.PENDING:
            raise serializers.ValidationError("Only pending orders can be changed.")
        return attrs

    def _save_items(self, order, items):
        total = 0
        for item_data in items:
            product = item_data["product"]
            item = SalesOrderItem.objects.create(
                order=order,
                product=product,
                quantity=item_data["quantity"],
                unit_price=product.unit_price,
                line_total=product.unit_price * item_data["quantity"],
            )
            total += item.line_total
        order.total_amount = total
        order.save(update_fields=["total_amount", "updated_at"])
        return order

    def create(self, validated_data):
        items = validated_data.pop("items")
        request = self.context["request"]
        with transaction.atomic():
            order = SalesOrder.objects.create(created_by=request.user, **validated_data)
            return self._save_items(order, items)

    def update(self, instance, validated_data):
        items = validated_data.pop("items", None)
        with transaction.atomic():
            order = super().update(instance, validated_data)
            if items is not None:
                order.items.all().delete()
                self._save_items(order, items)
            return order
