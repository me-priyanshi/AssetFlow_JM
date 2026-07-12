from django.db import models
from django.db.models import Q
from django.core.exceptions import ValidationError


def generate_asset_tag():
    """Generate next sequential asset tag in format AF-0001."""
    last = Asset.objects.order_by('-id').first()
    if not last or not last.asset_tag:
        return 'AF-0001'
    try:
        last_num = int(last.asset_tag.split('-')[1])
        return f'AF-{str(last_num + 1).zfill(4)}'
    except (IndexError, ValueError):
        return 'AF-0001'


class Asset(models.Model):
    CONDITION_CHOICES = [
        ('New', 'New'),
        ('Good', 'Good'),
        ('Fair', 'Fair'),
        ('Poor', 'Poor'),
        ('Damaged', 'Damaged'),
    ]
    STATUS_CHOICES = [
        ('Available', 'Available'),
        ('Allocated', 'Allocated'),
        ('Reserved', 'Reserved'),
        ('Under Maintenance', 'Under Maintenance'),
        ('Lost', 'Lost'),
        ('Retired', 'Retired'),
        ('Disposed', 'Disposed'),
    ]

    name = models.CharField(max_length=255)
    category = models.ForeignKey(
        'organization.AssetCategory',
        on_delete=models.PROTECT,
        related_name='assets'
    )
    asset_tag = models.CharField(max_length=20, unique=True, blank=True)
    serial_number = models.CharField(max_length=255, unique=True, null=True, blank=True)
    acquisition_date = models.DateField(null=True, blank=True)
    acquisition_cost = models.DecimalField(max_digits=12, decimal_places=2, null=True, blank=True)
    condition = models.CharField(max_length=20, choices=CONDITION_CHOICES, default='New')
    location = models.CharField(max_length=255, blank=True)
    photo = models.ImageField(upload_to='assets/photos/', null=True, blank=True)
    is_bookable = models.BooleanField(default=False)
    status = models.CharField(max_length=20, choices=STATUS_CHOICES, default='Available')
    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)

    def save(self, *args, **kwargs):
        if not self.asset_tag:
            self.asset_tag = generate_asset_tag()
        super().save(*args, **kwargs)

    def __str__(self):
        return f'{self.asset_tag} — {self.name}'


class AssetDocument(models.Model):
    """Separate model to support multiple PDF document uploads per asset."""
    asset = models.ForeignKey(Asset, on_delete=models.CASCADE, related_name='documents')
    file = models.FileField(upload_to='assets/documents/')
    uploaded_at = models.DateTimeField(auto_now_add=True)

    def clean(self):
        if self.file:
            if not self.file.name.lower().endswith('.pdf'):
                raise ValidationError({'file': 'Only PDF files are allowed.'})

    def __str__(self):
        return f'Document for {self.asset.asset_tag}'


class Allocation(models.Model):
    STATUS_CHOICES = [
        ('Active', 'Active'),
        ('Returned', 'Returned'),
    ]

    asset = models.ForeignKey(Asset, on_delete=models.PROTECT, related_name='allocations')
    employee = models.ForeignKey(
        'accounts.Employee',
        on_delete=models.PROTECT,
        null=True, blank=True,
        related_name='allocations'
    )
    department = models.ForeignKey(
        'organization.Department',
        on_delete=models.PROTECT,
        null=True, blank=True,
        related_name='allocations'
    )
    allocated_date = models.DateField()
    expected_return_date = models.DateField(null=True, blank=True)
    actual_return_date = models.DateField(null=True, blank=True)
    status = models.CharField(max_length=20, choices=STATUS_CHOICES, default='Active')
    checkin_condition_notes = models.TextField(null=True, blank=True)

    class Meta:
        constraints = [
            models.UniqueConstraint(
                fields=['asset'],
                condition=Q(status='Active'),
                name='unique_active_allocation_per_asset'
            )
        ]

    def clean(self):
        # Exactly one of employee or department must be set
        has_employee = bool(self.employee_id)
        has_department = bool(self.department_id)
        if has_employee == has_department:  # both set or neither set
            raise ValidationError(
                'Exactly one of employee or department must be specified for an allocation.'
            )

    def __str__(self):
        holder = self.employee or self.department
        return f'Allocation #{self.pk}: {self.asset.asset_tag} → {holder}'


class TransferRequest(models.Model):
    STATUS_CHOICES = [
        ('Requested', 'Requested'),
        ('Approved', 'Approved'),
        ('Rejected', 'Rejected'),
        ('Re-allocated', 'Re-allocated'),
    ]

    allocation = models.ForeignKey(Allocation, on_delete=models.PROTECT, related_name='transfer_requests')
    requested_by = models.ForeignKey(
        'accounts.Employee',
        on_delete=models.PROTECT,
        related_name='transfer_requests_made'
    )
    requested_for_employee = models.ForeignKey(
        'accounts.Employee',
        on_delete=models.PROTECT,
        null=True, blank=True,
        related_name='transfer_requests_received'
    )
    requested_for_department = models.ForeignKey(
        'organization.Department',
        on_delete=models.PROTECT,
        null=True, blank=True,
        related_name='transfer_requests_received'
    )
    approved_by = models.ForeignKey(
        'accounts.Employee',
        on_delete=models.PROTECT,
        null=True, blank=True,
        related_name='transfer_requests_approved'
    )
    status = models.CharField(max_length=20, choices=STATUS_CHOICES, default='Requested')
    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)

    def clean(self):
        has_employee = bool(self.requested_for_employee_id)
        has_department = bool(self.requested_for_department_id)
        if has_employee == has_department:
            raise ValidationError(
                'Exactly one of requested_for_employee or requested_for_department must be specified.'
            )

    def __str__(self):
        return f'TransferRequest #{self.pk} [{self.status}] for {self.allocation.asset.asset_tag}'
