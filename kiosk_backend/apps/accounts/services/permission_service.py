from typing import Iterable, List, Set

from django.contrib.auth import get_user_model
from django.contrib.auth.models import Group, Permission
from django.contrib.contenttypes.models import ContentType

from apps.accounts.models import UserProfile
from apps.accounts.permissions_catalog import (
    ALL_PERMISSION_CODES,
    APP_PERMISSIONS,
    DEFAULT_GROUPS,
    PERMISSION_LABELS,
    full_permission_code,
)

User = get_user_model()


class PermissionService:
    """Helpers for app permission codes and default groups."""

    @staticmethod
    def get_permission_catalog() -> List[dict]:
        return [
            {'codename': code, 'name': label, 'full_code': full_permission_code(code)}
            for code, label in APP_PERMISSIONS
        ]

    @staticmethod
    def ensure_custom_permissions() -> None:
        ct = ContentType.objects.get_for_model(UserProfile)
        for codename, name in APP_PERMISSIONS:
            Permission.objects.get_or_create(
                content_type=ct,
                codename=codename,
                defaults={'name': name},
            )

    @staticmethod
    def ensure_default_groups() -> None:
        PermissionService.ensure_custom_permissions()
        ct = ContentType.objects.get_for_model(UserProfile)
        for group_name, codes in DEFAULT_GROUPS.items():
            group, _ = Group.objects.get_or_create(name=group_name)
            perms = Permission.objects.filter(content_type=ct, codename__in=codes)
            group.permissions.set(perms)

    @staticmethod
    def get_user_permission_codes(user: User) -> Set[str]:
        if not user or not user.is_authenticated:
            return set()
        if user.is_superuser:
            return set(ALL_PERMISSION_CODES)

        codes: Set[str] = set()
        # Direct + group permissions; filter to our catalog
        for perm in user.get_all_permissions():
            if '.' in perm:
                app_label, codename = perm.split('.', 1)
                if app_label == 'accounts' and codename in ALL_PERMISSION_CODES:
                    codes.add(codename)
        return codes

    @staticmethod
    def user_has_permission(user: User, codename: str) -> bool:
        if not user or not user.is_authenticated:
            return False
        if user.is_superuser:
            return True
        return full_permission_code(codename) in user.get_all_permissions()

    @staticmethod
    def user_has_any(user: User, codenames: Iterable[str]) -> bool:
        return any(PermissionService.user_has_permission(user, c) for c in codenames)

    @staticmethod
    def resolve_permissions_qs(codenames: Iterable[str]):
        ct = ContentType.objects.get_for_model(UserProfile)
        return Permission.objects.filter(content_type=ct, codename__in=list(codenames))

    @staticmethod
    def label_for(codename: str) -> str:
        return PERMISSION_LABELS.get(codename, codename)
