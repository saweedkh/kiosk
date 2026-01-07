from django.db import models
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
            }
        )
        return settings

