from django.urls import path, include
from rest_framework.routers import DefaultRouter
from .views import DepartmentViewSet, AssetCategoryViewSet, EmployeeDirectoryView, EmployeePromoteView

router = DefaultRouter()
router.register(r'departments', DepartmentViewSet, basename='department')
router.register(r'categories', AssetCategoryViewSet, basename='category')

urlpatterns = [
    path('', include(router.urls)),
    path('employees/', EmployeeDirectoryView.as_view(), name='employee-directory'),
    path('employees/<int:id>/promote/', EmployeePromoteView.as_view(), name='employee-promote'),
]
