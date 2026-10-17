from django.contrib.auth.models import AbstractUser, BaseUserManager
from django.db import models


class CustomUserManager(BaseUserManager):

    def create_user(self, email, password=None, **extra_fields):
        if not email:
            raise ValueError("Email is required")

        email = self.normalize_email(email)

        user = self.model(email=email, **extra_fields)
        user.set_password(password)
        user.save(using=self._db)

        return user

    def create_superuser(self, email, password=None, **extra_fields):
        extra_fields.setdefault("is_staff", True)
        extra_fields.setdefault("is_superuser", True)

        if extra_fields.get("is_staff") is not True:
            raise ValueError("Superuser must have is_staff=True")

        if extra_fields.get("is_superuser") is not True:
            raise ValueError("Superuser must have is_superuser=True")

        extra_fields.setdefault("role", "admin")

        return self.create_user(email, password, **extra_fields)

class User(AbstractUser):

    class Role(models.TextChoices):
        ADMIN = "admin", "Admin"
        INVENTORY_MANAGER = "inventory_manager", "Inventory Manager"
        SALES_EXECUTIVE = "sales_executive", "Sales Executive"
        ACCOUNTANT = "accountant", "Accountant"

    username = None

    email = models.EmailField(unique=True)


    USERNAME_FIELD = 'email'
    REQUIRED_FIELDS = []


    role = models.CharField(max_length=30, choices=Role.choices, default=Role.SALES_EXECUTIVE)

    objects = CustomUserManager()
