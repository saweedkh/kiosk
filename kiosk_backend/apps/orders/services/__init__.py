"""Order domain services.

Keep this package init free of heavy imports so Django URL loading
(and /health/) does not pull printer/escpos stacks at import time.
"""

__all__ = ['OrderService', 'InvoiceService']


def __getattr__(name: str):
    if name == 'OrderService':
        from .order_service import OrderService

        return OrderService
    if name == 'InvoiceService':
        from .invoice_service import InvoiceService

        return InvoiceService
    raise AttributeError(f'module {__name__!r} has no attribute {name!r}')
