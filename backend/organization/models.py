from django.db import models


class Department(models.Model):
    STATUS_CHOICES = [
        ("Active", "Active"),
        ("Inactive", "Inactive"),
    ]

    name = models.CharField(max_length=255)
    code = models.CharField(max_length=100, unique=True)
    head = models.ForeignKey(
        "accounts.Employee",
        on_delete=models.SET_NULL,
        null=True,
        blank=True,
        related_name="headed_departments",
    )
    parent_department = models.ForeignKey(
        "self",
        on_delete=models.PROTECT,
        null=True,
        blank=True,
        related_name="sub_departments",
    )
    status = models.CharField(max_length=20, choices=STATUS_CHOICES, default="Active")

    @property
    def employee_count(self):
        return self.employees.count()

    def __str__(self):
        return f"{self.name} ({self.code})"


class AssetCategory(models.Model):
    STATUS_CHOICES = [
        ("Active", "Active"),
        ("Inactive", "Inactive"),
    ]

    name = models.CharField(max_length=255)
    type = models.CharField(max_length=100)  # e.g. Electronics, Furniture
    status = models.CharField(max_length=20, choices=STATUS_CHOICES, default="Active")
    extra_fields = models.JSONField(null=True, blank=True)

    def __str__(self):
        return self.name
