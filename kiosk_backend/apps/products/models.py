from django.db import models
from django.core.validators import MinValueValidator
from django.utils.translation import gettext_lazy as _
from apps.core.models import TimeStampedModel
from apps.core.utils.validators import validate_positive_number
from .managers import ProductManager, CategoryManager


class Category(TimeStampedModel):
    name = models.CharField(max_length=255, verbose_name=_('نام'))
    parent = models.ForeignKey(
        'self',
        on_delete=models.CASCADE,
        null=True,
        blank=True,
        related_name='children',
        verbose_name=_('دسته والد')
    )
    display_order = models.IntegerField(default=0, verbose_name=_('ترتیب نمایش'))
    is_active = models.BooleanField(default=True, verbose_name=_('فعال'))
    
    objects = CategoryManager()
    
    class Meta:
        verbose_name = _('دسته‌بندی')
        verbose_name_plural = _('دسته‌بندی‌ها')
        ordering = ['display_order', 'name']
    
    def __str__(self):
        return self.name


class Product(TimeStampedModel):
    name = models.CharField(max_length=255, verbose_name=_('نام'))
    description = models.TextField(blank=True, verbose_name=_('توضیحات'))
    price = models.IntegerField(
        validators=[validate_positive_number],
        verbose_name=_('قیمت')
    )
    category = models.ForeignKey(
        Category,
        on_delete=models.PROTECT,
        null=False,
        related_name='products',
        verbose_name=_('دسته‌بندی'),
        help_text=_('دسته‌بندی محصول اجباری است')
    )
    image = models.ImageField(
        upload_to='products/',
        null=True,
        blank=True,
        verbose_name=_('تصویر')
    )
    stock_quantity = models.IntegerField(
        default=0,
        validators=[MinValueValidator(0)],
        verbose_name=_('موجودی')
    )
    is_active = models.BooleanField(default=True, verbose_name=_('فعال'))
    service_fee_applicable = models.BooleanField(
        default=False,
        verbose_name=_('اعمال هزینه سرویس'),
        help_text=_('اگر فعال باشد، هزینه سرویس تنظیمات یک‌بار روی فاکتوری که این محصول در آن باشد اعمال می‌شود'),
    )
    
    objects = ProductManager()
    
    class Meta:
        verbose_name = _('محصول')
        verbose_name_plural = _('محصولات')
        ordering = ['name']
        indexes = [
            models.Index(fields=['category', 'is_active']),
            models.Index(fields=['is_active', 'stock_quantity']),
            models.Index(fields=['name']),
        ]
    
    def __str__(self):
        return self.name
    
    @property
    def is_in_stock(self):
        return self.stock_quantity > 0


class ProductOptionGroup(TimeStampedModel):
    """Group of selectable options for a product (e.g. size, extras)."""

    product = models.ForeignKey(
        Product,
        on_delete=models.CASCADE,
        related_name='option_groups',
        verbose_name=_('محصول'),
    )
    name = models.CharField(max_length=120, verbose_name=_('نام گروه'))
    min_select = models.PositiveSmallIntegerField(default=0, verbose_name=_('حداقل انتخاب'))
    max_select = models.PositiveSmallIntegerField(default=1, verbose_name=_('حداکثر انتخاب'))
    is_required = models.BooleanField(default=False, verbose_name=_('اجباری'))
    display_order = models.IntegerField(default=0, verbose_name=_('ترتیب نمایش'))
    is_active = models.BooleanField(default=True, verbose_name=_('فعال'))

    class Meta:
        verbose_name = _('گروه آپشن محصول')
        verbose_name_plural = _('گروه‌های آپشن محصول')
        ordering = ['display_order', 'id']

    def __str__(self):
        return f'{self.product.name} / {self.name}'


class ProductOption(TimeStampedModel):
    """A single selectable option inside a group."""

    group = models.ForeignKey(
        ProductOptionGroup,
        on_delete=models.CASCADE,
        related_name='options',
        verbose_name=_('گروه'),
    )
    name = models.CharField(max_length=120, verbose_name=_('نام'))
    price_delta = models.IntegerField(
        default=0,
        verbose_name=_('تغییر قیمت (ریال)'),
        help_text=_('مبلغ اضافه‌شونده به قیمت پایه محصول'),
    )
    display_order = models.IntegerField(default=0, verbose_name=_('ترتیب نمایش'))
    is_active = models.BooleanField(default=True, verbose_name=_('فعال'))

    class Meta:
        verbose_name = _('آپشن محصول')
        verbose_name_plural = _('آپشن‌های محصول')
        ordering = ['display_order', 'id']

    def __str__(self):
        return self.name


class StockHistory(TimeStampedModel):
    CHANGE_TYPE_CHOICES = [
        ('increase', _('افزایش')),
        ('decrease', _('کاهش')),
        ('sale', _('فروش')),
        ('manual', _('دستی')),
    ]
    
    product = models.ForeignKey(
        Product,
        on_delete=models.CASCADE,
        related_name='stock_history',
        verbose_name=_('محصول')
    )
    previous_quantity = models.IntegerField(verbose_name=_('موجودی قبلی'))
    new_quantity = models.IntegerField(verbose_name=_('موجودی جدید'))
    change_type = models.CharField(
        max_length=20,
        choices=CHANGE_TYPE_CHOICES,
        verbose_name=_('نوع تغییر')
    )
    related_order_id = models.IntegerField(
        null=True,
        blank=True,
        verbose_name=_('شناسه سفارش')
    )
    admin_user = models.ForeignKey(
        'auth.User',
        on_delete=models.SET_NULL,
        null=True,
        blank=True,
        verbose_name=_('کاربر ادمین')
    )
    notes = models.TextField(blank=True, verbose_name=_('یادداشت'))
    
    class Meta:
        verbose_name = _('تاریخچه موجودی')
        verbose_name_plural = _('تاریخچه موجودی')
        ordering = ['-created_at']
        indexes = [
            models.Index(fields=['product', '-created_at']),
            models.Index(fields=['change_type', '-created_at']),
        ]
    
    def __str__(self):
        return f"{self.product.name} - {self.change_type} - {self.created_at}"
