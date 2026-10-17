from django.db import migrations, models


class Migration(migrations.Migration):

    dependencies = [
        ("products", "0004_alter_product_unit_price_validator"),
    ]

    operations = [
        migrations.AddField(
            model_name="product",
            name="reorder_level",
            field=models.PositiveIntegerField(default=0),
        ),
    ]
