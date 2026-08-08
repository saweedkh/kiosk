from django.db import migrations, models


class Migration(migrations.Migration):

    dependencies = [
        ('core', '0008_add_service_fee'),
    ]

    operations = [
        migrations.AddField(
            model_name='sitesettings',
            name='receipt_copy_mode',
            field=models.CharField(
                choices=[('single', 'تک فیش'), ('dual', 'دو فیش')],
                default='dual',
                help_text='تک فیش: یک برگ بعد از پرداخت. دو فیش: فاکتور مشتری و فاکتور فروشنده.',
                max_length=20,
                verbose_name='تعداد فیش چاپی',
            ),
        ),
    ]
