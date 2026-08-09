from django.db.models.signals import post_delete, post_save
from django.dispatch import receiver

from apps.products.models import Category, Product


def _bump_catalog():
    from apps.core.models.settings import SiteSettings

    SiteSettings.bump_catalog_revision()


@receiver(post_save, sender=Product)
@receiver(post_delete, sender=Product)
def product_catalog_changed(sender, **kwargs):
    _bump_catalog()


@receiver(post_save, sender=Category)
@receiver(post_delete, sender=Category)
def category_catalog_changed(sender, **kwargs):
    _bump_catalog()
