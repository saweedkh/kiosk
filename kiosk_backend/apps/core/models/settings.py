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

    # صفحه لندینگ (attract) کیوسک
    LANDING_THEME_CINEMA = 'cinema'
    LANDING_THEME_NEON = 'neon'
    LANDING_THEME_FRESH = 'fresh'
    LANDING_THEME_EDITORIAL = 'editorial'
    LANDING_THEME_CHOICES = [
        (LANDING_THEME_CINEMA, 'سینمایی'),
        (LANDING_THEME_NEON, 'نئون'),
        (LANDING_THEME_FRESH, 'روشن'),
        (LANDING_THEME_EDITORIAL, 'تحریریه'),
    ]
    landing_theme = models.CharField(
        max_length=20,
        choices=LANDING_THEME_CHOICES,
        default=LANDING_THEME_CINEMA,
        verbose_name='تم لندینگ',
        help_text='طرح صفحه خوش‌آمدگویی کیوسک (عمودی)'
    )
    landing_cta_text = models.CharField(
        max_length=200,
        blank=True,
        default='برای سفارش، صفحه را لمس کنید',
        verbose_name='متن دکمه لندینگ',
        help_text='متن دعوت به لمس روی صفحه لندینگ'
    )
    landing_accent_color = models.CharField(
        max_length=7,
        blank=True,
        default='',
        verbose_name='رنگ اصلی سایت',
        help_text='رنگ هگز برند برای دکمه‌ها و اکسنت کل سایت (مثلاً #E17100). خالی = پیش‌فرض'
    )
    landing_bg_color = models.CharField(
        max_length=7,
        blank=True,
        default='',
        verbose_name='رنگ پس‌زمینه سایت',
        help_text='رنگ هگز پس‌زمینه کل رابط (مثلاً #FFF3E8). خالی = پیش‌فرض'
    )
    landing_text_color = models.CharField(
        max_length=7,
        blank=True,
        default='',
        verbose_name='رنگ متن سایت',
        help_text='رنگ هگز متن اصلی کل رابط. خالی = پیش‌فرض'
    )
    landing_muted_color = models.CharField(
        max_length=7,
        blank=True,
        default='',
        verbose_name='رنگ متن ثانویه سایت',
        help_text='رنگ هگز متن کم‌رنگ کل رابط. خالی = پیش‌فرض'
    )
    landing_background = models.ImageField(
        upload_to='settings/',
        null=True,
        blank=True,
        validators=[FileExtensionValidator(allowed_extensions=['jpg', 'jpeg', 'png', 'webp'])],
        verbose_name='پس‌زمینه لندینگ',
        help_text='تصویر پس‌زمینه اختیاری صفحه لندینگ (JPG, PNG, WebP)'
    )

    # A/B تست تم لندینگ
    landing_ab_enabled = models.BooleanField(
        default=False,
        verbose_name='فعال‌سازی A/B لندینگ',
        help_text='اگر روشن باشد، بین تم اصلی و تم B به‌صورت تصادفی انتخاب می‌شود',
    )
    landing_theme_b = models.CharField(
        max_length=20,
        choices=LANDING_THEME_CHOICES,
        default=LANDING_THEME_NEON,
        verbose_name='تم لندینگ B',
        help_text='تم جایگزین برای تست A/B',
    )
    landing_ab_split = models.PositiveSmallIntegerField(
        default=50,
        verbose_name='درصد نمایش تم A',
        help_text='درصد بازدیدکنندگانی که تم اصلی (A) را می‌بینند (۰ تا ۱۰۰)',
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

    # هزینه سرویس: مبلغ در تنظیمات؛ اعمال روی فاکتور فقط اگر حداقل یک محصول سفارش تیک داشته باشد
    service_enabled = models.BooleanField(
        default=False,
        verbose_name='فعال‌سازی سرویس',
        help_text='اگر روشن باشد و مبلغ بیشتر از صفر باشد، برای سفارش‌هایی که حداقل یک محصول با تیک سرویس دارند یک‌بار اعمال می‌شود'
    )

    coupons_enabled = models.BooleanField(
        default=True,
        verbose_name='فعال‌سازی کوپن تخفیف',
        help_text='اگر خاموش باشد، فیلد کد تخفیف در سبد مشتری نمایش داده نمی‌شود و اعمال کوپن رد می‌شود',
    )
    service_fee = models.PositiveIntegerField(
        default=0,
        verbose_name='مبلغ سرویس (ریال)',
        help_text='مبلغ ثابت سرویس (ریال). روی کل فاکتور فقط یک‌بار اضافه می‌شود'
    )
    service_fee_dine_in = models.BooleanField(
        default=True,
        verbose_name='اعمال سرویس روی داخل سالن',
        help_text='اگر روشن باشد، هزینه سرویس برای سفارش‌های داخل سالن اعمال می‌شود'
    )
    service_fee_takeaway = models.BooleanField(
        default=True,
        verbose_name='اعمال سرویس روی بیرون‌بر',
        help_text='اگر روشن باشد، هزینه سرویس برای سفارش‌های بیرون‌بر اعمال می‌شود'
    )

    # نوع سفارش قابل انتخاب در کیوسک
    fulfillment_choice_enabled = models.BooleanField(
        default=True,
        verbose_name='فعال‌سازی انتخاب نوع سفارش',
        help_text='اگر خاموش باشد، انتخاب داخل‌سالن/بیرون‌بر در کیوسک نمایش داده نمی‌شود',
    )
    dine_in_enabled = models.BooleanField(
        default=True,
        verbose_name='فعال‌سازی داخل سالن',
        help_text='اگر خاموش باشد، مشتری نمی‌تواند نوع سفارش داخل سالن را انتخاب کند',
    )
    takeaway_enabled = models.BooleanField(
        default=True,
        verbose_name='فعال‌سازی بیرون‌بر',
        help_text='اگر خاموش باشد، مشتری نمی‌تواند نوع سفارش بیرون‌بر را انتخاب کند',
    )

    # سخت‌افزار: پوز و پرینتر
    PAYMENT_MODE_POS = 'pos'
    PAYMENT_MODE_DIRECT = 'direct'
    PAYMENT_MODE_MOCK = 'mock'
    PAYMENT_MODE_CHOICES = [
        (PAYMENT_MODE_POS, 'ارسال به کارتخوان (پوز)'),
        (PAYMENT_MODE_DIRECT, 'ثبت مستقیم بدون پوز'),
        (PAYMENT_MODE_MOCK, 'شبیه‌سازی پرداخت'),
    ]
    payment_mode = models.CharField(
        max_length=20,
        choices=PAYMENT_MODE_CHOICES,
        default=PAYMENT_MODE_MOCK,
        verbose_name='حالت پرداخت',
        help_text='پوز: انتظار کارتخوان — مستقیم: ثبت فوری بدون پوز — شبیه‌سازی: تست بدون دستگاه',
    )
    pos_host = models.CharField(
        max_length=255,
        blank=True,
        default='',
        verbose_name='آی‌پی / میزبان پوز',
        help_text='مثلاً 192.168.1.100 — خالی = ۱۹۲.۱۶۸.۱.۱۰۰',
    )
    pos_port = models.PositiveIntegerField(
        default=1362,
        verbose_name='پورت پوز',
    )
    pos_timeout = models.PositiveIntegerField(
        default=30,
        verbose_name='تایم‌اوت پوز (ثانیه)',
    )
    pos_merchant_id = models.CharField(
        max_length=64,
        blank=True,
        default='',
        verbose_name='شناسه پذیرنده (Merchant)',
    )
    pos_terminal_id = models.CharField(
        max_length=64,
        blank=True,
        default='',
        verbose_name='شناسه ترمینال',
    )
    # پروتکل پوز (همان مقادیر سابق .env)
    POS_MESSAGE_FORMAT_PARDAKHT = 'pardakht_novin_official'
    POS_MESSAGE_FORMAT_DLL_EXACT = 'dll_exact'
    POS_MESSAGE_FORMAT_BANNER = 'with_rq_and_banner'
    POS_MESSAGE_FORMAT_LENGTH = 'with_length'
    POS_MESSAGE_FORMAT_STX_ETX = 'with_stx_etx'
    POS_MESSAGE_FORMAT_TERMINATOR = 'with_terminator'
    POS_MESSAGE_FORMAT_NULL = 'with_null'
    POS_MESSAGE_FORMAT_CHOICES = [
        (POS_MESSAGE_FORMAT_PARDAKHT, 'پرداخت نوین (پیشنهادی)'),
        (POS_MESSAGE_FORMAT_DLL_EXACT, 'دقیق DLL'),
        (POS_MESSAGE_FORMAT_BANNER, 'با بنر RQ'),
        (POS_MESSAGE_FORMAT_LENGTH, 'با پیشوند طول'),
        (POS_MESSAGE_FORMAT_STX_ETX, 'STX/ETX'),
        (POS_MESSAGE_FORMAT_TERMINATOR, 'با terminator'),
        (POS_MESSAGE_FORMAT_NULL, 'با null'),
    ]
    pos_message_format = models.CharField(
        max_length=40,
        choices=POS_MESSAGE_FORMAT_CHOICES,
        default=POS_MESSAGE_FORMAT_PARDAKHT,
        verbose_name='فرمت پیام پوز',
        help_text='معادل POS_MESSAGE_FORMAT در .env — برای PNA معمولاً پرداخت نوین',
    )
    pos_use_simple_format = models.BooleanField(
        default=True,
        verbose_name='فرمت ساده پوز',
        help_text='معادل POS_USE_SIMPLE_FORMAT — برای PNA معمولاً روشن',
    )
    pos_banner = models.CharField(
        max_length=128,
        blank=True,
        default='R2023tejaratEParsian',
        verbose_name='بنر پوز',
        help_text='معادل POS_BANNER — فقط برای فرمت with_rq_and_banner',
    )
    mock_payment_delay = models.FloatField(
        default=3.0,
        verbose_name='تأخیر شبیه‌سازی پرداخت (ثانیه)',
        help_text='معادل MOCK_PAYMENT_DELAY',
    )
    mock_payment_success = models.BooleanField(
        default=True,
        verbose_name='موفقیت شبیه‌سازی پرداخت',
        help_text='معادل MOCK_PAYMENT_SUCCESS',
    )
    printer_enabled = models.BooleanField(
        default=False,
        verbose_name='ارسال فیش به پرینتر',
        help_text='اگر خاموش باشد، بعد از پرداخت فیش به پرینتر شبکه ارسال نمی‌شود',
    )
    printer_host = models.CharField(
        max_length=255,
        blank=True,
        default='',
        verbose_name='آی‌پی / میزبان پرینتر',
        help_text='مثلاً 192.168.1.100 — خالی = ۱۹۲.۱۶۸.۱.۱۰۰',
    )
    printer_port = models.PositiveIntegerField(
        default=9100,
        verbose_name='پورت پرینتر',
    )

    # چیدمان سبد خرید کیوسک
    CART_LAYOUT_SIDE = 'side'
    CART_LAYOUT_BOTTOM = 'bottom'
    CART_LAYOUT_CHOICES = [
        (CART_LAYOUT_SIDE, 'کناری (عمودی)'),
        (CART_LAYOUT_BOTTOM, 'پایین صفحه (افقی)'),
    ]
    cart_layout = models.CharField(
        max_length=20,
        choices=CART_LAYOUT_CHOICES,
        default=CART_LAYOUT_SIDE,
        verbose_name='چیدمان سبد خرید',
        help_text='محل نمایش سبد روی صفحه منوی کیوسک',
    )

    # Bumped when products/categories change so kiosks can refresh menu cache
    catalog_revision = models.PositiveIntegerField(
        default=0,
        verbose_name='نسخه کاتالوگ',
        help_text='با هر تغییر محصول/دسته افزایش می‌یابد؛ کiosk با این عدد کش منو را تازه می‌کند'
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
                'coupons_enabled': True,
                'service_fee': 0,
                'service_fee_dine_in': True,
                'service_fee_takeaway': True,
                'dine_in_enabled': True,
                'takeaway_enabled': True,
                'fulfillment_choice_enabled': True,
                'payment_mode': cls.PAYMENT_MODE_MOCK,
                'pos_host': '',
                'pos_port': 1362,
                'pos_timeout': 30,
                'pos_merchant_id': '',
                'pos_terminal_id': '',
                'pos_message_format': cls.POS_MESSAGE_FORMAT_PARDAKHT,
                'pos_use_simple_format': True,
                'pos_banner': 'R2023tejaratEParsian',
                'mock_payment_delay': 3.0,
                'mock_payment_success': True,
                'printer_enabled': False,
                'printer_host': '',
                'printer_port': 9100,
                'catalog_revision': 0,
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
        """Configured service fee in rials (0 when feature off or amount is 0)."""
        if not self.service_enabled:
            return 0
        return max(int(self.service_fee or 0), 0)

    def service_applies_to_fulfillment(self, fulfillment_type: str) -> bool:
        """Whether service fee is enabled for dine_in / takeaway."""
        if fulfillment_type == 'takeaway':
            return bool(self.service_fee_takeaway)
        return bool(self.service_fee_dine_in)

    def is_fulfillment_enabled(self, fulfillment_type: str) -> bool:
        """Whether customers may select this fulfillment type on the kiosk."""
        if not self.fulfillment_choice_enabled:
            # Choice UI off: only the default dine-in path is accepted.
            return fulfillment_type == 'dine_in'
        if fulfillment_type == 'takeaway':
            return bool(self.takeaway_enabled)
        if fulfillment_type == 'dine_in':
            return bool(self.dine_in_enabled)
        return False

    def available_fulfillment_types(self) -> list:
        """Fulfillment types shown on the kiosk (empty when choice feature is off)."""
        if not self.fulfillment_choice_enabled:
            return []
        types = []
        if self.dine_in_enabled:
            types.append('dine_in')
        if self.takeaway_enabled:
            types.append('takeaway')
        return types

    def resolve_order_service_fee(self, products, fulfillment_type: str = 'dine_in') -> int:
        """
        Apply configured fee once if fulfillment allows it and any product
        has service_fee_applicable=True.
        `products` is an iterable of Product instances (or objects with the flag).
        """
        fee = self.get_active_service_fee()
        if fee <= 0:
            return 0
        if not self.service_applies_to_fulfillment(fulfillment_type or 'dine_in'):
            return 0
        for product in products:
            if getattr(product, 'service_fee_applicable', False):
                return fee
        return 0

    @classmethod
    def bump_catalog_revision(cls) -> int:
        """
        Atomically increment catalog_revision so kiosk clients know to refresh menu cache.
        """
        with transaction.atomic():
            settings = cls.objects.select_for_update().filter(pk=1).first()
            if settings is None:
                settings = cls.get_settings()
                settings = cls.objects.select_for_update().get(pk=1)
            settings.catalog_revision = int(settings.catalog_revision or 0) + 1
            settings.save(update_fields=['catalog_revision', 'updated_at'])
            return settings.catalog_revision

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

