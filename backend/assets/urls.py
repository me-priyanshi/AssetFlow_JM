from django.urls import path, include
from rest_framework.routers import DefaultRouter
from .views import AssetViewSet, AllocationViewSet, TransferRequestViewSet

router = DefaultRouter()
router.register(r'assets', AssetViewSet, basename='asset')
router.register(r'allocations', AllocationViewSet, basename='allocation')
router.register(r'transfer-requests', TransferRequestViewSet, basename='transfer-request')

urlpatterns = [
    path('', include(router.urls)),
]
