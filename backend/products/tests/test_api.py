from decimal import Decimal

from django.urls import reverse
from rest_framework import status
from rest_framework.test import APITestCase

from products.models import Category, Product
from users.models import User


class CatalogApiTests(APITestCase):
    def setUp(self):
        self.admin = User.objects.create_user(
            email="admin@example.com",
            password="StrongPassword123!",
            role=User.Role.ADMIN,
        )
        self.manager = User.objects.create_user(
            email="manager@example.com",
            password="StrongPassword123!",
            role=User.Role.INVENTORY_MANAGER,
        )
        self.sales_user = User.objects.create_user(
            email="sales@example.com",
            password="StrongPassword123!",
            role=User.Role.SALES_EXECUTIVE,
        )
        self.category = Category.objects.create(name="Electronics")
        self.category_url = reverse("category-list")
        self.product_url = reverse("product-list")

    def test_unauthenticated_user_cannot_read_categories(self):
        response = self.client.get(self.category_url)

        self.assertEqual(response.status_code, status.HTTP_401_UNAUTHORIZED)

    def test_read_only_role_can_read_but_cannot_manage(self):
        self.client.force_authenticate(self.sales_user)

        read_response = self.client.get(self.category_url)
        create_response = self.client.post(self.category_url, {"name": "Furniture"})

        self.assertEqual(read_response.status_code, status.HTTP_200_OK)
        self.assertEqual(create_response.status_code, status.HTTP_403_FORBIDDEN)

    def test_inventory_manager_can_create_product(self):
        self.client.force_authenticate(self.manager)

        response = self.client.post(
            self.product_url,
            {
                "code": "lap-001",
                "name": "Laptop",
                "description": "Work laptop",
                "category": self.category.id,
                "unit_price": "999.99",
            },
        )

        self.assertEqual(response.status_code, status.HTTP_201_CREATED)
        self.assertEqual(response.data["code"], "LAP-001")
        self.assertEqual(Product.objects.count(), 1)
        self.assertEqual(Product.objects.first().unit_price, Decimal("999.99"))

    def test_duplicate_code_is_rejected(self):
        Product.objects.create(
            code="PHONE-001",
            name="Phone",
            category=self.category,
            unit_price=Decimal("499.99"),
        )
        self.client.force_authenticate(self.admin)

        response = self.client.post(
            self.product_url,
            {
                "code": "phone-001",
                "name": "Another Phone",
                "category": self.category.id,
                "unit_price": "599.99",
            },
        )

        self.assertEqual(response.status_code, status.HTTP_400_BAD_REQUEST)

    def test_delete_soft_deactivates_product(self):
        product = Product.objects.create(
            code="MOUSE-001",
            name="Mouse",
            category=self.category,
            unit_price=Decimal("25.00"),
        )
        self.client.force_authenticate(self.manager)

        response = self.client.delete(reverse("product-detail", args=[product.id]))

        self.assertEqual(response.status_code, status.HTTP_204_NO_CONTENT)
        product.refresh_from_db()
        self.assertFalse(product.is_active)

        self.client.force_authenticate(self.sales_user)
        response = self.client.get(self.product_url)
        self.assertEqual(response.status_code, status.HTTP_200_OK)
        self.assertEqual(response.data["count"], 0)
