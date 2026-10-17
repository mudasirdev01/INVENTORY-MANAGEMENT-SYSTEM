from decimal import Decimal

from django.urls import reverse
from rest_framework import status
from rest_framework.test import APITestCase

from billing.models import Invoice, Payment
from customers.models import Customer
from inventory.models import Stock
from orders.models import SalesOrder, SalesOrderItem
from products.models import Category, Product
from users.models import User


class AnalyticsApiTests(APITestCase):
    def setUp(self):
        self.user = User.objects.create_user(
            email="viewer@example.com",
            password="StrongPassword123!",
            role=User.Role.ACCOUNTANT,
        )
        category = Category.objects.create(name="Hardware")
        self.product = Product.objects.create(
            code="LAP-001",
            name="Laptop",
            category=category,
            unit_price=Decimal("100.00"),
            reorder_level=3,
        )
        self.low_product = Product.objects.create(
            code="MOUSE-001",
            name="Mouse",
            category=category,
            unit_price=Decimal("20.00"),
            reorder_level=5,
        )
        Stock.objects.create(product=self.product, physical_quantity=10, reserved_quantity=2)
        Stock.objects.create(product=self.low_product, physical_quantity=3, reserved_quantity=0)
        self.customer = Customer.objects.create(name="Acme Retail")
        self.dispatched_order = SalesOrder.objects.create(
            customer=self.customer,
            status=SalesOrder.Status.DISPATCHED,
            total_amount=Decimal("200.00"),
            created_by=self.user,
        )
        SalesOrderItem.objects.create(
            order=self.dispatched_order,
            product=self.product,
            quantity=2,
            unit_price=Decimal("100.00"),
            line_total=Decimal("200.00"),
        )
        invoice = Invoice.objects.create(
            order=self.dispatched_order,
            total_amount=Decimal("200.00"),
        )
        Payment.objects.create(
            invoice=invoice,
            amount=Decimal("75.00"),
            payment_method=Payment.PaymentMethod.CASH,
            created_by=self.user,
        )

    def authenticate(self):
        self.client.force_authenticate(self.user)

    def test_unauthenticated_user_cannot_read_reports(self):
        response = self.client.get(reverse("analytics-dashboard"))
        self.assertEqual(response.status_code, status.HTTP_401_UNAUTHORIZED)

    def test_dashboard_summary_distinguishes_sales_payments_and_outstanding(self):
        self.authenticate()
        response = self.client.get(reverse("analytics-dashboard"))

        self.assertEqual(response.status_code, status.HTTP_200_OK)
        self.assertEqual(response.data["products_count"], 2)
        self.assertEqual(response.data["customers_count"], 1)
        self.assertEqual(response.data["orders_count"], 1)
        self.assertEqual(response.data["low_stock_count"], 1)
        self.assertEqual(response.data["dispatched_sales_total"], "200.00")
        self.assertEqual(response.data["payments_received_total"], "75.00")
        self.assertEqual(response.data["outstanding_balance"], "125.00")

    def test_monthly_and_top_product_reports_use_dispatched_orders(self):
        self.authenticate()
        monthly = self.client.get(reverse("analytics-monthly-sales"))
        top = self.client.get(reverse("analytics-top-products"), {"limit": 1})

        self.assertEqual(monthly.status_code, status.HTTP_200_OK)
        self.assertEqual(monthly.data[0]["sales_total"], "200.00")
        self.assertEqual(monthly.data[0]["order_count"], 1)
        self.assertEqual(top.status_code, status.HTTP_200_OK)
        self.assertEqual(top.data[0]["code"], "LAP-001")
        self.assertEqual(top.data[0]["quantity_sold"], 2)

    def test_date_and_limit_filters_are_validated(self):
        self.authenticate()
        invalid_date = self.client.get(reverse("analytics-sales"), {"start_date": "bad-date"})
        reversed_dates = self.client.get(reverse("analytics-monthly-sales"), {
            "start_date": "2026-02-01",
            "end_date": "2026-01-01",
        })
        invalid_limit = self.client.get(reverse("analytics-top-products"), {"limit": "bad"})

        self.assertEqual(invalid_date.status_code, status.HTTP_400_BAD_REQUEST)
        self.assertEqual(reversed_dates.status_code, status.HTTP_400_BAD_REQUEST)
        self.assertEqual(invalid_limit.status_code, status.HTTP_400_BAD_REQUEST)

    def test_recent_orders_and_low_stock_reports(self):
        self.authenticate()
        recent = self.client.get(reverse("analytics-recent-orders"), {"limit": 5})
        low_stock = self.client.get(reverse("analytics-low-stock"))

        self.assertEqual(recent.status_code, status.HTTP_200_OK)
        self.assertEqual(recent.data[0]["order_number"], self.dispatched_order.order_number)
        self.assertEqual(low_stock.status_code, status.HTTP_200_OK)
        self.assertEqual(low_stock.data[0]["code"], "MOUSE-001")
        self.assertEqual(low_stock.data[0]["available_quantity"], 3)
