import os
from datetime import date
from rest_framework import serializers
from .models import Asset, AssetDocument, Allocation, TransferRequest
from accounts.models import Employee
from organization.models import Department


class AssetDocumentSerializer(serializers.ModelSerializer):
    class Meta:
        model = AssetDocument
        fields = ['id', 'file', 'uploaded_at']
        read_only_fields = ['uploaded_at']

    def validate_file(self, value):
        ext = os.path.splitext(value.name)[1].lower()
        if ext != '.pdf':
            raise serializers.ValidationError('Only PDF files are allowed.')
        return value


class AssetSerializer(serializers.ModelSerializer):
    asset_tag = serializers.CharField(read_only=True)
    documents = AssetDocumentSerializer(many=True, read_only=True)
    category_name = serializers.CharField(source='category.name', read_only=True)
    department_name = serializers.CharField(source='department.name', read_only=True)
    created_by_name = serializers.CharField(source='created_by.name', read_only=True)

    class Meta:
        model = Asset
        fields = [
            'id', 'name', 'category', 'category_name', 'asset_tag',
            'serial_number', 'acquisition_date', 'acquisition_cost',
            'condition', 'location', 'department', 'department_name', 'photo', 'is_bookable', 'status',
            'created_at', 'updated_at', 'documents', 'created_by', 'created_by_name'
        ]
        read_only_fields = ['asset_tag', 'created_at', 'updated_at', 'created_by']


class AllocationSummarySerializer(serializers.ModelSerializer):
    """Compact serializer used inside AssetDetailSerializer."""
    employee_name = serializers.CharField(source='employee.name', read_only=True)
    department_name = serializers.CharField(source='department.name', read_only=True)
    is_overdue = serializers.SerializerMethodField()

    class Meta:
        model = Allocation
        fields = [
            'id', 'employee', 'employee_name', 'department', 'department_name',
            'allocated_date', 'expected_return_date', 'actual_return_date',
            'status', 'is_overdue', 'checkin_condition_notes',
        ]

    def get_is_overdue(self, obj):
        if obj.status == 'Active' and obj.expected_return_date:
            return obj.expected_return_date < date.today()
        return False


class AssetDetailSerializer(AssetSerializer):
    """Extended serializer for the detail view — includes allocation + maintenance history."""
    allocation_history = AllocationSummarySerializer(source='allocations', many=True, read_only=True)
    maintenance_history = serializers.SerializerMethodField()

    class Meta(AssetSerializer.Meta):
        fields = AssetSerializer.Meta.fields + ['allocation_history', 'maintenance_history']

    def get_maintenance_history(self, obj):
        # MaintenanceRequest not built yet — return empty list for forward compatibility
        return []


class AllocationSerializer(serializers.ModelSerializer):
    is_overdue = serializers.SerializerMethodField()
    employee_name = serializers.CharField(source='employee.name', read_only=True)
    department_name = serializers.CharField(source='department.name', read_only=True)
    asset_tag = serializers.CharField(source='asset.asset_tag', read_only=True)
    asset_name = serializers.CharField(source='asset.name', read_only=True)

    class Meta:
        model = Allocation
        fields = [
            'id', 'asset', 'asset_tag', 'asset_name',
            'employee', 'employee_name', 'department', 'department_name',
            'allocated_date', 'expected_return_date', 'actual_return_date',
            'status', 'is_overdue', 'checkin_condition_notes',
        ]
        read_only_fields = ['status', 'actual_return_date', 'is_overdue']

    def get_is_overdue(self, obj):
        if obj.status == 'Active' and obj.expected_return_date:
            return obj.expected_return_date < date.today()
        return False

    def validate(self, data):
        has_employee = bool(data.get('employee'))
        has_department = bool(data.get('department'))
        if has_employee == has_department:
            raise serializers.ValidationError(
                'Exactly one of employee or department must be specified.'
            )
        return data


class TransferRequestSerializer(serializers.ModelSerializer):
    requested_by_name = serializers.CharField(source='requested_by.name', read_only=True)
    requested_for_employee_name = serializers.CharField(
        source='requested_for_employee.name', read_only=True
    )
    requested_for_department_name = serializers.CharField(
        source='requested_for_department.name', read_only=True
    )
    approved_by_name = serializers.CharField(source='approved_by.name', read_only=True)
    asset_tag = serializers.CharField(source='allocation.asset.asset_tag', read_only=True)
    asset_name = serializers.CharField(source='allocation.asset.name', read_only=True)

    class Meta:
        model = TransferRequest
        fields = [
            'id', 'allocation', 'asset_tag', 'asset_name',
            'requested_by', 'requested_by_name',
            'requested_for_employee', 'requested_for_employee_name',
            'requested_for_department', 'requested_for_department_name',
            'approved_by', 'approved_by_name',
            'status', 'created_at', 'updated_at',
        ]
        read_only_fields = ['status', 'approved_by', 'created_at', 'updated_at']

    def validate(self, data):
        has_employee = bool(data.get('requested_for_employee'))
        has_department = bool(data.get('requested_for_department'))
        if has_employee == has_department:
            raise serializers.ValidationError(
                'Exactly one of requested_for_employee or requested_for_department must be specified.'
            )
        # Ensure the referenced allocation is Active
        allocation = data.get('allocation')
        if allocation and allocation.status != 'Active':
            raise serializers.ValidationError(
                'Can only request a transfer for an Active allocation.'
            )
        return data
