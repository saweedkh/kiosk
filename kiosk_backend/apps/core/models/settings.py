from django.db import models, transaction
from django.core.validators import FileExtensionValidator


class SiteSettings(models.Model):
    """
    تنظیمات سایت - شامل نام، لوگو، کپی رایت و غیره
    """
    # اطلاعات اصلی
    site_name = models.CharField(
        max_length=200,
        default='فروشگاه',
        verbose_name='نام سایت',
        help_text='نام فروشگاه یا سایت'
    )
    
    # لوگو
    logo = models.ImageField(
        upload_to='settings/',
        null=True,
        blank=True,
        validators=[FileExtensionValidator(allowed_extensions=['jpg', 'jpeg', 'png', 'svg', 'webp'])],
        verbose_name='لوگو',
        help_text='لوگوی سایت (JPG, PNG, SVG, WebP)'
    )
    
    # کپی رایت
    copyright_text = models.CharField(
        max_length=500,
        default='© تمامی حقوق محفوظ است',
        verbose_name='متن کپی رایت',
        help_text='متن کپی رایت که در footer نمایش داده می‌شود'
    )
    
    # اطلاعات تماس (اختیاری)
    contact_phone = models.CharField(
        max_length=20,
        null=True,
        blank=True,
        verbose_name='شماره تماس',
        help_text='شماره تماس فروشگاه'
    )
    
    contact_email = models.EmailField(
        null=True,
        blank=True,
        verbose_name='ایمیل',
        help_text='ایمیل فروشگاه'
    )
    
    contact_address = models.TextField(
        null=True,
        blank=True,
        verbose_name='آدرس',
        help_text='آدرس فروشگاه'
    )
    
    # تنظیمات اضافی
    description = models.TextField(
        null=True,
        blank=True,
        verbose_name='توضیحات',
        help_text='توضیحات کوتاه درباره فروشگاه'
    )

    # متن‌های فیش چاپی
    receipt_header = models.CharField(
        max_length=200,
        blank=True,
        default='',
        verbose_name='عنوان بالای فیش',
        help_text='متنی که بالای فیش چاپی نمایش داده می‌شود'
    )
    receipt_footer = models.CharField(
        max_length=300,
        blank=True,
        default='ممنون از خرید شما',
        verbose_name='متن پایین فیش',
        help_text='متنی که پایین فیش چاپی نمایش داده می‌شود'
    )

    RECEIPT_TEMPLATE_MODERN = 'modern'
    RECEIPT_TEMPLATE_CLASSIC = 'classic'
    RECEIPT_TEMPLATE_MINIMAL = 'minimal'
    RECEIPT_TEMPLATE_ELEGANT = 'elegant'
    RECEIPT_TEMPLATE_BOLD = 'bold'
    RECEIPT_TEMPLATE_TICKET = 'ticket'
    RECEIPT_TEMPLATE_MARKET = 'market'
    RECEIPT_TEMPLATE_BANNER = 'banner'
    RECEIPT_TEMPLATE_CHOICES = [
        (RECEIPT_TEMPLATE_MODERN, 'مدرن'),
        (RECEIPT_TEMPLATE_CLASSIC, 'کلاسیک'),
        (RECEIPT_TEMPLATE_MINIMAL, 'ساده'),
        (RECEIPT_TEMPLATE_ELEGANT, 'شیک'),
        (RECEIPT_TEMPLATE_BOLD, 'پررنگ'),
        (RECEIPT_TEMPLATE_TICKET, 'بلیطی'),
        (RECEIPT_TEMPLATE_MARKET, 'بازاری'),
        (RECEIPT_TEMPLATE_BANNER, 'بنری'),
    ]
    receipt_template = models.CharField(
        max_length=20,
        choices=RECEIPT_TEMPLATE_CHOICES,
        default=RECEIPT_TEMPLATE_MODERN,
        verbose_name='نوع فیش',
        help_text='طرح چاپی فیش مشتری (در حالت عادی)'
    )

    RECEIPT_TEMPLATE_MODE_NORMAL = 'normal'
    RECEIPT_TEMPLATE_MODE_RANDOM = 'random'
    RECEIPT_TEMPLATE_MODE_CHOICES = [
        (RECEIPT_TEMPLATE_MODE_NORMAL, 'عادی'),
        (RECEIPT_TEMPLATE_MODE_RANDOM, 'رندوم'),
    ]
    receipt_template_mode = models.CharField(
        max_length=20,
        choices=RECEIPT_TEMPLATE_MODE_CHOICES,
        default=RECEIPT_TEMPLATE_MODE_NORMAL,
        verbose_name='حالت نوع فیش',
        help_text='عادی: همان طرح انتخاب‌شده می‌ماند. رندوم: هر روز یک طرح دیگر استفاده می‌شود.'
    )

    RECEIPT_COPY_MODE_SINGLE = 'single'
    RECEIPT_COPY_MODE_DUAL = 'dual'
    RECEIPT_COPY_MODE_CHOICES = [
        (RECEIPT_COPY_MODE_SINGLE, 'تک فیش'),
        (RECEIPT_COPY_MODE_DUAL, 'دو فیش'),
    ]
    receipt_copy_mode = models.CharField(
        max_length=20,
        choices=RECEIPT_COPY_MODE_CHOICES,
        default=RECEIPT_COPY_MODE_DUAL,
        verbose_name='تعداد فیش چاپی',
        help_text='تک فیش: یک برگ بعد از پرداخت. دو فیش: فاکتور مشتری و فاکتور فروشنده.'
    )

    # هزینه سرویس (اختیاری — به مبلغ کل سفارش اضافه می‌شود)
    service_enabled = models.BooleanField(
        default=False,
        verbose_name='فعال‌سازی سرویس',
        help_text='در صورت فعال بودن، مبلغ سرویس به جمع فاکتور اضافه می‌شود'
    )
    service_fee = models.PositiveIntegerField(
        default=0,
        verbose_name='مبلغ سرویس (ریال)',
        help_text='مبلغ سرویس به ریال که هنگام فعال بودن به مبلغ کل اضافه می‌شود'
    )

    # شمارنده پایدار شماره فیش (با ری‌استارت سیستم ریست نمی‌شود)
    last_receipt_number = models.PositiveIntegerField(
        default=0,
        verbose_name='آخرین شماره فیش',
        help_text='آخرین شماره فیش تخصیص‌داده‌شده؛ فیش بعدی این مقدار + ۱ است'
    )

    RECEIPT_NUMBER_MODE_MANUAL = 'manual'
    RECEIPT_NUMBER_MODE_AUTOMATIC = 'automatic'
    RECEIPT_NUMBER_MODE_CHOICES = [
        (RECEIPT_NUMBER_MODE_MANUAL, 'دستی'),
        (RECEIPT_NUMBER_MODE_AUTOMATIC, 'اتوماتیک'),
    ]
    receipt_number_mode = models.CharField(
        max_length=20,
        choices=RECEIPT_NUMBER_MODE_CHOICES,
        default=RECEIPT_NUMBER_MODE_MANUAL,
        verbose_name='حالت شماره فیش',
        help_text='دستی: فقط با ریست دستی از ۱ شروع می‌شود. اتوماتیک: با عوض شدن روز از ۱ شروع می‌شود.'
    )
    receipt_number_date = models.DateField(
        null=True,
        blank=True,
        verbose_name='تاریخ شمارنده فیش',
        help_text='آخرین روزی که شماره فیش برای آن تخصیص داده شده (برای ریست روزانه اتوماتیک)'
    )
    
    # متادیتا
    created_at = models.DateTimeField(auto_now_add=True, verbose_name='تاریخ ایجاد')
    updated_at = models.DateTimeField(auto_now=True, verbose_name='تاریخ بروزرسانی')
    
    class Meta:
        verbose_name = 'تنظیمات سایت'
        verbose_name_plural = 'تنظیمات سایت'
    
    def __str__(self):
        return f'تنظیمات: {self.site_name}'
    
    def save(self, *args, **kwargs):
        # فقط یک رکورد مجاز است
        if not self.pk:
            # اگر رکوردی وجود دارد، آن را حذف کن
            SiteSettings.objects.all().delete()
        # ID را 1 تنظیم کن
        self.pk = 1
        if (
            self.receipt_number_mode == self.RECEIPT_NUMBER_MODE_AUTOMATIC
            and self.receipt_number_date is None
        ):
            self.receipt_number_date = self._local_today()
        super().save(*args, **kwargs)
    
    @classmethod
    def get_settings(cls):
        """
        دریافت تنظیمات سایت (یا ایجاد یک رکورد پیش‌فرض)
        """
        settings, created = cls.objects.get_or_create(
            pk=1,
            defaults={
                'site_name': 'فروشگاه',
                'copyright_text': '© تمامی حقوق محفوظ است',
                'receipt_header': '',
                'receipt_footer': 'ممنون از خرید شما',
                'receipt_template': 'modern',
                'receipt_template_mode': cls.RECEIPT_TEMPLATE_MODE_NORMAL,
                'receipt_copy_mode': cls.RECEIPT_COPY_MODE_DUAL,
                'service_enabled': False,
                'service_fee': 0,
                'last_receipt_number': 0,
                'receipt_number_mode': cls.RECEIPT_NUMBER_MODE_MANUAL,
                'receipt_number_date': None,
            }
        )
        return settings

    def resolve_receipt_template(self) -> str:
        """
        Template used for printing today.
        Normal: fixed receipt_template. Random: cycles by local calendar day.
        """
        templates = [choice[0] for choice in self.RECEIPT_TEMPLATE_CHOICES]
        if not templates:
            return self.RECEIPT_TEMPLATE_MODERN

        if self.receipt_template_mode == self.RECEIPT_TEMPLATE_MODE_RANDOM:
            today = self._local_today()
            return templates[today.toordinal() % len(templates)]

        chosen = (self.receipt_template or '').strip()
        if chosen in templates:
            return chosen
        return self.RECEIPT_TEMPLATE_MODERN

    def get_active_service_fee(self) -> int:
        """Service fee in rials to add to order total (0 when disabled)."""
        if not self.service_enabled:
            return 0
        return max(int(self.service_fee or 0), 0)

    @classmethod
    def _local_today(cls):
        from django.utils import timezone
        return timezone.localdate()

    def effective_next_receipt_number(self) -> int:
        """Next number that would be allocated (without mutating)."""
        if (
            self.receipt_number_mode == self.RECEIPT_NUMBER_MODE_AUTOMATIC
            and self.receipt_number_date is not None
            and self.receipt_number_date < self._local_today()
        ):
            return 1
        return (self.last_receipt_number or 0) + 1

    @classmethod
    def allocate_next_receipt_number(cls) -> int:
        """
        Atomically allocate the next persistent receipt number.
        Manual: only resets via reset_receipt_number().
        Automatic: resets to 1 when the local calendar day changes.
        """
        today = cls._local_today()
        with transaction.atomic():
            settings = cls.objects.select_for_update().filter(pk=1).first()
            if settings is None:
                settings = cls.get_settings()
                settings = cls.objects.select_for_update().get(pk=1)

            if (
                settings.receipt_number_mode == cls.RECEIPT_NUMBER_MODE_AUTOMATIC
                and settings.receipt_number_date is not None
                and settings.receipt_number_date < today
            ):
                settings.last_receipt_number = 0

            settings.last_receipt_number += 1
            settings.receipt_number_date = today
            settings.save(
                update_fields=['last_receipt_number', 'receipt_number_date', 'updated_at']
            )
            return settings.last_receipt_number
    @classmethod
    def reset_receipt_number(cls, start_from: int = 0) -> int:
        """
        Reset receipt counter. Next allocated number will be start_from + 1.
        """
        if start_from < 0:
            start_from = 0
        today = cls._local_today()
        with transaction.atomic():
            settings = cls.objects.select_for_update().filter(pk=1).first()
            if settings is None:
                settings = cls.get_settings()
                settings = cls.objects.select_for_update().get(pk=1)
            settings.last_receipt_number = start_from
            settings.receipt_number_date = today
            settings.save(
                update_fields=['last_receipt_number', 'receipt_number_date', 'updated_at']
            )
            return settings.last_receipt_number

