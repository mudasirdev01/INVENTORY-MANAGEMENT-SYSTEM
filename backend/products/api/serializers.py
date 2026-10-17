from django.db import IntegrityError, transaction
from rest_framework import serializers

from products.models import Category, Product


class CategorySerializer(serializers.ModelSerializer):
    class Meta:
        model = Category
        fields = [
            "id",
            "name",
            "description",
            "is_active",
            "created_at",
            "updated_at",
        ]
        read_only_fields = ["id", "created_at", "updated_at"]

    def validate_name(self, value):
        value = value.strip()
        if not value:
            raise serializers.ValidationError("Category name cannot be empty.")
        return value


class ProductSerializer(serializers.ModelSerializer):
    # Validation is handled below after normalizing the code to uppercase.
    code = serializers.CharField(validators=[])
    category_name = serializers.CharField(source="category.name", read_only=True)

    class Meta:
        model = Product
        fields = [
            "id",
            "code",
            "name",
            "description",
            "category",
            "category_name",
            "unit_price",
            "reorder_level",
            "is_active",
            "created_at",
            "updated_at",
        ]
        read_only_fields = ["id", "category_name", "created_at", "updated_at"]

    def validate_code(self, value):
        code = value.strip().upper()
        queryset = Product.objects.filter(code=code)

        if self.instance:
            queryset = queryset.exclude(pk=self.instance.pk)

        if queryset.exists():
            raise serializers.ValidationError(
                "A product with this code already exists."
            )

        return code

    def create(self, validated_data):
        try:
            with transaction.atomic():
                return super().create(validated_data)
        except IntegrityError as error:
            if "code" in str(error).lower() or "unique" in str(error).lower():
                raise serializers.ValidationError(
                    {"code": "A product with this code already exists."}
                ) from error
            raise

    def update(self, instance, validated_data):
        try:
            with transaction.atomic():
                return super().update(instance, validated_data)
        except IntegrityError as error:
            if "code" in str(error).lower() or "unique" in str(error).lower():
                raise serializers.ValidationError(
                    {"code": "A product with this code already exists."}
                ) from error
            raise

    def validate_name(self, value):
        value = value.strip()
        if not value:
            raise serializers.ValidationError("Product name cannot be empty.")
        return value

    def validate_category(self, category):
        if not category.is_active:
            raise serializers.ValidationError("Products must use an active category.")
        return category
