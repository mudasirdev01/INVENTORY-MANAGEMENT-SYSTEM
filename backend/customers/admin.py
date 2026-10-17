from django.contrib import admin

from customers.models import Customer


@admin.register(Customer)
class CustomerAdmin(admin.ModelAdmin):
    list_display = ("name", "email", "phone", "city", "is_active", "updated_at")
    list_filter = ("is_active", "country", "state")
    search_fields = ("name", "email", "phone", "city")
