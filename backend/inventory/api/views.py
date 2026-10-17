from django.db import transaction
from django.db.models import F, Q
from django.shortcuts import get_object_or_404
from rest_framework import filters, status
from rest_framework.exceptions import ValidationError
from rest_framework.generics import ListAPIView
from rest_framework.permissions import IsAuthenticated
from rest_framework.response import Response
from rest_framework.views import APIView

from inventory.api.pagination import InventoryPagination
from inventory.api.permissions import CanAccessInventory
from inventory.api.serializers import (
    ProductStockSerializer,
    StockMovementSerializer,
    StockSettingsSerializer,
    StockTransactionSerializer,
)
from inventory.models import Stock, StockTransaction
from products.models import Product
from users.models import User


def can_manage_inventory(user):
    return user.is_superuser or user.role in (
        User.Role.ADMIN,
        User.Role.INVENTORY_MANAGER,
    )


class StockOverviewView(ListAPIView):
    low_stock_only = False
    serializer_class = ProductStockSerializer
    permission_classes = [CanAccessInventory]
    pagination_class = InventoryPagination
    filter_backends = [filters.SearchFilter, filters.OrderingFilter]
    search_fields = ["code", "name"]
    ordering_fields = ["code", "name", "reorder_level", "updated_at"]

    def get_queryset(self):
        queryset = Product.objects.select_related("stock").all()

        if not can_manage_inventory(self.request.user):
            queryset = queryset.filter(is_active=True)

        if self.low_stock_only:
            queryset = queryset.filter(is_active=True)

        if self.low_stock_only or self.request.query_params.get("low_stock") == "true":
            queryset = queryset.filter(
                Q(stock__isnull=True)
                | Q(
                    stock__physical_quantity__lte=(
                        F("stock__reserved_quantity") + F("reorder_level")
                    )
                )
            )

        return queryset


class LowStockView(StockOverviewView):
    low_stock_only = True


class StockDetailView(APIView):
    permission_classes = [CanAccessInventory]

    def get(self, request, product_id):
        product = get_object_or_404(
            Product.objects.select_related("stock"),
            pk=product_id,
        )
        if not can_manage_inventory(request.user) and not product.is_active:
            return Response({"detail": "Product not found."}, status=status.HTTP_404_NOT_FOUND)
        return Response(ProductStockSerializer(product).data)

    def patch(self, request, product_id):
        with transaction.atomic():
            product = get_object_or_404(
                Product.objects.select_for_update(),
                pk=product_id,
            )
            if not product.is_active:
                raise ValidationError({
                    "product": "Stock cannot be changed for an inactive product."
                })
            stock, _ = Stock.objects.select_for_update().get_or_create(product=product)

            serializer = StockSettingsSerializer(
                stock,
                data=request.data,
                partial=True,
            )
            serializer.is_valid(raise_exception=True)

            reserved_quantity = serializer.validated_data.get(
                "reserved_quantity",
                stock.reserved_quantity,
            )
            if reserved_quantity > stock.physical_quantity:
                raise ValidationError({
                    "reserved_quantity": (
                        "Reserved quantity cannot be greater than physical quantity."
                    )
                })

            stock.reserved_quantity = reserved_quantity
            stock.save(update_fields=["reserved_quantity", "updated_at"])

            if "reorder_level" in serializer.validated_data:
                product.reorder_level = serializer.validated_data["reorder_level"]
                product.save(update_fields=["reorder_level", "updated_at"])

            product = Product.objects.select_related("stock").get(pk=product.pk)

        return Response(ProductStockSerializer(product).data)


class StockMovementView(APIView):
    permission_classes = [CanAccessInventory]
    transaction_type = None

    def post(self, request):
        serializer = StockMovementSerializer(data=request.data)
        serializer.is_valid(raise_exception=True)

        product_id = serializer.validated_data["product"].id
        quantity = serializer.validated_data["quantity"]

        with transaction.atomic():
            product = get_object_or_404(
                Product.objects.select_for_update(),
                pk=product_id,
            )
            if not product.is_active:
                raise ValidationError({
                    "product": "Stock cannot be changed for an inactive product."
                })

            stock, _ = Stock.objects.select_for_update().get_or_create(product=product)

            if self.transaction_type == StockTransaction.TransactionType.OUT:
                if quantity > stock.available_quantity:
                    raise ValidationError({
                        "quantity": (
                            "Stock OUT cannot exceed available quantity "
                            f"({stock.available_quantity})."
                        )
                    })
                stock.physical_quantity -= quantity
            else:
                stock.physical_quantity += quantity

            stock.save(update_fields=["physical_quantity", "updated_at"])
            movement = StockTransaction.objects.create(
                stock=stock,
                transaction_type=self.transaction_type,
                quantity=quantity,
                reason=serializer.validated_data["reason"],
                reference=serializer.validated_data.get("reference", ""),
                created_by=request.user,
            )

        return Response(
            StockTransactionSerializer(movement).data,
            status=status.HTTP_201_CREATED,
        )


class StockInView(StockMovementView):
    transaction_type = StockTransaction.TransactionType.IN


class StockOutView(StockMovementView):
    transaction_type = StockTransaction.TransactionType.OUT


class StockTransactionListView(ListAPIView):
    serializer_class = StockTransactionSerializer
    permission_classes = [IsAuthenticated]
    pagination_class = InventoryPagination
    filter_backends = [filters.SearchFilter, filters.OrderingFilter]
    search_fields = ["stock__product__code", "stock__product__name", "reason", "reference"]
    ordering_fields = ["created_at", "quantity", "transaction_type"]

    def get_queryset(self):
        queryset = StockTransaction.objects.select_related(
            "stock__product",
            "created_by",
        )
        product_id = self.request.query_params.get("product")
        transaction_type = self.request.query_params.get("type")

        if product_id:
            queryset = queryset.filter(stock__product_id=product_id)
        if transaction_type in ("IN", "OUT"):
            queryset = queryset.filter(transaction_type=transaction_type)

        if not can_manage_inventory(self.request.user):
            queryset = queryset.filter(stock__product__is_active=True)

        return queryset
