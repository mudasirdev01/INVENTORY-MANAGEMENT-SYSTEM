from rest_framework import serializers

from inventory.models import Stock, StockTransaction
from products.models import Product


class ProductStockSerializer(serializers.ModelSerializer):
    physical_quantity = serializers.SerializerMethodField()
    reserved_quantity = serializers.SerializerMethodField()
    available_quantity = serializers.SerializerMethodField()
    stock_updated_at = serializers.SerializerMethodField()

    class Meta:
        model = Product
        fields = [
            "id",
            "code",
            "name",
            "is_active",
            "reorder_level",
            "physical_quantity",
            "reserved_quantity",
            "available_quantity",
            "stock_updated_at",
        ]

    def _stock(self, product):
        return getattr(product, "stock", None)

    def get_physical_quantity(self, product):
        stock = self._stock(product)
        return stock.physical_quantity if stock else 0

    def get_reserved_quantity(self, product):
        stock = self._stock(product)
        return stock.reserved_quantity if stock else 0

    def get_available_quantity(self, product):
        stock = self._stock(product)
        return stock.available_quantity if stock else 0

    def get_stock_updated_at(self, product):
        stock = self._stock(product)
        return stock.updated_at if stock else None


class StockSettingsSerializer(serializers.Serializer):
    reserved_quantity = serializers.IntegerField(required=False, min_value=0)
    reorder_level = serializers.IntegerField(required=False, min_value=0)

    def validate_reserved_quantity(self, value):
        if self.instance and value > self.instance.physical_quantity:
            raise serializers.ValidationError(
                "Reserved quantity cannot be greater than physical quantity."
            )
        return value


class StockMovementSerializer(serializers.Serializer):
    product = serializers.PrimaryKeyRelatedField(queryset=Product.objects.all())
    quantity = serializers.IntegerField(min_value=1)
    reason = serializers.CharField(max_length=255)
    reference = serializers.CharField(max_length=100, required=False, allow_blank=True)

    def validate_reason(self, value):
        value = value.strip()
        if not value:
            raise serializers.ValidationError("Reason cannot be empty.")
        return value

    def validate_reference(self, value):
        return value.strip()


class StockTransactionSerializer(serializers.ModelSerializer):
    product = serializers.IntegerField(source="stock.product_id", read_only=True)
    product_code = serializers.CharField(source="stock.product.code", read_only=True)

    class Meta:
        model = StockTransaction
        fields = [
            "id",
            "product",
            "product_code",
            "transaction_type",
            "quantity",
            "reason",
            "reference",
            "created_by",
            "created_at",
        ]
