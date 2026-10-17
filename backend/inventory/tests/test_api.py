from decimal import Decimal

from django.urls import reverse
from rest_framework import status
from rest_framework.test import APITestCase

from inventory.models import Stock, StockTransaction
from products.models import Category, Product
from users.models import User


class InventoryApiTests(APITestCase):
    def setUp(self):
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
        category = Category.objects.create(name="Hardware")
        self.product = Product.objects.create(
            code="LAP-001",
            name="Laptop",
            category=category,
            unit_price=Decimal("999.99"),
            reorder_level=5,
        )
        self.inactive_product = Product.objects.create(
            code="OLD-001",
            name="Old product",
            category=category,
            unit_price=Decimal("10.00"),
            is_active=False,
        )
        self.stock_in_url = reverse("stock-in")
        self.stock_out_url = reverse("stock-out")
        self.stock_url = reverse("stock-overview")
        self.low_stock_url = reverse("low-stock")
        self.transaction_url = reverse("stock-transactions")

    def test_stock_in_updates_physical_and_available_stock(self):
        self.client.force_authenticate(self.manager)

        response = self.client.post(
            self.stock_in_url,
            {
                "product": self.product.id,
                "quantity": 10,
                "reason": "Opening stock",
                "reference": "PO-1001",
            },
        )

        self.assertEqual(response.status_code, status.HTTP_201_CREATED)
        stock = Stock.objects.get(product=self.product)
        self.assertEqual(stock.physical_quantity, 10)
        self.assertEqual(stock.available_quantity, 10)
        self.assertEqual(StockTransaction.objects.count(), 1)
        self.assertEqual(response.data["transaction_type"], "IN")

    def test_stock_out_cannot_use_reserved_or_create_negative_stock(self):
        Stock.objects.create(
            product=self.product,
            physical_quantity=10,
            reserved_quantity=4,
        )
        self.client.force_authenticate(self.manager)

        reserved_response = self.client.post(
            self.stock_out_url,
            {
                "product": self.product.id,
                "quantity": 7,
                "reason": "Customer order",
            },
        )
        negative_response = self.client.post(
            self.stock_out_url,
            {
                "product": self.product.id,
                "quantity": 7,
                "reason": "Customer order",
            },
        )

        self.assertEqual(reserved_response.status_code, status.HTTP_400_BAD_REQUEST)
        self.assertEqual(negative_response.status_code, status.HTTP_400_BAD_REQUEST)
        stock = Stock.objects.get(product=self.product)
        self.assertEqual(stock.physical_quantity, 10)
        self.assertEqual(StockTransaction.objects.count(), 0)

    def test_valid_stock_out_reduces_physical_stock(self):
        Stock.objects.create(product=self.product, physical_quantity=10)
        self.client.force_authenticate(self.manager)

        response = self.client.post(
            self.stock_out_url,
            {
                "product": self.product.id,
                "quantity": 3,
                "reason": "Customer order",
                "reference": "SO-1001",
            },
        )

        self.assertEqual(response.status_code, status.HTTP_201_CREATED)
        stock = Stock.objects.get(product=self.product)
        self.assertEqual(stock.physical_quantity, 7)
        self.assertEqual(stock.available_quantity, 7)
        self.assertEqual(response.data["transaction_type"], "OUT")

    def test_inactive_product_cannot_receive_stock(self):
        self.client.force_authenticate(self.manager)

        response = self.client.post(
            self.stock_in_url,
            {
                "product": self.inactive_product.id,
                "quantity": 5,
                "reason": "Restock",
            },
        )

        self.assertEqual(response.status_code, status.HTTP_400_BAD_REQUEST)
        self.assertIn("inactive", str(response.data).lower())
        self.assertFalse(Stock.objects.filter(product=self.inactive_product).exists())

        settings_response = self.client.patch(
            reverse("stock-detail", args=[self.inactive_product.id]),
            {"reserved_quantity": 0, "reorder_level": 3},
        )
        self.assertEqual(settings_response.status_code, status.HTTP_400_BAD_REQUEST)

    def test_other_roles_can_read_but_cannot_change_stock(self):
        self.client.force_authenticate(self.sales_user)

        read_response = self.client.get(self.stock_url)
        write_response = self.client.post(
            self.stock_in_url,
            {
                "product": self.product.id,
                "quantity": 2,
                "reason": "Not allowed",
            },
        )

        self.assertEqual(read_response.status_code, status.HTTP_200_OK)
        self.assertEqual(write_response.status_code, status.HTTP_403_FORBIDDEN)

    def test_low_stock_report_uses_available_quantity_and_reorder_level(self):
        Stock.objects.create(
            product=self.product,
            physical_quantity=8,
            reserved_quantity=4,
        )
        self.client.force_authenticate(self.manager)

        response = self.client.get(self.low_stock_url)

        self.assertEqual(response.status_code, status.HTTP_200_OK)
        self.assertEqual(response.data["count"], 1)
        self.assertEqual(response.data["results"][0]["available_quantity"], 4)
        self.assertEqual(response.data["results"][0]["reorder_level"], 5)

    def test_stock_settings_update_reserved_and_reorder_level(self):
        Stock.objects.create(product=self.product, physical_quantity=10)
        self.client.force_authenticate(self.manager)

        response = self.client.patch(
            reverse("stock-detail", args=[self.product.id]),
            {"reserved_quantity": 3, "reorder_level": 8},
        )

        self.assertEqual(response.status_code, status.HTTP_200_OK)
        stock = Stock.objects.get(product=self.product)
        self.product.refresh_from_db()
        self.assertEqual(stock.reserved_quantity, 3)
        self.assertEqual(self.product.reorder_level, 8)
        self.assertEqual(response.data["available_quantity"], 7)

    def test_transaction_history_can_be_filtered_by_product(self):
        Stock.objects.create(product=self.product, physical_quantity=5)
        self.client.force_authenticate(self.manager)
        self.client.post(
            self.stock_in_url,
            {"product": self.product.id, "quantity": 5, "reason": "Opening stock"},
        )

        response = self.client.get(
            self.transaction_url,
            {"product": self.product.id, "type": "IN"},
        )

        self.assertEqual(response.status_code, status.HTTP_200_OK)
        self.assertEqual(response.data["count"], 1)
        self.assertEqual(response.data["results"][0]["product_code"], "LAP-001")
