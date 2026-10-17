from decimal import Decimal
import uuid

from django.conf import settings
from django.core.validators import MinValueValidator
from django.db import models

from customers.models import Customer
from products.models import Product


class SalesOrder(models.Model):
    class Status(models.TextChoices):
        PENDING = "pending", "Pending"
        CONFIRMED = "confirmed", "Confirmed"
        DISPATCHED = "dispatched", "Dispatched"
        CANCELLED = "cancelled", "Cancelled"

    order_number = models.CharField(max_length=30, unique=True, editable=False)
    customer = models.ForeignKey(
        Customer,
        on_delete=models.PROTECT,
        related_name="sales_orders",
    )
    status = models.CharField(
        max_length=20,
        choices=Status.choices,
        default=Status.PENDING,
    )
    total_amount = models.DecimalField(
        max_digits=14,
        decimal_places=2,
        default=Decimal("0.00"),
        validators=[MinValueValidator(Decimal("0.00"))],
    )
    created_by = models.ForeignKey(
        settings.AUTH_USER_MODEL,
        on_delete=models.PROTECT,
        related_name="created_sales_orders",
    )
    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)

    class Meta:
        ordering = ["-created_at", "-id"]

    def save(self, *args, **kwargs):
        if not self.order_number:
            self.order_number = f"SO-{uuid.uuid4().hex[:12].upper()}"
        return super().save(*args, **kwargs)

    def __str__(self):
        return self.order_number


class SalesOrderItem(models.Model):
    order = models.ForeignKey(
        SalesOrder,
        on_delete=models.CASCADE,
        related_name="items",
    )
    product = models.ForeignKey(
        Product,
        on_delete=models.PROTECT,
        related_name="sales_order_items",
    )
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

    class Meta:
        constraints = [
            models.UniqueConstraint(
                fields=["order", "product"],
                name="unique_product_per_sales_order",
            )
        ]

    def save(self, *args, **kwargs):
        self.line_total = self.unit_price * self.quantity
        return super().save(*args, **kwargs)

    def __str__(self):
        return f"{self.order.order_number}: {self.product.code} x {self.quantity}"
