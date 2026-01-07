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
