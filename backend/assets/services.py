from rest_framework.exceptions import ValidationError
from .models import Asset

VALID_TRANSITIONS = {
    'Available': ['Allocated', 'Reserved', 'Under Maintenance', 'Retired', 'Lost'],
    'Allocated': ['Available'],
    'Reserved': ['Available'],
    'Under Maintenance': ['Available', 'Retired'],
    'Lost': ['Available', 'Retired'],
    'Retired': ['Disposed'],
    'Disposed': [], # Terminal
}

def transition_status(asset: Asset, new_status: str, actor):
    """
    Enforces the Asset lifecycle state machine.
    """
    current_status = asset.status

    if current_status == new_status:
        return # No change needed

    if current_status == 'Disposed':
        raise ValidationError('Disposed is a terminal status and cannot be changed.')

    allowed_next_states = VALID_TRANSITIONS.get(current_status, [])
    
    if new_status not in allowed_next_states:
        raise ValidationError(
            f"Invalid status transition from '{current_status}' to '{new_status}'. "
            f"Valid next states are: {', '.join(allowed_next_states) or 'None'}"
        )

    # Note: 'Allocated', 'Reserved', and 'Under Maintenance' are set exclusively 
    # by their respective feature modules (Allocation, Booking, Maintenance).
    # This service function validates that the transition is mathematically valid,
    # but the Asset PATCH endpoint must ALSO block direct manual transitions into these states.

    asset.status = new_status
    asset.save(update_fields=['status', 'updated_at'])
    return asset
