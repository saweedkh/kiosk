from django.db import migrations, models


class Migration(migrations.Migration):

    dependencies = [
        ('core', '0001_initial'),
    ]

    operations = [
        migrations.AddField(
            model_name='sitesettings',
            name='receipt_header',
            field=models.CharField(
                blank=True,
                default='',
                help_text='متنی که بالای فیش چاپی نمایش داده می‌شود',
                max_length=200,
                verbose_name='عنوان بالای فیش',
            ),
        ),
        migrations.AddField(
            model_name='sitesettings',
            name='receipt_footer',
            field=models.CharField(
                blank=True,
                default='ممنون از خرید شما',
                help_text='متنی که پایین فیش چاپی نمایش داده می‌شود',
                max_length=300,
                verbose_name='متن پایین فیش',
            ),
        ),
    ]
