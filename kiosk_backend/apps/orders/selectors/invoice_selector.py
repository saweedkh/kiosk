from apps.orders.models import Invoice


class InvoiceSelector:
    @staticmethod
    def get_invoice_by_number(invoice_number):
        return Invoice.objects.select_related('order').filter(
            invoice_number=invoice_number
        ).first()
    
    @staticmethod
    def get_invoice_by_id(invoice_id):
        return Invoice.objects.select_related('order').filter(
            id=invoice_id
        ).first()
    
    @staticmethod
    def get_invoice_by_order(order_id):
        return Invoice.objects.select_related('order').filter(
            order_id=order_id
        ).first()
    
    @staticmethod
    def get_invoices_with_orders():
        return Invoice.objects.select_related('order').order_by('-created_at')

