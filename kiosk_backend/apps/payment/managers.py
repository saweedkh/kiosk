from django.db import models
from django.utils import timezone
from datetime import timedelta


class TransactionManager(models.Manager):
    def get_by_transaction_id(self, transaction_id):
        return self.filter(transaction_id=transaction_id).first()
    
    def get_by_order_id(self, order_id):
        return self.filter(order_id=order_id).order_by('-created_at')
    
    def get_pending_transactions(self):
        return self.filter(status='pending').order_by('-created_at')
    
    def get_successful_transactions(self):
        return self.filter(status='success').order_by('-created_at')
    
    def get_failed_transactions(self):
        return self.filter(status='failed').order_by('-created_at')
    
    def get_by_status(self, status):
        return self.filter(status=status).order_by('-created_at')
    
    def get_today_transactions(self):
        today = timezone.now().date()
        return self.filter(created_at__date=today)
    
    def get_recent_transactions(self, days=7):
        since = timezone.now() - timedelta(days=days)
        return self.filter(created_at__gte=since)

