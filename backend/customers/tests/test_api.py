from django.urls import reverse
from rest_framework import status
from rest_framework.test import APITestCase

from customers.models import Customer
from users.models import User


class CustomerApiTests(APITestCase):
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
        self.manager = User.objects.create_user(
            email="manager@example.com",
            password="StrongPassword123!",
            role=User.Role.INVENTORY_MANAGER,
        )
        self.url = reverse("customer-list")

    def test_unauthenticated_user_cannot_read_customers(self):
        response = self.client.get(self.url)
        self.assertEqual(response.status_code, status.HTTP_401_UNAUTHORIZED)

    def test_sales_executive_can_create_customer(self):
        self.client.force_authenticate(self.sales_user)
        response = self.client.post(self.url, {
            "name": "Acme Retail",
            "email": "  SALES@ACME.COM ",
            "phone": "+91 9999999999",
            "city": "Delhi",
            "country": "India",
        })

        self.assertEqual(response.status_code, status.HTTP_201_CREATED)
        self.assertEqual(response.data["email"], "sales@acme.com")
        self.assertEqual(Customer.objects.count(), 1)

    def test_duplicate_customer_email_is_rejected(self):
        Customer.objects.create(name="Existing", email="customer@example.com")
        self.client.force_authenticate(self.admin)

        response = self.client.post(self.url, {
            "name": "Duplicate",
            "email": "CUSTOMER@EXAMPLE.COM",
        })

        self.assertEqual(response.status_code, status.HTTP_400_BAD_REQUEST)
        self.assertIn("email", response.data)
        self.assertEqual(Customer.objects.count(), 1)

    def test_other_authenticated_roles_are_read_only(self):
        customer = Customer.objects.create(name="Existing")
        self.client.force_authenticate(self.manager)

        read_response = self.client.get(self.url)
        create_response = self.client.post(self.url, {"name": "Blocked"})
        update_response = self.client.patch(
            reverse("customer-detail", args=[customer.id]),
            {"name": "Blocked update"},
        )

        self.assertEqual(read_response.status_code, status.HTTP_200_OK)
        self.assertEqual(create_response.status_code, status.HTTP_403_FORBIDDEN)
        self.assertEqual(update_response.status_code, status.HTTP_403_FORBIDDEN)

    def test_delete_soft_deactivates_and_reactivate_is_supported(self):
        customer = Customer.objects.create(name="Existing")
        self.client.force_authenticate(self.sales_user)

        delete_response = self.client.delete(reverse("customer-detail", args=[customer.id]))
        self.assertEqual(delete_response.status_code, status.HTTP_204_NO_CONTENT)
        customer.refresh_from_db()
        self.assertFalse(customer.is_active)

        self.client.force_authenticate(self.admin)
        reactivate_response = self.client.patch(
            reverse("customer-detail", args=[customer.id]),
            {"is_active": True},
        )
        self.assertEqual(reactivate_response.status_code, status.HTTP_200_OK)
        customer.refresh_from_db()
        self.assertTrue(customer.is_active)

    def test_customers_support_search_filters_ordering_and_pagination(self):
        Customer.objects.create(name="Alpha Shop", city="Mumbai")
        Customer.objects.create(name="Beta Shop", city="Delhi", is_active=False)
        self.client.force_authenticate(self.admin)

        response = self.client.get(self.url, {
            "search": "shop",
            "city": "mumbai",
            "is_active": "true",
            "ordering": "-name",
            "page_size": 1,
        })

        self.assertEqual(response.status_code, status.HTTP_200_OK)
        self.assertEqual(response.data["count"], 1)
        self.assertEqual(response.data["results"][0]["name"], "Alpha Shop")
