from django.urls import reverse
from rest_framework import status
from rest_framework.test import APITestCase

from users.models import User


class UserManagementApiTests(APITestCase):
    def setUp(self):
        self.admin = User.objects.create_user(
            email="admin@example.com",
            password="StrongPassword123!",
            role=User.Role.ADMIN,
        )
        self.sales_user = User.objects.create_user(
            email="sales@example.com",
            password="StrongPassword123!",
            role=User.Role.SALES_EXECUTIVE,
        )
        self.user_url = reverse("user-list")

    def test_non_admin_cannot_manage_users(self):
        self.client.force_authenticate(self.sales_user)

        response = self.client.get(self.user_url)

        self.assertEqual(response.status_code, status.HTTP_403_FORBIDDEN)

    def test_admin_can_update_employee_email(self):
        self.client.force_authenticate(self.admin)

        response = self.client.patch(
            reverse("user-detail", args=[self.sales_user.id]),
            {"email": "updated@example.com"},
        )

        self.assertEqual(response.status_code, status.HTTP_200_OK)
        self.sales_user.refresh_from_db()
        self.assertEqual(self.sales_user.email, "updated@example.com")

    def test_duplicate_employee_email_is_rejected(self):
        other = User.objects.create_user(
            email="other@example.com",
            password="StrongPassword123!",
            role=User.Role.ACCOUNTANT,
        )
        self.client.force_authenticate(self.admin)

        response = self.client.patch(
            reverse("user-detail", args=[other.id]),
            {"email": self.sales_user.email},
        )

        self.assertEqual(response.status_code, status.HTTP_400_BAD_REQUEST)
        self.assertIn("email", response.data)
