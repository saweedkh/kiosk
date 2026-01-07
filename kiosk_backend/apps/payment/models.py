from django.db import models
from django.utils.translation import gettext_lazy as _
from apps.core.models import TimeStampedModel
from .managers import TransactionManager


class Transaction(TimeStampedModel):
    STATUS_CHOICES = [
        ('pending', _('در انتظار')),
        ('processing', _('در حال پردازش')),
        ('success', _('موفق')),
        ('failed', _('ناموفق')),
        ('cancelled', _('لغو شده')),
    ]
    
    transaction_id = models.CharField(max_length=100, unique=True, verbose_name=_('شناسه تراکنش'))
    order_id = models.IntegerField(null=True, blank=True, verbose_name=_('شناسه سفارش'))
    order_details = models.JSONField(null=True, blank=True, verbose_name=_('جزئیات سفارش'))
    amount = models.IntegerField(verbose_name=_('مبلغ'))
    status = models.CharField(max_length=20, choices=STATUS_CHOICES, default='pending', verbose_name=_('وضعیت'))
    payment_method = models.CharField(max_length=50, null=True, blank=True, verbose_name=_('روش پرداخت'))
    gateway_name = models.CharField(max_length=50, null=True, blank=True, verbose_name=_('نام Gateway'))
    gateway_request_data = models.JSONField(null=True, blank=True, verbose_name=_('داده درخواست Gateway'))
    gateway_response_data = models.JSONField(null=True, blank=True, verbose_name=_('داده پاسخ Gateway'))
    error_message = models.TextField(null=True, blank=True, verbose_name=_('پیام خطا'))
    
    objects = TransactionManager()
    
    class Meta:
        verbose_name = _('تراکنش')
        verbose_name_plural = _('تراکنش‌ها')
        ordering = ['-created_at']
        indexes = [
            models.Index(fields=['transaction_id']),
            models.Index(fields=['order_id']),
            models.Index(fields=['status']),
            models.Index(fields=['gateway_name']),
        ]
    
    def __str__(self):
        return f"Transaction {self.transaction_id}"
