from rest_framework import viewsets, generics, status
from rest_framework.response import Response
from rest_framework.views import APIView
from rest_framework.exceptions import ValidationError
from django.db.models import Count
from .models import Department, AssetCategory
from .serializers import DepartmentSerializer, AssetCategorySerializer, EmployeeDirectorySerializer
from accounts.models import Employee
from accounts.permissions import IsRole
import logging

logger = logging.getLogger(__name__)

class DepartmentViewSet(viewsets.ModelViewSet):
    queryset = Department.objects.all()
    serializer_class = DepartmentSerializer
    permission_classes = [IsRole('Admin')()]

    def perform_destroy(self, instance):
        if instance.employees.filter(status='Active').exists():
            raise ValidationError("Cannot delete department with active employees.")
        # Actually we are soft deleting, so we might override destroy instead
        instance.status = 'Inactive'
        instance.save()

    def destroy(self, request, *args, **kwargs):
        instance = self.get_object()
        self.perform_destroy(instance)
        return Response(status=status.HTTP_204_NO_CONTENT)

    def perform_create(self, serializer):
        self.validate_parent(serializer.validated_data)
        serializer.save()

    def perform_update(self, serializer):
        self.validate_parent(serializer.validated_data, instance_id=serializer.instance.id)
        serializer.save()

    def validate_parent(self, data, instance_id=None):
        parent = data.get('parent_department')
        if parent and instance_id:
            # Check circular dependency
            curr = parent
            while curr:
                if curr.id == instance_id:
                    raise ValidationError({"parent_department": "Circular parent reference detected."})
                curr = curr.parent_department

class AssetCategoryViewSet(viewsets.ModelViewSet):
    queryset = AssetCategory.objects.all()
    serializer_class = AssetCategorySerializer
    permission_classes = [IsRole('Admin')()]

    def destroy(self, request, *args, **kwargs):
        instance = self.get_object()
        instance.status = 'Inactive'
        instance.save()
        return Response(status=status.HTTP_204_NO_CONTENT)

class EmployeeDirectoryView(generics.ListAPIView):
    serializer_class = EmployeeDirectorySerializer
    permission_classes = [IsRole('Admin')()]

    def get_queryset(self):
        queryset = Employee.objects.all()
        department = self.request.query_params.get('department')
        role = self.request.query_params.get('role')
        status = self.request.query_params.get('status')
        
        if department:
            queryset = queryset.filter(department_id=department)
        if role:
            queryset = queryset.filter(role=role)
        if status:
            queryset = queryset.filter(status=status)
            
        return queryset

class EmployeePromoteView(APIView):
    permission_classes = [IsRole('Admin')()]

    def post(self, request, id):
        try:
            employee = Employee.objects.get(id=id)
        except Employee.DoesNotExist:
            return Response({"error": "Employee not found"}, status=status.HTTP_404_NOT_FOUND)

        new_role = request.data.get('role')
        if new_role not in ['DepartmentHead', 'AssetManager']:
            return Response({"error": "Invalid role for promotion"}, status=status.HTTP_400_BAD_REQUEST)

        old_role = employee.role
        employee.role = new_role
        employee.save()
        
        logger.info(f"Admin {request.user.email} promoted {employee.email} from {old_role} to {new_role}")
        return Response({"message": f"Employee promoted to {new_role} successfully."}, status=status.HTTP_200_OK)
