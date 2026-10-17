from decimal import Decimal
import uuid

from django.conf import settings
from django.core.validators import MinValueValidator
from django.db import models
from django.utils import timezone

from orders.models import SalesOrder


class Invoice(models.Model):
    invoice_number = models.CharField(max_length=30, unique=True, editable=False)
    order = models.OneToOneField(
        SalesOrder,
        on_delete=models.PROTECT,
        related_name="invoice",
    )
    total_amount = models.DecimalField(
        max_digits=14,
        decimal_places=2,
        validators=[MinValueValidator(Decimal("0.00"))],
    )
    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)

    class Meta:
        ordering = ["-created_at", "-id"]

    def save(self, *args, **kwargs):
        if not self.invoice_number:
            self.invoice_number = f"INV-{uuid.uuid4().hex[:12].upper()}"
        return super().save(*args, **kwargs)

    @property
    def paid_amount(self):
        return self.payments.aggregate(total=models.Sum("amount"))["total"] or Decimal("0.00")

    @property
    def outstanding_amount(self):
        return self.total_amount - self.paid_amount

    @property
    def payment_status(self):
        paid = self.paid_amount
        if paid == Decimal("0.00"):
            return "unpaid"
        if paid >= self.total_amount:
            return "paid"
        return "partial"

    def __str__(self):
        return self.invoice_number


class InvoiceItem(models.Model):
    invoice = models.ForeignKey(
        Invoice,
        on_delete=models.CASCADE,
        related_name="items",
    )
    product_code = models.CharField(max_length=50)
    product_name = models.CharField(max_length=200)
    quantity = models.PositiveIntegerField(validators=[MinValueValidator(1)])
    unit_price = models.DecimalField(
        max_digits=12,
        decimal_places=2,
        validators=[MinValueValidator(Decimal("0.01"))],
    )
    line_total = models.DecimalField(
        max_digits=14,
        decimal_places=2,
        validators=[MinValueValidator(Decimal("0.01"))],
    )

    def save(self, *args, **kwargs):
        self.line_total = self.unit_price * self.quantity
        return super().save(*args, **kwargs)


class Payment(models.Model):
    class PaymentMethod(models.TextChoices):
        CASH = "cash", "Cash"
        CARD = "card", "Card"
        BANK_TRANSFER = "bank_transfer", "Bank transfer"
        UPI = "upi", "UPI"
        OTHER = "other", "Other"

    invoice = models.ForeignKey(
        Invoice,
        on_delete=models.PROTECT,
        related_name="payments",
    )
    amount = models.DecimalField(
        max_digits=14,
        decimal_places=2,
        validators=[MinValueValidator(Decimal("0.01"))],
    )
    payment_method = models.CharField(max_length=20, choices=PaymentMethod.choices)
    reference = models.CharField(max_length=100, blank=True)
    payment_date = models.DateField(default=timezone.localdate)
    created_by = models.ForeignKey(
        settings.AUTH_USER_MODEL,
        on_delete=models.PROTECT,
        related_name="invoice_payments",
    )
    created_at = models.DateTimeField(auto_now_add=True)

    class Meta:
        ordering = ["-payment_date", "-id"]

    def __str__(self):
        return f"{self.invoice.invoice_number}: {self.amount}"
