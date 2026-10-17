from django.db import IntegrityError, transaction
from rest_framework import serializers

from customers.models import Customer


class CustomerSerializer(serializers.ModelSerializer):
    class Meta:
        model = Customer
        fields = [
            "id",
            "name",
            "email",
            "phone",
            "address",
            "city",
            "state",
            "postal_code",
            "country",
            "is_active",
            "created_at",
            "updated_at",
        ]
        read_only_fields = ["id", "created_at", "updated_at"]

    def validate_name(self, value):
        value = value.strip()
        if not value:
            raise serializers.ValidationError("Customer name cannot be empty.")
        return value

    def validate_email(self, value):
        value = value.strip().lower()
        if not value:
            return None

        queryset = Customer.objects.filter(email__iexact=value)
        if self.instance:
            queryset = queryset.exclude(pk=self.instance.pk)
        if queryset.exists():
            raise serializers.ValidationError(
                "A customer with this email already exists."
            )
        return value

    def _save_with_duplicate_email_handling(self, save):
        try:
            with transaction.atomic():
                return save()
        except IntegrityError as error:
            if "email" in str(error).lower() or "unique_customer_email_ci" in str(error).lower():
                raise serializers.ValidationError({
                    "email": "A customer with this email already exists."
                }) from error
            raise

    def create(self, validated_data):
        return self._save_with_duplicate_email_handling(
            lambda: super(CustomerSerializer, self).create(validated_data)
        )

    def update(self, instance, validated_data):
        return self._save_with_duplicate_email_handling(
            lambda: super(CustomerSerializer, self).update(instance, validated_data)
        )
