from django.contrib import admin

from .models import Category, Product


@admin.register(Category)
class CategoryAdmin(admin.ModelAdmin):
    list_display = ("name", "is_active", "created_at", "updated_at")
    list_filter = ("is_active",)
    search_fields = ("name", "description")


@admin.register(Product)
class ProductAdmin(admin.ModelAdmin):
    list_display = ("code", "name", "category", "unit_price", "is_active")
    list_filter = ("is_active", "category")
    search_fields = ("code", "name", "description")
