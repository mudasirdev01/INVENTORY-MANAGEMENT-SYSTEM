from decimal import Decimal

from django.db import migrations, models
import django.core.validators


class Migration(migrations.Migration):

    dependencies = [
        ("products", "0003_alter_product_code"),
    ]

    operations = [
        migrations.AlterField(
            model_name="product",
            name="unit_price",
            field=models.DecimalField(
                decimal_places=2,
                max_digits=12,
                validators=[
                    django.core.validators.MinValueValidator(Decimal("0.01"))
                ],
            ),
        ),
    ]
