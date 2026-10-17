from django.conf import settings
from django.core.validators import MinValueValidator
from django.db import models

from products.models import Product


class Stock(models.Model):
    product = models.OneToOneField(
        Product,
        on_delete=models.PROTECT,
        related_name="stock",
    )
    physical_quantity = models.PositiveIntegerField(default=0)
    reserved_quantity = models.PositiveIntegerField(default=0)
    updated_at = models.DateTimeField(auto_now=True)

    class Meta:
        constraints = [
            models.CheckConstraint(
                condition=models.Q(physical_quantity__gte=models.F("reserved_quantity")),
                name="stock_reserved_not_above_physical",
            )
        ]

    @property
    def available_quantity(self):
        return self.physical_quantity - self.reserved_quantity

    def __str__(self):
        return f"Stock for {self.product.code}"


class StockTransaction(models.Model):
    class TransactionType(models.TextChoices):
        IN = "IN", "Stock In"
        OUT = "OUT", "Stock Out"

    stock = models.ForeignKey(
        Stock,
        on_delete=models.PROTECT,
        related_name="transactions",
    )
    transaction_type = models.CharField(max_length=3, choices=TransactionType.choices)
    quantity = models.PositiveIntegerField(validators=[MinValueValidator(1)])
    reason = models.CharField(max_length=255)
    reference = models.CharField(max_length=100, blank=True)
    created_by = models.ForeignKey(
        settings.AUTH_USER_MODEL,
        on_delete=models.PROTECT,
        related_name="stock_transactions",
    )
    created_at = models.DateTimeField(auto_now_add=True)

    class Meta:
        ordering = ["-created_at", "-id"]

    def __str__(self):
        return f"{self.transaction_type} {self.quantity} for {self.stock.product.code}"
