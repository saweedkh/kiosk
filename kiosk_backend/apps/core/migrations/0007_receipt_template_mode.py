from django.db import migrations, models


class Migration(migrations.Migration):

    dependencies = [
        ('core', '0006_receipt_number_mode'),
    ]

    operations = [
        migrations.AddField(
            model_name='sitesettings',
            name='receipt_template_mode',
            field=models.CharField(
                choices=[('normal', 'عادی'), ('random', 'رندوم')],
                default='normal',
                help_text='عادی: همان طرح انتخاب‌شده می‌ماند. رندوم: هر روز یک طرح دیگر استفاده می‌شود.',
                max_length=20,
                verbose_name='حالت نوع فیش',
            ),
        ),
        migrations.AlterField(
            model_name='sitesettings',
            name='receipt_template',
            field=models.CharField(
                choices=[
                    ('modern', 'مدرن'),
                    ('classic', 'کلاسیک'),
                    ('minimal', 'ساده'),
                    ('elegant', 'شیک'),
                    ('bold', 'پررنگ'),
                    ('ticket', 'بلیطی'),
                    ('market', 'بازاری'),
                    ('banner', 'بنری'),
                ],
                default='modern',
                help_text='طرح چاپی فیش مشتری (در حالت عادی)',
                max_length=20,
                verbose_name='نوع فیش',
            ),
        ),
    ]
