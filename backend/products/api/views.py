from rest_framework import filters, viewsets

from products.models import Category, Product
from products.api.pagination import CatalogPagination
from products.api.permissions import CanManageCatalog
from products.api.serializers import CategorySerializer, ProductSerializer
from users.models import User


def filter_active_records(queryset, request):
    """Keep inactive records hidden from read-only users, with an admin filter."""
    user = request.user
    can_manage = user.is_superuser or user.role in (
        User.Role.ADMIN,
        User.Role.INVENTORY_MANAGER,
    )

    if not can_manage:
        return queryset.filter(is_active=True)

    is_active = request.query_params.get("is_active")
    if is_active in ("true", "false"):
        return queryset.filter(is_active=is_active == "true")

    return queryset


class CategoryViewSet(viewsets.ModelViewSet):
    serializer_class = CategorySerializer
    permission_classes = [CanManageCatalog]
    pagination_class = CatalogPagination
    filter_backends = [filters.SearchFilter, filters.OrderingFilter]
    search_fields = ["name", "description"]
    ordering_fields = ["name", "created_at", "updated_at"]

    def get_queryset(self):
        return filter_active_records(Category.objects.all(), self.request)

    def perform_destroy(self, instance):
        instance.is_active = False
        instance.save(update_fields=["is_active", "updated_at"])
class ProductViewSet(viewsets.ModelViewSet):
    serializer_class = ProductSerializer
    permission_classes = [CanManageCatalog]
    pagination_class = CatalogPagination
    filter_backends = [filters.SearchFilter, filters.OrderingFilter]
    search_fields = ["code", "name", "description", "category__name"]
    ordering_fields = ["code", "name", "unit_price", "created_at", "updated_at"]

    def get_queryset(self):
        queryset = filter_active_records(
            Product.objects.select_related("category"),
            self.request,
        )

        category_id = self.request.query_params.get("category")
        if category_id:
            queryset = queryset.filter(category_id=category_id)

        return queryset

    def perform_destroy(self, instance):
        instance.is_active = False
        instance.save(update_fields=["is_active", "updated_at"])
