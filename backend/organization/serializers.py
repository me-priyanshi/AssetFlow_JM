from rest_framework import serializers
from .models import Department, AssetCategory
from accounts.models import Employee

class DepartmentSerializer(serializers.ModelSerializer):
    employee_count = serializers.ReadOnlyField()

    class Meta:
        model = Department
        fields = '__all__'

class AssetCategorySerializer(serializers.ModelSerializer):
    class Meta:
        model = AssetCategory
        fields = '__all__'

class EmployeeDirectorySerializer(serializers.ModelSerializer):
    department_name = serializers.CharField(source='department.name', read_only=True)
    
    class Meta:
        model = Employee
        fields = ['id', 'name', 'email', 'department', 'department_name', 'role', 'status']
