from django.conf import settings
from django.db import migrations, models
import django.core.validators
import django.db.models.deletion


class Migration(migrations.Migration):

    initial = True

    dependencies = [
        migrations.swappable_dependency(settings.AUTH_USER_MODEL),
        ("products", "0005_product_reorder_level"),
    ]

    operations = [
        migrations.CreateModel(
            name="Stock",
            fields=[
                (
                    "id",
                    models.BigAutoField(
                        auto_created=True,
                        primary_key=True,
                        serialize=False,
                        verbose_name="ID",
                    ),
                ),
                ("physical_quantity", models.PositiveIntegerField(default=0)),
                ("reserved_quantity", models.PositiveIntegerField(default=0)),
                ("updated_at", models.DateTimeField(auto_now=True)),
                (
                    "product",
                    models.OneToOneField(
                        on_delete=django.db.models.deletion.PROTECT,
                        related_name="stock",
                        to="products.product",
                    ),
                ),
            ],
        ),
        migrations.CreateModel(
            name="StockTransaction",
            fields=[
                (
                    "id",
                    models.BigAutoField(
                        auto_created=True,
                        primary_key=True,
                        serialize=False,
                        verbose_name="ID",
                    ),
                ),
                (
                    "transaction_type",
                    models.CharField(
                        choices=[("IN", "Stock In"), ("OUT", "Stock Out")],
                        max_length=3,
                    ),
                ),
                (
                    "quantity",
                    models.PositiveIntegerField(
                        validators=[django.core.validators.MinValueValidator(1)]
                    ),
                ),
                ("reason", models.CharField(max_length=255)),
                ("reference", models.CharField(blank=True, max_length=100)),
                ("created_at", models.DateTimeField(auto_now_add=True)),
                (
                    "created_by",
                    models.ForeignKey(
                        on_delete=django.db.models.deletion.PROTECT,
                        related_name="stock_transactions",
                        to=settings.AUTH_USER_MODEL,
                    ),
                ),
                (
                    "stock",
                    models.ForeignKey(
                        on_delete=django.db.models.deletion.PROTECT,
                        related_name="transactions",
                        to="inventory.stock",
                    ),
                ),
            ],
            options={"ordering": ["-created_at", "-id"]},
        ),
        migrations.AddConstraint(
            model_name="stock",
            constraint=models.CheckConstraint(
                condition=models.Q(
                    physical_quantity__gte=models.F("reserved_quantity")
                ),
                name="stock_reserved_not_above_physical",
            ),
        ),
    ]
