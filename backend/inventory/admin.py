from django.contrib import admin

from inventory.models import Stock, StockTransaction


@admin.register(Stock)
class StockAdmin(admin.ModelAdmin):
    list_display = (
        "product",
        "physical_quantity",
        "reserved_quantity",
        "available_quantity",
        "updated_at",
    )
    search_fields = ("product__code", "product__name")


@admin.register(StockTransaction)
class StockTransactionAdmin(admin.ModelAdmin):
    list_display = (
        "stock",
        "transaction_type",
        "quantity",
        "reason",
        "reference",
        "created_by",
        "created_at",
    )
    list_filter = ("transaction_type", "created_at")
    search_fields = ("stock__product__code", "stock__product__name", "reason", "reference")
    readonly_fields = ("stock", "transaction_type", "quantity", "reason", "reference", "created_by", "created_at")
