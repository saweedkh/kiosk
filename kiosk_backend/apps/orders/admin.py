from django.contrib import admin
from apps.orders.models import Order, OrderItem, Invoice


class OrderItemInline(admin.TabularInline):
    model = OrderItem
    extra = 0
    readonly_fields = ['subtotal']


@admin.register(Order)
class OrderAdmin(admin.ModelAdmin):
    list_display = ['order_number', 'session_key', 'status', 'payment_status', 'total_amount', 'created_at']
    list_filter = ['status', 'payment_status', 'created_at']
    search_fields = ['order_number', 'session_key']
    readonly_fields = ['order_number', 'created_at', 'updated_at']
    inlines = [OrderItemInline]


@admin.register(OrderItem)
class OrderItemAdmin(admin.ModelAdmin):
    list_display = ['id', 'order', 'product', 'quantity', 'unit_price', 'subtotal', 'created_at']
    list_filter = ['created_at']
    search_fields = ['product__name', 'order__order_number']
    readonly_fields = ['subtotal', 'created_at', 'updated_at']


@admin.register(Invoice)
class InvoiceAdmin(admin.ModelAdmin):
    list_display = ['invoice_number', 'order', 'created_at']
    list_filter = ['created_at']
    search_fields = ['invoice_number', 'order__order_number']
    readonly_fields = ['invoice_number', 'created_at', 'updated_at']
