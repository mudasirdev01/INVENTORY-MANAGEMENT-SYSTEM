from rest_framework.permissions import SAFE_METHODS, BasePermission

from users.models import User


class CanManageBilling(BasePermission):
    message = "Only admins and accountants can manage billing."

    def has_permission(self, request, view):
        user = request.user

        if not user.is_authenticated or not user.is_active:
            return False

        if request.method in SAFE_METHODS:
            return True

        return user.is_superuser or user.role in (
            User.Role.ADMIN,
            User.Role.ACCOUNTANT,
        )
