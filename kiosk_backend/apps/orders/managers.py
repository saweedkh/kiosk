from django.db import models
from django.utils import timezone
from datetime import timedelta


class OrderManager(models.Manager):
    def get_by_order_number(self, order_number):
        return self.filter(order_number=order_number).first()
    
    def get_by_session(self, session_key):
        return self.filter(session_key=session_key).order_by('-created_at')
    
    def get_pending_orders(self):
        return self.filter(status='pending')
    
    def get_completed_orders(self):
        return self.filter(status='completed')
    
    def get_today_orders(self):
        today = timezone.now().date()
        return self.filter(created_at__date=today)
    
    def get_recent_orders(self, days=7):
        since = timezone.now() - timedelta(days=days)
        return self.filter(created_at__gte=since)


class InvoiceManager(models.Manager):
    def get_by_invoice_number(self, invoice_number):
        return self.filter(invoice_number=invoice_number).first()
    
    def get_by_order(self, order_id):
        return self.filter(order_id=order_id).first()

