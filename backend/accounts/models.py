from django.db import models
from django.contrib.auth.models import (
    AbstractBaseUser,
    PermissionsMixin,
    BaseUserManager,
)
from django.core.validators import RegexValidator


class EmployeeManager(BaseUserManager):
    def create_user(self, email, name, password=None, **extra_fields):
        if not email:
            raise ValueError("Users must have an email address")
        email = self.normalize_email(email)
        user = self.model(email=email, name=name, **extra_fields)
        user.set_password(password)
        user.save(using=self._db)
        return user

    def create_superuser(self, email, name, password=None, **extra_fields):
        extra_fields.setdefault("is_staff", True)
        extra_fields.setdefault("is_superuser", True)
        extra_fields.setdefault("role", "Admin")
        return self.create_user(email, name, password, **extra_fields)


class Employee(AbstractBaseUser, PermissionsMixin):
    ROLE_CHOICES = [
        ("Employee", "Employee"),
        ("DepartmentHead", "Department Head"),
        ("AssetManager", "Asset Manager"),
        ("Admin", "Admin"),
    ]
    STATUS_CHOICES = [
        ("Active", "Active"),
        ("Inactive", "Inactive"),
    ]

    email = models.EmailField(unique=True, max_length=255)
    name = models.CharField(max_length=255)
    phone = models.CharField(max_length=20, blank=True, null=True)
    department = models.ForeignKey(
        "organization.Department",
        on_delete=models.PROTECT,
        null=True,
        blank=True,
        related_name="employees",
    )
    role = models.CharField(max_length=20, choices=ROLE_CHOICES, default="Employee")
    status = models.CharField(max_length=20, choices=STATUS_CHOICES, default="Active")

    is_staff = models.BooleanField(default=False)
    is_active = models.BooleanField(default=True)

    objects = EmployeeManager()

    USERNAME_FIELD = "email"
    REQUIRED_FIELDS = ["name"]

    def __str__(self):
        return f"{self.name} ({self.email})"
