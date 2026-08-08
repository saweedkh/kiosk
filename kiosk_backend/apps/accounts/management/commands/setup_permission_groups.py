from django.core.management.base import BaseCommand
from django.contrib.auth import get_user_model
from django.contrib.auth.models import Group

from apps.accounts.services.permission_service import PermissionService

User = get_user_model()


class Command(BaseCommand):
    help = 'Ensure custom permissions and default groups (مشاهده‌گر، اپراتور، مدیر) exist'

    def handle(self, *args, **options):
        PermissionService.ensure_default_groups()

        manager = Group.objects.filter(name='مدیر').first()
        if manager:
            staff_without_groups = User.objects.filter(
                is_staff=True,
                is_superuser=False,
                groups__isnull=True,
            )
            count = 0
            for user in staff_without_groups:
                user.groups.add(manager)
                count += 1
            if count:
                self.stdout.write(self.style.WARNING(
                    f'Assigned group «مدیر» to {count} staff user(s) without groups.'
                ))

        self.stdout.write(self.style.SUCCESS('Default permission groups are ready.'))
