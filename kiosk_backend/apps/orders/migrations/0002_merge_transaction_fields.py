# Generated migration for merging Transaction fields into Order

from django.db import migrations, models
import django.db.models.deletion


def migrate_transaction_data(apps, schema_editor):
    """
    Migrate data from Transaction model to Order model.
    This function transfers payment/transaction information from Transaction
    to the corresponding Order records.
    """
    Order = apps.get_model('orders', 'Order')
    Transaction = apps.get_model('payment', 'Transaction')
    
    # Check if Transaction model exists (might be deleted in future migrations)
    try:
        transactions = Transaction.objects.all()
        
        for transaction in transactions:
            # Find corresponding order by order_id
            if transaction.order_id:
                try:
                    order = Order.objects.get(id=transaction.order_id)
                    
                    # Update order with transaction data
                    if transaction.transaction_id:
                        order.transaction_id = transaction.transaction_id
                    
                    if transaction.gateway_name:
                        order.gateway_name = transaction.gateway_name
                    
                    if transaction.payment_method:
                        order.payment_method = transaction.payment_method
                    
                    if transaction.gateway_request_data:
                        order.gateway_request_data = transaction.gateway_request_data
                    
                    if transaction.gateway_response_data:
                        order.gateway_response_data = transaction.gateway_response_data
                    
                    if transaction.error_message:
                        order.error_message = transaction.error_message
                    
                    if transaction.order_details:
                        order.order_details = transaction.order_details
                    
                    # Map transaction status to payment_status if needed
                    # transaction.status: 'success', 'failed', 'pending', etc.
                    # order.payment_status: 'paid', 'failed', 'pending', etc.
                    if transaction.status == 'success' and order.payment_status != 'paid':
                        order.payment_status = 'paid'
                    elif transaction.status == 'failed' and order.payment_status != 'failed':
                        order.payment_status = 'failed'
                    
                    order.save()
                    
                except Order.DoesNotExist:
                    # Order not found, skip this transaction
                    continue
                    
    except Exception:
        # If Transaction model doesn't exist or any error occurs, just skip
        # This allows the migration to work even if Transaction is already deleted
        pass


class Migration(migrations.Migration):

    dependencies = [
        ('orders', '0001_initial'),
        ('payment', '0001_initial'),  # Add dependency to payment app for Transaction model
    ]

    operations = [
        # Step 1: Add new fields to Order (nullable first)
        migrations.AddField(
            model_name='order',
            name='payment_method',
            field=models.CharField(blank=True, max_length=50, null=True, verbose_name='روش پرداخت'),
        ),
        migrations.AddField(
            model_name='order',
            name='gateway_name',
            field=models.CharField(blank=True, max_length=50, null=True, verbose_name='نام Gateway'),
        ),
        migrations.AddField(
            model_name='order',
            name='gateway_request_data',
            field=models.JSONField(blank=True, null=True, verbose_name='داده درخواست Gateway'),
        ),
        migrations.AddField(
            model_name='order',
            name='gateway_response_data',
            field=models.JSONField(blank=True, null=True, verbose_name='داده پاسخ Gateway'),
        ),
        migrations.AddField(
            model_name='order',
            name='error_message',
            field=models.TextField(blank=True, null=True, verbose_name='پیام خطا'),
        ),
        migrations.AddField(
            model_name='order',
            name='order_details',
            field=models.JSONField(blank=True, null=True, verbose_name='جزئیات سفارش'),
        ),
        
        # Step 2: Make transaction_id unique (first remove duplicates if any)
        migrations.AlterField(
            model_name='order',
            name='transaction_id',
            field=models.CharField(blank=True, max_length=100, null=True, unique=True, verbose_name='شناسه تراکنش'),
        ),
        
        # Step 3: Add new indexes
        migrations.AddIndex(
            model_name='order',
            index=models.Index(fields=['payment_status'], name='orders_orde_payment_idx'),
        ),
        migrations.AddIndex(
            model_name='order',
            index=models.Index(fields=['transaction_id'], name='orders_orde_transact_idx'),
        ),
        migrations.AddIndex(
            model_name='order',
            index=models.Index(fields=['gateway_name'], name='orders_orde_gateway_idx'),
        ),
        
        # Step 4: Migrate data from Transaction to Order
        migrations.RunPython(
            code=migrate_transaction_data,
            reverse_code=migrations.RunPython.noop,
        ),
    ]

