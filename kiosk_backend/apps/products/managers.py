from django.db import models
from django.db.models import F, Q


class ProductManager(models.Manager):
    def active(self):
        return self.filter(is_active=True)
    
    def in_stock(self):
        return self.filter(stock_quantity__gt=0)
    
    def out_of_stock(self):
        return self.filter(stock_quantity=0)
    
    def by_category(self, category_id):
        return self.filter(category_id=category_id, is_active=True)


class CategoryManager(models.Manager):
    def active(self):
        return self.filter(is_active=True)
    
    def root_categories(self):
        return self.filter(parent=None, is_active=True)

