from django.db import migrations, models


class Migration(migrations.Migration):

    dependencies = [
        ('core', '0003_add_last_receipt_number'),
    ]

    operations = [
        migrations.AddField(
            model_name='sitesettings',
            name='receipt_template',
            field=models.CharField(
                choices=[
                    ('modern', 'مدرن'),
                    ('classic', 'کلاسیک'),
                    ('minimal', 'ساده'),
                    ('elegant', 'شیک'),
                ],
                default='modern',
                help_text='طرح چاپی فیش مشتری',
                max_length=20,
                verbose_name='نوع فیش',
            ),
        ),
    ]
