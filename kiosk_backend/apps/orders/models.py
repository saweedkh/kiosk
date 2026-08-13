from django.db import models
from django.utils.translation import gettext_lazy as _
from apps.core.models import TimeStampedModel
from .managers import OrderManager, InvoiceManager


class Coupon(TimeStampedModel):
    TYPE_PERCENT = 'percent'
    TYPE_FIXED = 'fixed'
    TYPE_CHOICES = [
        (TYPE_PERCENT, _('درصدی')),
        (TYPE_FIXED, _('مبلغ ثابت')),
    ]

    code = models.CharField(max_length=40, unique=True, verbose_name=_('کد تخفیف'))
    discount_type = models.CharField(
        max_length=20,
        choices=TYPE_CHOICES,
        default=TYPE_PERCENT,
        verbose_name=_('نوع تخفیف'),
    )
    value = models.PositiveIntegerField(
        verbose_name=_('مقدار'),
        help_text=_('درصد (۰–۱۰۰) یا مبلغ ثابت به ریال'),
    )
    min_order_amount = models.PositiveIntegerField(
        default=0,
        verbose_name=_('حداقل مبلغ سفارش'),
    )
    max_discount_amount = models.PositiveIntegerField(
        null=True,
        blank=True,
        verbose_name=_('سقف تخفیف (ریال)'),
        help_text=_('فقط برای تخفیف درصدی؛ خالی = بدون سقف'),
    )
    max_uses = models.PositiveIntegerField(
        null=True,
        blank=True,
        verbose_name=_('حداکثر استفاده'),
        help_text=_('خالی = نامحدود'),
    )
    used_count = models.PositiveIntegerField(default=0, verbose_name=_('تعداد استفاده‌شده'))
    valid_from = models.DateTimeField(null=True, blank=True, verbose_name=_('شروع اعتبار'))
    valid_until = models.DateTimeField(null=True, blank=True, verbose_name=_('پایان اعتبار'))
    is_active = models.BooleanField(default=True, verbose_name=_('فعال'))

    class Meta:
        verbose_name = _('کوپن تخفیف')
        verbose_name_plural = _('کوپن‌های تخفیف')
        ordering = ['-created_at']

    def __str__(self):
        return self.code


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
    service_fee = models.PositiveIntegerField(
        default=0,
        verbose_name=_('مبلغ سرویس'),
        help_text=_('مبلغ سرویس اضافه‌شده به این سفارش (ریال)')
    )
    packaging_fee = models.PositiveIntegerField(
        default=0,
        verbose_name=_('مبلغ بسته‌بندی'),
        help_text=_('مبلغ بسته‌بندی اضافه‌شده به این سفارش (ریال)')
    )
    discount_amount = models.PositiveIntegerField(
        default=0,
        verbose_name=_('مبلغ تخفیف'),
    )
    coupon = models.ForeignKey(
        Coupon,
        on_delete=models.SET_NULL,
        null=True,
        blank=True,
        related_name='orders',
        verbose_name=_('کوپن'),
    )
    coupon_code = models.CharField(
        max_length=40,
        blank=True,
        default='',
        verbose_name=_('کد کوپن (بکاپ)'),
    )
    landing_theme = models.CharField(
        max_length=20,
        blank=True,
        default='',
        verbose_name=_('تم لندینگ'),
        help_text=_('تم A/B که منجر به این سفارش شده'),
    )
    payment_status = models.CharField(max_length=20, default='pending', verbose_name=_('وضعیت پرداخت'))
    transaction_id = models.CharField(max_length=100, null=True, blank=True, unique=True, verbose_name=_('شناسه تراکنش'))
    receipt_number = models.IntegerField(null=True, blank=True, verbose_name=_('شماره رسید روزانه'))

    FULFILLMENT_DINE_IN = 'dine_in'
    FULFILLMENT_TAKEAWAY = 'takeaway'
    FULFILLMENT_CHOICES = [
        (FULFILLMENT_DINE_IN, _('داخل سالن')),
        (FULFILLMENT_TAKEAWAY, _('بیرون‌بر')),
    ]
    fulfillment_type = models.CharField(
        max_length=20,
        choices=FULFILLMENT_CHOICES,
        default=FULFILLMENT_DINE_IN,
        verbose_name=_('نوع سفارش'),
        help_text=_('داخل سالن یا بیرون‌بر'),
    )
    
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
            models.Index(fields=['created_at', 'payment_status']),
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
    selected_options = models.JSONField(
        default=list,
        blank=True,
        verbose_name=_('آپشن‌های انتخاب‌شده'),
        help_text=_('لیست {id, name, group_name, price_delta}'),
    )
    
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
