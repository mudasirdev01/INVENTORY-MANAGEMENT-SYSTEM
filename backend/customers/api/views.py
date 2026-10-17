from rest_framework import filters
from rest_framework import viewsets

from customers.api.pagination import CustomerPagination
from customers.api.permissions import CanManageCustomers
from customers.api.serializers import CustomerSerializer
from customers.models import Customer
from users.models import User


def can_manage_customers(user):
    return user.is_superuser or user.role in (
        User.Role.ADMIN,
        User.Role.SALES_EXECUTIVE,
    )


def visible_customers(request):
    queryset = Customer.objects.all()
    if not can_manage_customers(request.user):
        return queryset.filter(is_active=True)

    is_active = request.query_params.get("is_active")
    if is_active in ("true", "false"):
        return queryset.filter(is_active=is_active == "true")
    return queryset


class CustomerViewSet(viewsets.ModelViewSet):
    serializer_class = CustomerSerializer
    permission_classes = [CanManageCustomers]
    pagination_class = CustomerPagination
    filter_backends = [filters.SearchFilter, filters.OrderingFilter]
    search_fields = ["name", "email", "phone", "address", "city", "state", "postal_code", "country"]
    ordering_fields = ["name", "email", "city", "created_at", "updated_at"]

    def get_queryset(self):
        queryset = visible_customers(self.request)
        for field in ("city", "state", "country"):
            value = self.request.query_params.get(field)
            if value:
                queryset = queryset.filter(**{f"{field}__iexact": value.strip()})
        return queryset

    def perform_destroy(self, instance):
        instance.is_active = False
        instance.save(update_fields=["is_active", "updated_at"])
