from django.db import migrations, models


class Migration(migrations.Migration):

    dependencies = [
        ('products', '0005_dashboard_ab_coupons_options'),
    ]

    operations = [
        migrations.AddField(
            model_name='category',
            name='image',
            field=models.ImageField(
                blank=True,
                null=True,
                upload_to='categories/',
                verbose_name='تصویر',
            ),
        ),
    ]
