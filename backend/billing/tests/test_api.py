from decimal import Decimal

from django.urls import reverse
from rest_framework import status
from rest_framework.test import APITestCase

from billing.models import Invoice, InvoiceItem, Payment
from customers.models import Customer
from orders.models import SalesOrder, SalesOrderItem
from products.models import Category, Product
from users.models import User


class BillingApiTests(APITestCase):
    def setUp(self):
        self.admin = User.objects.create_user(
            email="admin@example.com",
            password="StrongPassword123!",
            role=User.Role.ADMIN,
        )
        self.accountant = User.objects.create_user(
            email="accountant@example.com",
            password="StrongPassword123!",
            role=User.Role.ACCOUNTANT,
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
            unit_price=Decimal("100.00"),
        )
        self.customer = Customer.objects.create(name="Acme Retail")
        self.order = SalesOrder.objects.create(
            customer=self.customer,
            status=SalesOrder.Status.DISPATCHED,
            total_amount=Decimal("200.00"),
            created_by=self.sales_user,
        )
        SalesOrderItem.objects.create(
            order=self.order,
            product=self.product,
            quantity=2,
            unit_price=Decimal("100.00"),
            line_total=Decimal("200.00"),
        )
        self.url = reverse("invoice-list")

    def create_invoice(self):
        self.client.force_authenticate(self.accountant)
        response = self.client.post(self.url, {"order": self.order.id}, format="json")
        self.assertEqual(response.status_code, status.HTTP_201_CREATED)
        return response

    def test_only_dispatched_orders_can_create_invoice_and_snapshots_are_immutable(self):
        response = self.create_invoice()

        self.assertTrue(response.data["invoice_number"].startswith("INV-"))
        self.assertEqual(response.data["order_number"], self.order.order_number)
        self.assertEqual(response.data["total_amount"], "200.00")
        item = InvoiceItem.objects.get(invoice_id=response.data["id"])
        self.assertEqual(item.product_code, "LAP-001")
        self.assertEqual(item.unit_price, Decimal("100.00"))

        self.product.name = "Renamed laptop"
        self.product.unit_price = Decimal("150.00")
        self.product.save(update_fields=["name", "unit_price"])
        item.refresh_from_db()
        self.assertEqual(item.product_name, "Laptop")
        self.assertEqual(item.unit_price, Decimal("100.00"))

    def test_duplicate_invoice_for_order_is_rejected(self):
        self.create_invoice()

        response = self.client.post(self.url, {"order": self.order.id}, format="json")

        self.assertEqual(response.status_code, status.HTTP_400_BAD_REQUEST)
        self.assertIn("order", response.data)
        self.assertEqual(Invoice.objects.count(), 1)

    def test_pending_order_cannot_be_invoiced(self):
        self.order.status = SalesOrder.Status.PENDING
        self.order.save(update_fields=["status"])
        self.client.force_authenticate(self.accountant)

        response = self.client.post(self.url, {"order": self.order.id}, format="json")

        self.assertEqual(response.status_code, status.HTTP_400_BAD_REQUEST)
        self.assertFalse(Invoice.objects.exists())

    def test_partial_and_full_payments_calculate_balance_and_status(self):
        invoice_response = self.create_invoice()
        payment_url = reverse("invoice-payments", args=[invoice_response.data["id"]])

        first = self.client.post(payment_url, {
            "amount": "75.00",
            "payment_method": "bank_transfer",
            "reference": "TXN-1",
        }, format="json")
        self.assertEqual(first.status_code, status.HTTP_201_CREATED)
        self.assertEqual(first.data["amount"], "75.00")

        detail = self.client.get(reverse("invoice-detail", args=[invoice_response.data["id"]]))
        self.assertEqual(detail.data["payment_status"], "partial")
        self.assertEqual(detail.data["paid_amount"], "75.00")
        self.assertEqual(detail.data["outstanding_amount"], "125.00")

        second = self.client.post(payment_url, {
            "amount": "125.00",
            "payment_method": "cash",
        }, format="json")
        self.assertEqual(second.status_code, status.HTTP_201_CREATED)
        detail = self.client.get(reverse("invoice-detail", args=[invoice_response.data["id"]]))
        self.assertEqual(detail.data["payment_status"], "paid")
        self.assertEqual(detail.data["outstanding_amount"], "0.00")

    def test_overpayment_is_rejected_without_creating_payment(self):
        invoice_response = self.create_invoice()
        payment_url = reverse("invoice-payments", args=[invoice_response.data["id"]])

        response = self.client.post(payment_url, {
            "amount": "200.01",
            "payment_method": "card",
        }, format="json")

        self.assertEqual(response.status_code, status.HTTP_400_BAD_REQUEST)
        self.assertIn("amount", response.data)
        self.assertEqual(Payment.objects.count(), 0)

    def test_other_roles_are_read_only(self):
        self.client.force_authenticate(self.sales_user)
        list_response = self.client.get(self.url)
        create_response = self.client.post(self.url, {"order": self.order.id})

        self.assertEqual(list_response.status_code, status.HTTP_200_OK)
        self.assertEqual(create_response.status_code, status.HTTP_403_FORBIDDEN)

    def test_payment_history_is_paginated(self):
        invoice_response = self.create_invoice()
        payment_url = reverse("invoice-payments", args=[invoice_response.data["id"]])
        self.client.post(payment_url, {"amount": "50.00", "payment_method": "cash"})

        response = self.client.get(payment_url, {"page_size": 1})

        self.assertEqual(response.status_code, status.HTTP_200_OK)
        self.assertEqual(response.data["count"], 1)
        self.assertEqual(
            response.data["results"][0]["invoice_number"],
            invoice_response.data["invoice_number"],
        )
