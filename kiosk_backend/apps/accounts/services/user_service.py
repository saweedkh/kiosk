from typing import Any, Dict, List, Optional

from django.contrib.auth import get_user_model
from django.contrib.auth.models import Group
from django.db import transaction

from apps.accounts.models import UserProfile
from apps.accounts.services.permission_service import PermissionService
from apps.logs.services.log_service import LogService

User = get_user_model()


class UserService:
    @staticmethod
    def serialize_user(user: User) -> Dict[str, Any]:
        profile, _ = UserProfile.objects.get_or_create(user=user)
        permissions = sorted(PermissionService.get_user_permission_codes(user))
        return {
            'id': user.id,
            'username': user.username,
            'email': user.email or '',
            'first_name': user.first_name or '',
            'last_name': user.last_name or '',
            'is_staff': user.is_staff,
            'is_active': user.is_active,
            'is_superuser': user.is_superuser,
            'groups': [
                {'id': g.id, 'name': g.name}
                for g in user.groups.all().order_by('name')
            ],
            'permissions': permissions,
            'bale_chat_id': profile.bale_chat_id or '',
            'bale_enabled': profile.bale_enabled,
        }

    @staticmethod
    def _actor_is_superuser(actor: Optional[User]) -> bool:
        return bool(actor and actor.is_superuser)

    @staticmethod
    def _assert_can_manage_target(actor: Optional[User], target: User) -> None:
        if target.is_superuser and not UserService._actor_is_superuser(actor):
            raise ValueError('فقط سوپریوزر می‌تواند حساب سوپریوزر را مدیریت کند')

    @staticmethod
    def _resolve_superuser_flag(
        actor: Optional[User],
        requested: Optional[bool],
        *,
        current: bool = False,
    ) -> bool:
        if requested is None:
            return current
        if requested and not UserService._actor_is_superuser(actor):
            raise ValueError('فقط سوپریوزر می‌تواند دسترسی سوپریوزر بدهد')
        if current and not requested and not UserService._actor_is_superuser(actor):
            raise ValueError('فقط سوپریوزر می‌تواند دسترسی سوپریوزر را بردارد')
        return bool(requested)

    @staticmethod
    def _assert_not_last_active_superuser(user: User, *, deactivating: bool = False) -> None:
        if not user.is_superuser:
            return
        others = User.objects.filter(is_superuser=True, is_active=True).exclude(pk=user.pk)
        if not others.exists():
            if deactivating:
                raise ValueError('نمی‌توان آخرین سوپریوزر فعال را غیرفعال کرد')
            raise ValueError('نمی‌توان آخرین سوپریوزر را حذف کرد')

    @staticmethod
    @transaction.atomic
    def create_user(
        *,
        username: str,
        password: str,
        email: str = '',
        first_name: str = '',
        last_name: str = '',
        is_active: bool = True,
        is_staff: bool = True,
        is_superuser: bool = False,
        group_ids: Optional[List[int]] = None,
        bale_chat_id: Optional[str] = None,
        bale_enabled: bool = False,
        actor: Optional[User] = None,
    ) -> User:
        if User.objects.filter(username=username).exists():
            raise ValueError('نام کاربری قبلاً استفاده شده است')

        is_superuser = UserService._resolve_superuser_flag(
            actor, is_superuser, current=False
        )

        user = User.objects.create_user(
            username=username,
            password=password,
            email=email or '',
            first_name=first_name or '',
            last_name=last_name or '',
            is_active=is_active,
            is_staff=is_staff,
            is_superuser=is_superuser,
        )
        if group_ids is not None:
            user.groups.set(Group.objects.filter(id__in=group_ids))

        profile, _ = UserProfile.objects.get_or_create(user=user)
        UserService._apply_bale(profile, bale_chat_id, bale_enabled)

        LogService.log_info(
            'admin',
            'user_created',
            user=actor,
            details={'username': username, 'user_id': user.id},
        )
        return user

    @staticmethod
    @transaction.atomic
    def update_user(
        user: User,
        *,
        email: Optional[str] = None,
        first_name: Optional[str] = None,
        last_name: Optional[str] = None,
        is_active: Optional[bool] = None,
        is_staff: Optional[bool] = None,
        is_superuser: Optional[bool] = None,
        password: Optional[str] = None,
        group_ids: Optional[List[int]] = None,
        bale_chat_id: Optional[str] = None,
        bale_enabled: Optional[bool] = None,
        actor: Optional[User] = None,
    ) -> User:
        UserService._assert_can_manage_target(actor, user)

        next_superuser = UserService._resolve_superuser_flag(
            actor, is_superuser, current=user.is_superuser
        )
        if is_active is False and user.is_active:
            UserService._assert_not_last_active_superuser(user, deactivating=True)
        if user.is_superuser and not next_superuser:
            UserService._assert_not_last_active_superuser(user, deactivating=True)

        if email is not None:
            user.email = email
        if first_name is not None:
            user.first_name = first_name
        if last_name is not None:
            user.last_name = last_name
        if is_active is not None:
            user.is_active = is_active
        if is_staff is not None:
            user.is_staff = is_staff
        if is_superuser is not None:
            user.is_superuser = next_superuser
        if password:
            user.set_password(password)
        user.save()

        if group_ids is not None:
            user.groups.set(Group.objects.filter(id__in=group_ids))

        profile, _ = UserProfile.objects.get_or_create(user=user)
        if bale_chat_id is not None or bale_enabled is not None:
            UserService._apply_bale(
                profile,
                bale_chat_id if bale_chat_id is not None else profile.bale_chat_id,
                bale_enabled if bale_enabled is not None else profile.bale_enabled,
            )

        LogService.log_info(
            'admin',
            'user_updated',
            user=actor,
            details={'username': user.username, 'user_id': user.id},
        )
        return user

    @staticmethod
    @transaction.atomic
    def delete_user(user: User, *, actor: Optional[User] = None) -> None:
        UserService._assert_can_manage_target(actor, user)
        UserService._assert_not_last_active_superuser(user)
        username = user.username
        user_id = user.id
        user.delete()
        LogService.log_info(
            'admin',
            'user_deleted',
            user=actor,
            details={'username': username, 'user_id': user_id},
        )

    @staticmethod
    def _apply_bale(profile: UserProfile, bale_chat_id, bale_enabled: bool) -> None:
        chat_id = (bale_chat_id or '').strip() or None
        if chat_id:
            conflict = UserProfile.objects.filter(bale_chat_id=chat_id).exclude(pk=profile.pk).exists()
            if conflict:
                raise ValueError('این شناسه بله قبلاً برای کاربر دیگری ثبت شده است')
        profile.bale_chat_id = chat_id
        profile.bale_enabled = bool(bale_enabled) and bool(chat_id)
        profile.save()

    @staticmethod
    def get_user_by_bale_chat_id(chat_id: str) -> Optional[User]:
        if not chat_id:
            return None
        try:
            profile = UserProfile.objects.select_related('user').get(
                bale_chat_id=str(chat_id),
                bale_enabled=True,
                user__is_active=True,
            )
            return profile.user
        except UserProfile.DoesNotExist:
            return None


class GroupService:
    @staticmethod
    def serialize_group(group: Group) -> Dict[str, Any]:
        from apps.accounts.permissions_catalog import ALL_PERMISSION_CODES

        codes = [
            p.codename
            for p in group.permissions.all()
            if p.codename in ALL_PERMISSION_CODES and p.content_type.app_label == 'accounts'
        ]
        return {
            'id': group.id,
            'name': group.name,
            'permissions': sorted(codes),
            'permission_labels': [
                {'codename': c, 'name': PermissionService.label_for(c)} for c in sorted(codes)
            ],
            'user_count': group.user_set.count(),
        }

    @staticmethod
    @transaction.atomic
    def create_group(name: str, permission_codes: List[str], actor: Optional[User] = None) -> Group:
        if Group.objects.filter(name=name).exists():
            raise ValueError('گروهی با این نام وجود دارد')
        group = Group.objects.create(name=name)
        perms = PermissionService.resolve_permissions_qs(permission_codes)
        group.permissions.set(perms)
        LogService.log_info(
            'admin',
            'group_created',
            user=actor,
            details={'group_id': group.id, 'name': name},
        )
        return group

    @staticmethod
    @transaction.atomic
    def update_group(
        group: Group,
        *,
        name: Optional[str] = None,
        permission_codes: Optional[List[str]] = None,
        actor: Optional[User] = None,
    ) -> Group:
        if name is not None and name != group.name:
            if Group.objects.filter(name=name).exclude(pk=group.pk).exists():
                raise ValueError('گروهی با این نام وجود دارد')
            group.name = name
            group.save(update_fields=['name'])
        if permission_codes is not None:
            perms = PermissionService.resolve_permissions_qs(permission_codes)
            group.permissions.set(perms)
        LogService.log_info(
            'admin',
            'group_updated',
            user=actor,
            details={'group_id': group.id, 'name': group.name},
        )
        return group

    @staticmethod
    def delete_group(group: Group, actor: Optional[User] = None) -> None:
        group_id = group.id
        name = group.name
        group.delete()
        LogService.log_info(
            'admin',
            'group_deleted',
            user=actor,
            details={'group_id': group_id, 'name': name},
        )
