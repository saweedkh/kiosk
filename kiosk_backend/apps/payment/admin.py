from django.contrib import admin
from apps.payment.models import Transaction


@admin.register(Transaction)
class TransactionAdmin(admin.ModelAdmin):
    list_display = [
        'transaction_id', 'order_id', 'amount', 'status',
        'gateway_name', 'payment_method', 'created_at'
    ]
    list_filter = ['status', 'gateway_name', 'payment_method', 'created_at']
    search_fields = ['transaction_id', 'order_id']
    readonly_fields = [
        'transaction_id', 'order_details', 'gateway_request_data',
        'gateway_response_data', 'created_at', 'updated_at'
    ]
    fieldsets = (
        ('اطلاعات پایه', {
            'fields': ('transaction_id', 'order_id', 'order_details', 'amount', 'status')
        }),
        ('اطلاعات پرداخت', {
            'fields': ('payment_method', 'gateway_name')
        }),
        ('داده‌های Gateway', {
            'fields': ('gateway_request_data', 'gateway_response_data', 'error_message')
        }),
        ('زمان‌ها', {
            'fields': ('created_at', 'updated_at')
        }),
    )
