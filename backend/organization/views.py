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

    def get_permissions(self):
        from rest_framework.permissions import IsAuthenticated
        if self.action in ['list', 'retrieve']:
            return [IsAuthenticated()]
        return [IsRole('Admin')()]

    def get_queryset(self):
        qs = super().get_queryset()
        user = self.request.user
        if user.role in ['Admin', 'AssetManager']:
            return qs
        elif user.role in ['DepartmentHead', 'Employee']:
            if user.department:
                return qs.filter(id=user.department.id)
            return qs.none()
        return qs.none()

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

    def get_permissions(self):
        from rest_framework.permissions import IsAuthenticated
        if self.action in ['list', 'retrieve']:
            return [IsAuthenticated()]
        return [IsRole('Admin')()]

    def destroy(self, request, *args, **kwargs):
        instance = self.get_object()
        instance.status = 'Inactive'
        instance.save()
        return Response(status=status.HTTP_204_NO_CONTENT)

class EmployeeDirectoryView(generics.ListAPIView):
    serializer_class = EmployeeDirectorySerializer

    def get_permissions(self):
        return [IsRole('Admin', 'AssetManager', 'DepartmentHead')()]

    def get_queryset(self):
        queryset = Employee.objects.all()
        user = self.request.user
        
        if user.role in ['Admin', 'AssetManager']:
            pass
        elif user.role == 'DepartmentHead':
            if user.department:
                queryset = queryset.filter(department=user.department)
            else:
                queryset = queryset.none()
        else:
            queryset = queryset.none()

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

class EmployeeManageView(APIView):
    permission_classes = [IsRole('Admin')()]

    def post(self, request, id):
        try:
            employee = Employee.objects.get(id=id)
        except Employee.DoesNotExist:
            return Response({"error": "Employee not found"}, status=status.HTTP_404_NOT_FOUND)

        new_role = request.data.get('role')
        department_id = request.data.get('department_id')
        
        updates = []
        if new_role and new_role != employee.role:
            if new_role not in ['Employee', 'DepartmentHead', 'AssetManager', 'Admin']:
                return Response({"error": "Invalid role"}, status=status.HTTP_400_BAD_REQUEST)
            employee.role = new_role
            updates.append(f"role to {new_role}")

        if department_id:
            try:
                from .models import Department
                dept = Department.objects.get(id=department_id)
                employee.department = dept
                updates.append(f"department to {dept.name}")
            except Department.DoesNotExist:
                return Response({"error": "Department not found"}, status=status.HTTP_404_NOT_FOUND)

        if updates:
            employee.save()
            logger.info(f"Admin {request.user.email} updated {employee.email}: {', '.join(updates)}")
            return Response({"message": f"Employee updated successfully."}, status=status.HTTP_200_OK)
        
        return Response({"message": "No changes made."}, status=status.HTTP_200_OK)
