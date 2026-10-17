


from django.contrib.auth.password_validation import validate_password
from rest_framework import serializers
from users.models import User


class UserProfileSerializer(serializers.ModelSerializer):
    class Meta:
        model = User
        fields = ["id", "email", "first_name", "last_name", "role"]


class UserCreateSerializer(serializers.ModelSerializer):
    password = serializers.CharField(
        write_only=True,
        validators=[validate_password],
    )

    class Meta:
        model = User
        fields = [
            "id",
            "email",
            "password",
            "first_name",
            "last_name",
            "role",
        ]

    def create(self, validated_data):
        return User.objects.create_user(**validated_data)

class UserListSerializer(serializers.ModelSerializer):
    class Meta:
        model = User
        fields = [
            "id",
            "email",
            "first_name",
            "last_name",
            "role",
            "is_active",
            "date_joined",
        ]
class UserUpdateSerializer(serializers.ModelSerializer):
    class Meta:
        model = User
        fields = [
            "email",
            "first_name",
            "last_name",
            "role",
            "is_active",
        ]
