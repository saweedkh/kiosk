from django.db import migrations, models
import django.core.validators


class Migration(migrations.Migration):

    dependencies = [
        ('core', '0010_service_fee_by_fulfillment'),
    ]

    operations = [
        migrations.AddField(
            model_name='sitesettings',
            name='landing_theme',
            field=models.CharField(
                choices=[
                    ('cinema', 'سینمایی'),
                    ('neon', 'نئون'),
                    ('fresh', 'روشن'),
                    ('editorial', 'تحریریه'),
                ],
                default='cinema',
                help_text='طرح صفحه خوش‌آمدگویی کیوسک (عمودی)',
                max_length=20,
                verbose_name='تم لندینگ',
            ),
        ),
        migrations.AddField(
            model_name='sitesettings',
            name='landing_cta_text',
            field=models.CharField(
                blank=True,
                default='برای سفارش، صفحه را لمس کنید',
                help_text='متن دعوت به لمس روی صفحه لندینگ',
                max_length=200,
                verbose_name='متن دکمه لندینگ',
            ),
        ),
        migrations.AddField(
            model_name='sitesettings',
            name='landing_accent_color',
            field=models.CharField(
                blank=True,
                default='',
                help_text='رنگ هگز اختیاری (مثلاً #E17100). خالی = رنگ پیش‌فرض برند',
                max_length=7,
                verbose_name='رنگ اکسنت لندینگ',
            ),
        ),
        migrations.AddField(
            model_name='sitesettings',
            name='landing_background',
            field=models.ImageField(
                blank=True,
                help_text='تصویر پس‌زمینه اختیاری صفحه لندینگ (JPG, PNG, WebP)',
                null=True,
                upload_to='settings/',
                validators=[
                    django.core.validators.FileExtensionValidator(
                        allowed_extensions=['jpg', 'jpeg', 'png', 'webp']
                    )
                ],
                verbose_name='پس‌زمینه لندینگ',
            ),
        ),
    ]
