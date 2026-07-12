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

WRITE_ROLES = ['Admin', 'AssetManager', 'DepartmentHead']
APPROVE_ROLES = ['Admin', 'AssetManager', 'DepartmentHead']


def can_manage_allocations(user):
    return user.role in WRITE_ROLES


def can_return_allocation(user, allocation):
    """Managers/heads, or the employee holder, or DeptHead of a department-held allocation."""
    if can_manage_allocations(user):
        return True
    if allocation.employee_id and allocation.employee_id == user.id:
        return True
    if (
        allocation.department_id
        and user.role == 'DepartmentHead'
        and user.department_id == allocation.department_id
    ):
        return True
    return False


def department_head_transfer_q(user):
    """Transfers involving the DeptHead's department (current holder or target)."""
    dept_id = user.department_id
    if not dept_id:
        return models.Q(pk__in=[])
    return (
        models.Q(allocation__employee__department_id=dept_id)
        | models.Q(allocation__department_id=dept_id)
        | models.Q(requested_for_employee__department_id=dept_id)
        | models.Q(requested_for_department_id=dept_id)
    )


def can_approve_transfer(user, transfer):
    # Admin, Asset Manager, and Department Head all approve org-wide (same as manager)
    if user.role in APPROVE_ROLES:
        return True
    return False


class AssetViewSet(viewsets.ModelViewSet):
    """
    List/Retrieve: any authenticated user.
    Create/Update/Destroy: Admin, AssetManager, or DepartmentHead.
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

    def get_permissions(self):
        if self.action == 'create':
            return [IsRole(*WRITE_ROLES)()]
        # return_asset: any authenticated user; object-level check in the action
        return [IsAuthenticated()]

    def get_queryset(self):
        qs = super().get_queryset()
        user = self.request.user
        params = self.request.query_params

        # Managers see org-wide; everyone else only their own employee allocations
        if not can_manage_allocations(user):
            qs = qs.filter(employee=user)

        mine = params.get('mine')
        if mine and mine.lower() in ('1', 'true', 'yes'):
            qs = qs.filter(employee=user)

        status_filter = params.get('status')
        if status_filter:
            qs = qs.filter(status=status_filter)

        is_overdue = params.get('is_overdue')
        if is_overdue and is_overdue.lower() == 'true':
            # Overdue = Active + expected_return_date < today (computed flag, not stored)
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
                    'detail': 'Asset is already allocated.',
                    'current_holder': {
                        'id': holder_id,
                        'name': holder_name,
                        'type': holder_type,
                        'allocation_id': existing.pk,
                    }
                },
                status=status.HTTP_409_CONFLICT
            )

        if asset.status != 'Available':
            return Response(
                {'detail': f'Cannot allocate asset with status "{asset.status}". Asset must be Available.'},
                status=status.HTTP_400_BAD_REQUEST
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
        """
        POST /api/allocations/{id}/return — holder or manager (Flow D).
        Early return is allowed: expected_return_date does not block returning.
        """
        try:
            allocation = Allocation.objects.select_related(
                'asset', 'employee', 'department'
            ).get(pk=pk)
        except Allocation.DoesNotExist:
            return Response({'detail': 'Not found.'}, status=status.HTTP_404_NOT_FOUND)

        if not can_return_allocation(request.user, allocation):
            return Response(
                {'detail': 'You do not have permission to return this allocation.'},
                status=status.HTTP_403_FORBIDDEN
            )

        if allocation.status != 'Active':
            return Response(
                {'detail': 'This allocation is already closed.'},
                status=status.HTTP_400_BAD_REQUEST
            )

        # No check against expected_return_date — employees may return early.

        pending = TransferRequest.objects.filter(allocation=allocation, status='Requested')
        notes = (request.data.get('checkin_condition_notes') or '').strip()
        if not notes:
            return Response(
                {
                    'checkin_condition_notes':
                    'Condition check-in notes are required (e.g. "minor scratch on lid" or "good condition").'
                },
                status=status.HTTP_400_BAD_REQUEST
            )
        with transaction.atomic():
            # Auto-reject pending transfers when the asset is returned
            pending.update(status='Rejected', approved_by=request.user)

            allocation.status = 'Returned'
            allocation.actual_return_date = date.today()
            allocation.checkin_condition_notes = notes
            allocation.save(update_fields=['status', 'actual_return_date', 'checkin_condition_notes'])

            # Allocated → Available via lifecycle service (Flow D)
            from .services import transition_status
            transition_status(allocation.asset, 'Available', request.user)

        serializer = self.get_serializer(allocation)
        return Response(serializer.data)


class TransferRequestViewSet(viewsets.GenericViewSet):
    """Handles transfer request creation, approval, and rejection."""
    serializer_class = TransferRequestSerializer
    queryset = TransferRequest.objects.select_related(
        'allocation__asset', 'allocation__employee', 'allocation__department',
        'requested_by', 'requested_for_employee', 'requested_for_department', 'approved_by'
    )
    permission_classes = [IsAuthenticated]

    def list(self, request):
        qs = self.get_queryset()
        role = request.user.role

        if role in APPROVE_ROLES:
            pass  # org-wide inbox for Admin, Asset Manager, and Department Head
        else:
            # Employees see transfers they submitted OR where they are the target
            qs = qs.filter(
                models.Q(requested_by=request.user)
                | models.Q(requested_for_employee=request.user)
            )

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

        if not can_approve_transfer(request.user, transfer):
            return Response(
                {'detail': 'You can only approve transfers involving your department.'},
                status=status.HTTP_403_FORBIDDEN
            )

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
                expected_return_date=old_allocation.expected_return_date,
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

            # 4. Reject sibling pending requests for the same allocation
            TransferRequest.objects.filter(
                allocation=old_allocation, status='Requested'
            ).exclude(pk=transfer.pk).update(
                status='Rejected', approved_by=request.user
            )

            # 5. Ensure asset stays Allocated (atomic — never surfaces as Available)
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

        if not can_approve_transfer(request.user, transfer):
            return Response(
                {'detail': 'You can only reject transfers involving your department.'},
                status=status.HTTP_403_FORBIDDEN
            )

        if transfer.status != 'Requested':
            return Response(
                {'detail': f'Transfer request is already {transfer.status}.'},
                status=status.HTTP_400_BAD_REQUEST
            )

        transfer.status = 'Rejected'
        transfer.approved_by = request.user
        transfer.save(update_fields=['status', 'approved_by', 'updated_at'])

        return Response(self.get_serializer(transfer).data)
