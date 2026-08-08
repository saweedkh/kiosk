from rest_framework import permissions

from apps.accounts.services.permission_service import PermissionService


class IsSuperUser(permissions.BasePermission):
    def has_permission(self, request, view):
        return bool(
            request.user
            and request.user.is_authenticated
            and request.user.is_superuser
        )


class IsStaffUser(permissions.BasePermission):
    def has_permission(self, request, view):
        return bool(
            request.user
            and request.user.is_authenticated
            and request.user.is_staff
        )


class HasAppPermission(permissions.BasePermission):
    def has_permission(self, request, view):
        user = request.user
        if not user or not user.is_authenticated or not user.is_staff:
            return False
        if user.is_superuser:
            return True
        codename = getattr(view, 'required_permission', None)
        if not codename:
            return True
        return PermissionService.user_has_permission(user, codename)


class HasAnyAppPermission(permissions.BasePermission):
    def has_permission(self, request, view):
        user = request.user
        if not user or not user.is_authenticated or not user.is_staff:
            return False
        if user.is_superuser:
            return True
        codenames = getattr(view, 'required_any_permissions', None) or []
        if not codenames:
            return True
        return PermissionService.user_has_any(user, codenames)


class MethodAppPermission(permissions.BasePermission):
    """
    Map HTTP methods to permission codenames via view.permission_map.
    Example:
      permission_map = {
          'GET': 'view_products',
          'POST': 'add_products',
          'PUT': 'change_products',
          'PATCH': 'change_products',
          'DELETE': 'delete_products',
      }
    """

    def has_permission(self, request, view):
        user = request.user
        if not user or not user.is_authenticated or not user.is_staff:
            return False
        if user.is_superuser:
            return True
        permission_map = getattr(view, 'permission_map', None) or {}
        codename = permission_map.get(request.method)
        if not codename:
            codename = getattr(view, 'required_permission', None)
        if not codename:
            return True
        return PermissionService.user_has_permission(user, codename)
