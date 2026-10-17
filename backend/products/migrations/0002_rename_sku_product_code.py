from django.db import migrations


class Migration(migrations.Migration):

    dependencies = [
        ("products", "0001_initial"),
    ]

    operations = [
        migrations.RenameField(
            model_name="product",
            old_name="sku",
            new_name="code",
        ),
    ]
