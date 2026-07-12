import logging
from datetime import date
from django.db import transaction, models
from django.db.utils import IntegrityError
from rest_framework import viewsets, status
from rest_framework.decorators import action
from rest_framework.parsers import MultiPartParser, FormParser, JSONParser
from rest_framework.permissions import IsAuthenticated
from rest_framework.response import Response

from accounts.permissions import IsRole
from .models import Asset, AssetDocument, Allocation, TransferRequest
from .serializers import (
    AssetSerializer, AssetDetailSerializer, AssetDocumentSerializer,
    AllocationSerializer, TransferRequestSerializer,
)

logger = logging.getLogger(__name__)

WRITE_ROLES = ['Admin', 'AssetManager']
APPROVE_ROLES = ['Admin', 'AssetManager', 'DepartmentHead']


class AssetViewSet(viewsets.ModelViewSet):
    """
    List/Retrieve: any authenticated user.
    Create/Update/Destroy: Admin or AssetManager only.
    """
    queryset = Asset.objects.select_related('category').prefetch_related('documents', 'allocations')
    parser_classes = [MultiPartParser, FormParser, JSONParser]

    def get_serializer_class(self):
        if self.action == 'retrieve':
            return AssetDetailSerializer
        return AssetSerializer

    def get_permissions(self):
        if self.action in ('list', 'retrieve'):
            return [IsAuthenticated()]
        return [IsRole(*WRITE_ROLES)()]

    def get_queryset(self):
        qs = super().get_queryset()
        params = self.request.query_params

        category = params.get('category')
        status_filter = params.get('status')
        location = params.get('location')
        search = params.get('search')  # asset_tag or serial_number

        if category:
            qs = qs.filter(category_id=category)
        if status_filter:
            qs = qs.filter(status=status_filter)
        if location:
            qs = qs.filter(location__icontains=location)
        if search:
            qs = qs.filter(
                models.Q(asset_tag__icontains=search) |
                models.Q(serial_number__icontains=search) |
                models.Q(name__icontains=search)
            )
        return qs

    def perform_create(self, serializer):
        serializer.save(created_by=self.request.user)

    def update(self, request, *args, **kwargs):
        partial = kwargs.pop('partial', False)
        asset = self.get_object()
        new_status = request.data.get('status')
        
        # If the user is trying to change the status manually via the generic endpoint
        if new_status and new_status != asset.status:
            from rest_framework.exceptions import ValidationError
            from .services import transition_status
            
            if new_status in ['Allocated', 'Reserved', 'Under Maintenance']:
                raise ValidationError({'status': f'This status is managed by dedicated workflows and cannot be set directly.'})
            
            # Validate mathematically via the service (saves the new status)
            transition_status(asset, new_status, request.user)
            
            # Remove status from the data so the standard serializer doesn't override or fail validation
            mutable_data = request.data.copy()
            if hasattr(mutable_data, 'pop'):
                mutable_data.pop('status', None)
            else:
                del mutable_data['status']
            
            serializer = self.get_serializer(asset, data=mutable_data, partial=partial)
            serializer.is_valid(raise_exception=True)
            self.perform_update(serializer)
            return Response(serializer.data)
            
        return super().update(request, *args, **kwargs)

    def destroy(self, request, *args, **kwargs):
        from rest_framework.exceptions import ValidationError
        raise ValidationError({'detail': 'Assets cannot be deleted — retire or dispose instead.'})

    @action(detail=True, methods=['post'], url_path='upload-document',
            permission_classes=[IsRole(*WRITE_ROLES)()])
    def upload_document(self, request, pk=None):
        asset = self.get_object()
        serializer = AssetDocumentSerializer(data=request.data)
        if serializer.is_valid():
            serializer.save(asset=asset)
            return Response(serializer.data, status=status.HTTP_201_CREATED)
        return Response(serializer.errors, status=status.HTTP_400_BAD_REQUEST)


class AllocationViewSet(viewsets.GenericViewSet):
    """Handles allocations, returns, and overdue filtering."""
    serializer_class = AllocationSerializer
    queryset = Allocation.objects.select_related('asset', 'employee', 'department')
    permission_classes = [IsAuthenticated]

    def get_queryset(self):
        qs = super().get_queryset()
        is_overdue = self.request.query_params.get('is_overdue')
        if is_overdue and is_overdue.lower() == 'true':
            # Overdue = Active + expected_return_date < today
            qs = qs.filter(status='Active', expected_return_date__lt=date.today())
        return qs

    def list(self, request):
        qs = self.get_queryset()
        serializer = self.get_serializer(qs, many=True)
        return Response(serializer.data)

    def create(self, request):
        """POST /api/allocations — allocate an asset."""
        serializer = self.get_serializer(data=request.data)
        serializer.is_valid(raise_exception=True)

        asset = serializer.validated_data['asset']

        # Check for existing active allocation first to return a useful 409
        existing = Allocation.objects.filter(asset=asset, status='Active').select_related(
            'employee', 'department'
        ).first()
        if existing:
            holder = existing.employee or existing.department
            holder_name = holder.name if holder else 'Unknown'
            holder_id = holder.pk if holder else None
            holder_type = 'employee' if existing.employee_id else 'department'
            return Response(
                {
                    'detail': f'Asset is already allocated.',
                    'current_holder': {
                        'id': holder_id,
                        'name': holder_name,
                        'type': holder_type,
                        'allocation_id': existing.pk,
                    }
                },
                status=status.HTTP_409_CONFLICT
            )

        try:
            with transaction.atomic():
                allocation = serializer.save()
                asset.status = 'Allocated'
                asset.save(update_fields=['status'])
        except IntegrityError:
            # Race condition: unique constraint caught it
            return Response(
                {'detail': 'Asset was just allocated by another request. Please refresh.'},
                status=status.HTTP_409_CONFLICT
            )

        return Response(serializer.data, status=status.HTTP_201_CREATED)

    @action(detail=True, methods=['post'], url_path='return')
    def return_asset(self, request, pk=None):
        """POST /api/allocations/{id}/return"""
        allocation = self.get_object()

        if allocation.status != 'Active':
            return Response(
                {'detail': 'This allocation is already closed.'},
                status=status.HTTP_400_BAD_REQUEST
            )

        notes = request.data.get('checkin_condition_notes', '')
        with transaction.atomic():
            allocation.status = 'Returned'
            allocation.actual_return_date = date.today()
            allocation.checkin_condition_notes = notes
            allocation.save(update_fields=['status', 'actual_return_date', 'checkin_condition_notes'])

            allocation.asset.status = 'Available'
            allocation.asset.save(update_fields=['status'])

        serializer = self.get_serializer(allocation)
        return Response(serializer.data)


class TransferRequestViewSet(viewsets.GenericViewSet):
    """Handles transfer request creation, approval, and rejection."""
    serializer_class = TransferRequestSerializer
    queryset = TransferRequest.objects.select_related(
        'allocation__asset', 'requested_by',
        'requested_for_employee', 'requested_for_department', 'approved_by'
    )
    permission_classes = [IsAuthenticated]

    def list(self, request):
        qs = self.get_queryset()
        # Non-admin/managers see only their own requests
        if request.user.role not in APPROVE_ROLES:
            qs = qs.filter(requested_by=request.user)
        else:
            status_filter = request.query_params.get('status')
            if status_filter:
                qs = qs.filter(status=status_filter)
        serializer = self.get_serializer(qs, many=True)
        return Response(serializer.data)

    def create(self, request):
        """POST /api/transfer-requests"""
        serializer = self.get_serializer(data=request.data)
        serializer.is_valid(raise_exception=True)
        serializer.save(requested_by=request.user)
        return Response(serializer.data, status=status.HTTP_201_CREATED)

    @action(detail=True, methods=['post'], url_path='approve',
            permission_classes=[IsRole(*APPROVE_ROLES)()])
    def approve(self, request, pk=None):
        """POST /api/transfer-requests/{id}/approve — atomically re-allocates."""
        transfer = self.get_object()

        if transfer.status != 'Requested':
            return Response(
                {'detail': f'Transfer request is already {transfer.status}.'},
                status=status.HTTP_400_BAD_REQUEST
            )

        old_allocation = transfer.allocation
        if old_allocation.status != 'Active':
            return Response(
                {'detail': 'The underlying allocation is no longer active.'},
                status=status.HTTP_400_BAD_REQUEST
            )

        with transaction.atomic():
            # 1. Close the old allocation
            old_allocation.status = 'Returned'
            old_allocation.actual_return_date = date.today()
            old_allocation.save(update_fields=['status', 'actual_return_date'])

            # 2. Create new allocation for the new holder
            new_allocation = Allocation(
                asset=old_allocation.asset,
                allocated_date=date.today(),
                status='Active',
            )
            if transfer.requested_for_employee_id:
                new_allocation.employee = transfer.requested_for_employee
            else:
                new_allocation.department = transfer.requested_for_department
            new_allocation.save()

            # 3. Update transfer request
            transfer.status = 'Re-allocated'
            transfer.approved_by = request.user
            transfer.save(update_fields=['status', 'approved_by', 'updated_at'])

            # 4. Ensure asset stays Allocated (atomic — never surfaces as Available)
            old_allocation.asset.status = 'Allocated'
            old_allocation.asset.save(update_fields=['status'])

        logger.info(
            f'{request.user.email} approved transfer #{transfer.pk} for {old_allocation.asset.asset_tag}'
        )
        return Response(self.get_serializer(transfer).data)

    @action(detail=True, methods=['post'], url_path='reject',
            permission_classes=[IsRole(*APPROVE_ROLES)()])
    def reject(self, request, pk=None):
        """POST /api/transfer-requests/{id}/reject"""
        transfer = self.get_object()

        if transfer.status != 'Requested':
            return Response(
                {'detail': f'Transfer request is already {transfer.status}.'},
                status=status.HTTP_400_BAD_REQUEST
            )

        transfer.status = 'Rejected'
        transfer.approved_by = request.user
        transfer.save(update_fields=['status', 'approved_by', 'updated_at'])

        return Response(self.get_serializer(transfer).data)



