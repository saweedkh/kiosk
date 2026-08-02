from django.db import migrations, models


class Migration(migrations.Migration):

    dependencies = [
        ('core', '0005_expand_receipt_templates'),
    ]

    operations = [
        migrations.AddField(
            model_name='sitesettings',
            name='receipt_number_mode',
            field=models.CharField(
                choices=[('manual', 'دستی'), ('automatic', 'اتوماتیک')],
                default='manual',
                help_text='دستی: فقط با ریست دستی از ۱ شروع می‌شود. اتوماتیک: با عوض شدن روز از ۱ شروع می‌شود.',
                max_length=20,
                verbose_name='حالت شماره فیش',
            ),
        ),
        migrations.AddField(
            model_name='sitesettings',
            name='receipt_number_date',
            field=models.DateField(
                blank=True,
                help_text='آخرین روزی که شماره فیش برای آن تخصیص داده شده (برای ریست روزانه اتوماتیک)',
                null=True,
                verbose_name='تاریخ شمارنده فیش',
            ),
        ),
    ]
