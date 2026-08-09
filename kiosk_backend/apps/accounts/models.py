from django.conf import settings
from django.db import models
from django.utils.translation import gettext_lazy as _
from apps.core.models import TimeStampedModel


class UserProfile(TimeStampedModel):
    """
    Extends Django User with Bale messenger linkage.
    Application permissions live on Django Groups / user.user_permissions.
    """

    user = models.OneToOneField(
        settings.AUTH_USER_MODEL,
        on_delete=models.CASCADE,
        related_name='profile',
        verbose_name=_('کاربر'),
    )
    bale_chat_id = models.CharField(
        max_length=64,
        unique=True,
        null=True,
        blank=True,
        verbose_name=_('شناسه چت بله'),
        help_text=_('chat_id کاربر در پیام‌رسان بله'),
    )
    bale_enabled = models.BooleanField(
        default=False,
        verbose_name=_('دسترسی ربات بله'),
        help_text=_('اگر فعال باشد، کاربر می‌تواند با ربات بله کار کند'),
    )

    class Meta:
        verbose_name = _('پروفایل کاربر')
        verbose_name_plural = _('پروفایل کاربران')
        permissions = [
            ('view_reports', 'مشاهده گزارشات'),
            ('view_products', 'مشاهده محصولات'),
            ('add_products', 'افزودن محصول'),
            ('change_products', 'ویرایش محصول'),
            ('delete_products', 'حذف محصول'),
            ('change_stock', 'تغییر موجودی'),
            ('view_categories', 'مشاهده دسته‌بندی'),
            ('add_categories', 'افزودن دسته‌بندی'),
            ('change_categories', 'ویرایش دسته‌بندی'),
            ('delete_categories', 'حذف دسته‌بندی'),
            ('view_orders', 'مشاهده سفارشات'),
            ('change_orders', 'تغییر وضعیت سفارش'),
            ('change_settings', 'تغییر تنظیمات'),
            ('manage_coupons', 'مدیریت کوپن تخفیف'),
            ('manage_users', 'مدیریت کاربران و گروه‌ها'),
            ('manage_bale', 'مدیریت ربات بله'),
        ]

    def __str__(self):
        return f'Profile<{self.user_id}>'
