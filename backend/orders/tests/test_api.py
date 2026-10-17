from decimal import Decimal

from django.urls import reverse
from rest_framework import status
from rest_framework.test import APITestCase

from customers.models import Customer
from inventory.models import Stock, StockTransaction
from orders.models import SalesOrder
from products.models import Category, Product
from users.models import User


class SalesOrderApiTests(APITestCase):
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
        category = Category.objects.create(name="Hardware")
        self.product = Product.objects.create(
            code="LAP-001",
            name="Laptop",
            category=category,
            unit_price=Decimal("999.99"),
        )
        self.second_product = Product.objects.create(
            code="MOUSE-001",
            name="Mouse",
            category=category,
            unit_price=Decimal("25.00"),
        )
        self.customer = Customer.objects.create(
            name="Acme Retail",
            email="customer@example.com",
        )
        self.url = reverse("order-list")

    def order_payload(self, quantity=2):
        return {
            "customer": self.customer.id,
            "items": [{"product": self.product.id, "quantity": quantity}],
        }

    def create_order(self, quantity=2):
        self.client.force_authenticate(self.sales_user)
        response = self.client.post(self.url, self.order_payload(quantity), format="json")
        self.assertEqual(response.status_code, status.HTTP_201_CREATED)
        return response

    def test_sales_executive_can_create_pending_order_with_price_snapshot(self):
        response = self.create_order(2)

        self.assertTrue(response.data["order_number"].startswith("SO-"))
        self.assertEqual(response.data["status"], SalesOrder.Status.PENDING)
        self.assertEqual(response.data["total_amount"], "1999.98")
        self.assertEqual(response.data["items"][0]["unit_price"], "999.99")
        self.assertFalse(Stock.objects.filter(product=self.product).exists())

    def test_confirm_reserves_available_stock(self):
        Stock.objects.create(product=self.product, physical_quantity=5)
        order_response = self.create_order(3)
        confirm_response = self.client.post(
            reverse("order-confirm", args=[order_response.data["id"]])
        )

        self.assertEqual(confirm_response.status_code, status.HTTP_200_OK)
        stock = Stock.objects.get(product=self.product)
        self.assertEqual(stock.physical_quantity, 5)
        self.assertEqual(stock.reserved_quantity, 3)
        self.assertEqual(stock.available_quantity, 2)
        self.assertEqual(confirm_response.data["status"], SalesOrder.Status.CONFIRMED)

    def test_confirm_rejects_insufficient_stock_without_partial_reservation(self):
        Stock.objects.create(product=self.product, physical_quantity=2)
        order_response = self.create_order(3)
        confirm_response = self.client.post(
            reverse("order-confirm", args=[order_response.data["id"]])
        )

        self.assertEqual(confirm_response.status_code, status.HTTP_400_BAD_REQUEST)
        stock = Stock.objects.get(product=self.product)
        self.assertEqual(stock.reserved_quantity, 0)
        self.assertEqual(
            SalesOrder.objects.get(pk=order_response.data["id"]).status,
            SalesOrder.Status.PENDING,
        )

    def test_dispatch_deducts_physical_stock_releases_reservation_and_records_out(self):
        Stock.objects.create(product=self.product, physical_quantity=5)
        order_response = self.create_order(3)
        order_id = order_response.data["id"]
        self.client.post(reverse("order-confirm", args=[order_id]))
        dispatch_response = self.client.post(reverse("order-dispatch", args=[order_id]))

        self.assertEqual(dispatch_response.status_code, status.HTTP_200_OK)
        stock = Stock.objects.get(product=self.product)
        self.assertEqual(stock.physical_quantity, 2)
        self.assertEqual(stock.reserved_quantity, 0)
        self.assertEqual(StockTransaction.objects.count(), 1)
        self.assertEqual(StockTransaction.objects.first().reference, response_order_number(order_id))
        self.assertEqual(dispatch_response.data["status"], SalesOrder.Status.DISPATCHED)

    def test_cancelling_confirmed_order_releases_reservation(self):
        Stock.objects.create(product=self.product, physical_quantity=5)
        order_response = self.create_order(3)
        order_id = order_response.data["id"]
        self.client.post(reverse("order-confirm", args=[order_id]))
        cancel_response = self.client.post(reverse("order-cancel", args=[order_id]))

        self.assertEqual(cancel_response.status_code, status.HTTP_200_OK)
        self.assertEqual(Stock.objects.get(product=self.product).reserved_quantity, 0)
        self.assertEqual(cancel_response.data["status"], SalesOrder.Status.CANCELLED)

    def test_invalid_transitions_and_finalized_changes_are_rejected(self):
        order_response = self.create_order()
        order_id = order_response.data["id"]

        dispatch_response = self.client.post(reverse("order-dispatch", args=[order_id]))
        self.assertEqual(dispatch_response.status_code, status.HTTP_400_BAD_REQUEST)

        self.client.patch(
            reverse("order-detail", args=[order_id]),
            {"customer": self.customer.id},
            format="json",
        )
        Stock.objects.create(product=self.product, physical_quantity=5)
        self.client.post(reverse("order-confirm", args=[order_id]))
        update_response = self.client.patch(
            reverse("order-detail", args=[order_id]),
            {"customer": self.customer.id},
            format="json",
        )
        self.assertEqual(update_response.status_code, status.HTTP_400_BAD_REQUEST)

    def test_other_roles_are_read_only(self):
        self.client.force_authenticate(self.manager)
        response = self.client.post(self.url, self.order_payload())
        self.assertEqual(response.status_code, status.HTTP_403_FORBIDDEN)

    def test_orders_support_search_status_filter_and_pagination(self):
        self.create_order()
        self.client.force_authenticate(self.admin)
        response = self.client.get(self.url, {
            "search": "acme",
            "status": "pending",
            "ordering": "-created_at",
            "page_size": 1,
        })

        self.assertEqual(response.status_code, status.HTTP_200_OK)
        self.assertEqual(response.data["count"], 1)
        self.assertEqual(response.data["results"][0]["customer_name"], "Acme Retail")


def response_order_number(order_id):
    return SalesOrder.objects.get(pk=order_id).order_number
