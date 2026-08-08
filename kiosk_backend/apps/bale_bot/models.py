from django.db import models
from django.utils.translation import gettext_lazy as _
from apps.core.models import TimeStampedModel


class BotConversation(TimeStampedModel):
    """Tracks multi-step conversations with Bale users."""

    chat_id = models.CharField(max_length=64, unique=True, verbose_name=_('شناسه چت'))
    state = models.CharField(max_length=64, blank=True, default='', verbose_name=_('وضعیت'))
    data = models.JSONField(default=dict, blank=True, verbose_name=_('داده'))

    class Meta:
        verbose_name = _('گفتگوی ربات')
        verbose_name_plural = _('گفتگوهای ربات')

    def __str__(self):
        return f'{self.chat_id}:{self.state or "-"}'

    def clear(self):
        self.state = ''
        self.data = {}
        self.save(update_fields=['state', 'data', 'updated_at'])

    def set_state(self, state: str, **extra):
        self.state = state
        if extra:
            data = dict(self.data or {})
            data.update(extra)
            self.data = data
        self.save(update_fields=['state', 'data', 'updated_at'])


class BaleBotSettings(TimeStampedModel):
    """
    Singleton configuration for the Bale bot (token + enable flag).
    Managed from the admin panel by superusers.
    """

    is_enabled = models.BooleanField(
        default=False,
        verbose_name=_('فعال بودن ربات'),
        help_text=_('اگر خاموش باشد، polling پیام‌ها را پردازش نمی‌کند'),
    )
    bot_token = models.CharField(
        max_length=255,
        blank=True,
        default='',
        verbose_name=_('توکن ربات بله'),
        help_text=_('توکن دریافتی از BotFather'),
    )
    api_base = models.CharField(
        max_length=255,
        blank=True,
        default='https://tapi.bale.ai',
        verbose_name=_('آدرس API بله'),
    )

    class Meta:
        verbose_name = _('تنظیمات ربات بله')
        verbose_name_plural = _('تنظیمات ربات بله')

    def __str__(self):
        status = 'فعال' if self.is_enabled else 'غیرفعال'
        return f'ربات بله ({status})'

    def save(self, *args, **kwargs):
        self.pk = 1
        if not self.api_base:
            self.api_base = 'https://tapi.bale.ai'
        super().save(*args, **kwargs)

    @classmethod
    def get_solo(cls) -> 'BaleBotSettings':
        from django.conf import settings as django_settings

        defaults = {
            'is_enabled': False,
            'bot_token': (getattr(django_settings, 'BALE_BOT_TOKEN', '') or '').strip(),
            'api_base': getattr(django_settings, 'BALE_API_BASE', 'https://tapi.bale.ai')
            or 'https://tapi.bale.ai',
        }
        obj, _ = cls.objects.get_or_create(pk=1, defaults=defaults)
        return obj

    def mask_token(self) -> str:
        token = (self.bot_token or '').strip()
        if not token:
            return ''
        if len(token) <= 10:
            return '*' * len(token)
        return f'{token[:6]}…{token[-4:]}'

    def resolve_token(self) -> str:
        """DB token wins; otherwise fall back to env BALE_BOT_TOKEN."""
        from django.conf import settings as django_settings

        db_token = (self.bot_token or '').strip()
        if db_token:
            return db_token
        return (getattr(django_settings, 'BALE_BOT_TOKEN', '') or '').strip()

    def resolve_api_base(self) -> str:
        from django.conf import settings as django_settings

        base = (self.api_base or '').strip()
        if base:
            return base.rstrip('/')
        return (
            getattr(django_settings, 'BALE_API_BASE', 'https://tapi.bale.ai')
            or 'https://tapi.bale.ai'
        ).rstrip('/')

    def is_runtime_active(self) -> bool:
        return bool(self.is_enabled and self.resolve_token())
