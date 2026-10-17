from rest_framework.permissions import BasePermission
from users.models import User


class IsAdminRole(BasePermission):
    message = "Only admins can manage employees."

    def has_permission(self, request, view):
        user = request.user

        return (
            user.is_authenticated
            and user.is_active
            and (
                user.is_superuser
                or user.role == User.Role.ADMIN
            )
        )