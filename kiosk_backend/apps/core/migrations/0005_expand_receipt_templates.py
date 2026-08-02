from django.db import migrations, models


class Migration(migrations.Migration):

    dependencies = [
        ('core', '0004_add_receipt_template'),
    ]

    operations = [
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
                help_text='طرح چاپی فیش مشتری',
                max_length=20,
                verbose_name='نوع فیش',
            ),
        ),
    ]
