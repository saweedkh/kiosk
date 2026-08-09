# Generated manually for manage_coupons + manage_bale

from django.db import migrations


class Migration(migrations.Migration):

    dependencies = [
        ('accounts', '0001_initial'),
    ]

    operations = [
        migrations.AlterModelOptions(
            name='userprofile',
            options={
                'permissions': [
                    ('view_reports', 'مشاهده گزارشات'),
                    ('view_products', 'مشاهده محصولات'),
                    ('add_products', 'افزودن محصول'),
                    ('change_products', 'ویرایش محصول'),
                    ('delete_products', 'حذف محصول'),
                    ('change_stock', 'تغییر موجودی'),
                    ('view_categories', 'مشاهده دسته‌بندی'),
                    ('add_categories', 'افزودن دسته‌بندی'),
                    ('change_categories', 'ویرایش دسته‌بندی'),
                    ('delete_categories', 'حذف دسته‌بندی'),
                    ('view_orders', 'مشاهده سفارشات'),
                    ('change_orders', 'تغییر وضعیت سفارش'),
                    ('change_settings', 'تغییر تنظیمات'),
                    ('manage_coupons', 'مدیریت کوپن تخفیف'),
                    ('manage_users', 'مدیریت کاربران و گروه‌ها'),
                    ('manage_bale', 'مدیریت ربات بله'),
                ],
                'verbose_name': 'پروفایل کاربر',
                'verbose_name_plural': 'پروفایل کاربران',
            },
        ),
    ]
