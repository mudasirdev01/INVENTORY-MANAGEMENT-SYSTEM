from django.contrib import admin

from orders.models import SalesOrder, SalesOrderItem


class SalesOrderItemInline(admin.TabularInline):
    model = SalesOrderItem
    extra = 0
    readonly_fields = ("unit_price", "line_total")


@admin.register(SalesOrder)
class SalesOrderAdmin(admin.ModelAdmin):
    list_display = ("order_number", "customer", "status", "total_amount", "created_at")
    list_filter = ("status", "created_at")
    search_fields = ("order_number", "customer__name", "customer__email")
    readonly_fields = ("order_number", "total_amount", "created_by", "created_at", "updated_at")
    inlines = [SalesOrderItemInline]
