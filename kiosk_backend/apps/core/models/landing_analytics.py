from django.db import models
from django.utils.translation import gettext_lazy as _


class LandingEvent(models.Model):
    """Tracks landing A/B impressions and order-start taps."""

    EVENT_IMPRESSION = 'impression'
    EVENT_START = 'start'
    EVENT_CHOICES = [
        (EVENT_IMPRESSION, _('نمایش لندینگ')),
        (EVENT_START, _('شروع سفارش')),
    ]

    event_type = models.CharField(max_length=20, choices=EVENT_CHOICES, verbose_name=_('نوع رویداد'))
    theme = models.CharField(max_length=20, verbose_name=_('تم'))
    session_key = models.CharField(max_length=64, blank=True, default='', verbose_name=_('کلید نشست'))
    created_at = models.DateTimeField(auto_now_add=True, db_index=True, verbose_name=_('زمان'))

    class Meta:
        verbose_name = _('رویداد لندینگ')
        verbose_name_plural = _('رویدادهای لندینگ')
        indexes = [
            models.Index(fields=['event_type', 'theme', '-created_at']),
            models.Index(fields=['theme', '-created_at']),
        ]

    def __str__(self):
        return f'{self.event_type}:{self.theme}'
