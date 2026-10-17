from django.contrib import admin

from billing.models import Invoice, InvoiceItem, Payment


class InvoiceItemInline(admin.TabularInline):
    model = InvoiceItem
    extra = 0
    can_delete = False
    readonly_fields = ("product_code", "product_name", "quantity", "unit_price", "line_total")


@admin.register(Invoice)
class InvoiceAdmin(admin.ModelAdmin):
    list_display = ("invoice_number", "order", "total_amount", "created_at")
    search_fields = ("invoice_number", "order__order_number", "order__customer__name")
    readonly_fields = ("invoice_number", "order", "total_amount", "created_at", "updated_at")
    inlines = [InvoiceItemInline]


@admin.register(Payment)
class PaymentAdmin(admin.ModelAdmin):
    list_display = ("invoice", "amount", "payment_method", "payment_date", "created_by")
    list_filter = ("payment_method", "payment_date")
    search_fields = ("invoice__invoice_number", "reference")
    readonly_fields = ("invoice", "amount", "payment_method", "reference", "payment_date", "created_by", "created_at")
