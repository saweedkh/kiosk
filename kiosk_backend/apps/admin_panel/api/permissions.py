from rest_framework import permissions

# Backwards-compatible re-exports + staff gate used across admin_panel
from apps.accounts.api.permissions import (  # noqa: F401
    HasAppPermission,
    HasAnyAppPermission,
    IsStaffUser,
    IsSuperUser,
    MethodAppPermission,
)


class IsAdminUser(permissions.BasePermission):
    def has_permission(self, request, view):
        return bool(
            request.user
            and request.user.is_authenticated
            and request.user.is_staff
        )
