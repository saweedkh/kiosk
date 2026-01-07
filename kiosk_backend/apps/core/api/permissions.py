from rest_framework import permissions


class IsAdminUser(permissions.IsAuthenticated):
    def has_permission(self, request, view):
        return super().has_permission(request, view) and request.user.is_staff


class IsKioskUser(permissions.AllowAny):
    def has_permission(self, request, view):
        return True

