from django.db import models
from django.utils.translation import gettext_lazy as _
from apps.core.models import TimeStampedModel
from .managers import OrderManager, InvoiceManager


class Order(TimeStampedModel):
    STATUS_CHOICES = [
        ('pending', _('در انتظار')),
        ('processing', _('در حال پردازش')),
        ('paid', _('پرداخت شده')),
        ('completed', _('تکمیل شده')),
        ('cancelled', _('لغو شده')),
    ]
    
    order_number = models.CharField(max_length=50, unique=True, verbose_name=_('شماره سفارش'))
    session_key = models.CharField(max_length=40, verbose_name=_('کلید Session'))
    status = models.CharField(max_length=20, choices=STATUS_CHOICES, default='pending', verbose_name=_('وضعیت'))
    total_amount = models.IntegerField(verbose_name=_('مبلغ کل'))
    payment_status = models.CharField(max_length=20, default='pending', verbose_name=_('وضعیت پرداخت'))
    transaction_id = models.CharField(max_length=100, null=True, blank=True, unique=True, verbose_name=_('شناسه تراکنش'))
    receipt_number = models.IntegerField(null=True, blank=True, verbose_name=_('شماره رسید روزانه'))
    
    # Payment/Transaction fields (merged from Transaction model)
    payment_method = models.CharField(max_length=50, null=True, blank=True, verbose_name=_('روش پرداخت'))
    gateway_name = models.CharField(max_length=50, null=True, blank=True, verbose_name=_('نام Gateway'))
    gateway_request_data = models.JSONField(null=True, blank=True, verbose_name=_('داده درخواست Gateway'))
    gateway_response_data = models.JSONField(null=True, blank=True, verbose_name=_('داده پاسخ Gateway'))
    error_message = models.TextField(null=True, blank=True, verbose_name=_('پیام خطا'))
    order_details = models.JSONField(null=True, blank=True, verbose_name=_('جزئیات سفارش'))
    
    objects = OrderManager()
    
    class Meta:
        verbose_name = _('سفارش')
        verbose_name_plural = _('سفارش‌ها')
        ordering = ['-created_at']
        indexes = [
            models.Index(fields=['order_number']),
            models.Index(fields=['session_key']),
            models.Index(fields=['status']),
            models.Index(fields=['payment_status']),
            models.Index(fields=['transaction_id']),
            models.Index(fields=['gateway_name']),
        ]
    
    def __str__(self):
        return f"Order {self.order_number}"


class OrderItem(TimeStampedModel):
    order = models.ForeignKey(
        Order,
        on_delete=models.CASCADE,
        related_name='items',
        verbose_name=_('سفارش')
    )
    product = models.ForeignKey(
        'products.Product',
        on_delete=models.SET_NULL,
        null=True,
        blank=True,
        verbose_name=_('محصول'),
        help_text=_('در صورت حذف محصول، این فیلد null می‌شود')
    )
    product_name = models.CharField(
        max_length=255,
        null=True,
        blank=True,
        verbose_name=_('نام محصول (بکاپ)'),
        help_text=_('نام محصول در زمان ثبت سفارش (برای نمایش در صورت حذف محصول)')
    )
    quantity = models.IntegerField(verbose_name=_('تعداد'))
    unit_price = models.IntegerField(verbose_name=_('قیمت واحد'))
    
    class Meta:
        verbose_name = _('آیتم سفارش')
        verbose_name_plural = _('آیتم‌های سفارش')
        ordering = ['created_at']
    
    def __str__(self):
        if self.product:
            return f"{self.product.name} - {self.quantity}"
        elif self.product_name:
            return f"{self.product_name} (حذف شده) - {self.quantity}"
        else:
            return f"محصول حذف شده - {self.quantity}"
    
    @property
    def subtotal(self):
        return self.quantity * self.unit_price
    
    def save(self, *args, **kwargs):
        # ذخیره نام محصول به عنوان بکاپ
        if self.product and not self.product_name:
            self.product_name = self.product.name
        super().save(*args, **kwargs)


class Invoice(TimeStampedModel):
    invoice_number = models.CharField(max_length=50, unique=True, verbose_name=_('شماره فاکتور'))
    order = models.OneToOneField(
        Order,
        on_delete=models.CASCADE,
        related_name='invoice',
        verbose_name=_('سفارش')
    )
    pdf_file = models.FileField(upload_to='invoices/pdf/', null=True, blank=True, verbose_name=_('فایل PDF'))
    json_data = models.JSONField(null=True, blank=True, verbose_name=_('داده JSON'))
    
    objects = InvoiceManager()
    
    class Meta:
        verbose_name = _('فاکتور')
        verbose_name_plural = _('فاکتورها')
        ordering = ['-created_at']
        indexes = [
            models.Index(fields=['invoice_number']),
        ]
    
    def __str__(self):
        return f"Invoice {self.invoice_number}"
