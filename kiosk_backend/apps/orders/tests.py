from unittest.mock import patch

from django.test import TestCase

from apps.orders.models import Order, OrderItem
from apps.orders.services.order_service import OrderService
from apps.products.models import Category, Product, StockHistory


class OrderStockAdjustmentTests(TestCase):
    def setUp(self):
        category = Category.objects.create(name='Test')
        self.product = Product.objects.create(
            name='Coffee',
            price=10000,
            category=category,
            stock_quantity=10,
        )
        self.order = Order.objects.create(
            order_number='ORD-TEST-001',
            session_key='sess',
            status='pending',
            total_amount=10000,
            payment_status='pending',
        )
        OrderItem.objects.create(
            order=self.order,
            product=self.product,
            product_name=self.product.name,
            quantity=2,
            unit_price=10000,
        )

    @patch('apps.orders.services.print_service.PrintService.print_receipt')
    def test_manual_paid_decreases_stock(self, _mock_print):
        OrderService.update_payment_status(self.order.id, 'paid', print_receipt=False)
        self.product.refresh_from_db()
        self.assertEqual(self.product.stock_quantity, 8)
        self.assertTrue(
            StockHistory.objects.filter(
                related_order_id=self.order.id,
                change_type='sale',
            ).exists()
        )

    @patch('apps.orders.services.print_service.PrintService.print_receipt')
    def test_cancel_paid_order_restores_stock(self, _mock_print):
        OrderService.update_payment_status(self.order.id, 'paid', print_receipt=False)
        OrderService.update_order_status(self.order.id, 'cancelled')
        self.product.refresh_from_db()
        self.order.refresh_from_db()
        self.assertEqual(self.product.stock_quantity, 10)
        self.assertEqual(self.order.payment_status, 'cancelled')

    @patch('apps.orders.services.print_service.PrintService.print_receipt')
    def test_revert_payment_from_paid_restores_stock(self, _mock_print):
        OrderService.update_payment_status(self.order.id, 'paid', print_receipt=False)
        OrderService.update_payment_status(self.order.id, 'cancelled', print_receipt=False)
        self.product.refresh_from_db()
        self.order.refresh_from_db()
        self.assertEqual(self.product.stock_quantity, 10)
        self.assertEqual(self.order.status, 'cancelled')
        self.assertEqual(self.order.payment_status, 'cancelled')

    @patch('apps.orders.services.print_service.PrintService.print_receipt')
    def test_cancel_and_revert_payment_restores_stock_once(self, _mock_print):
        OrderService.update_payment_status(self.order.id, 'paid', print_receipt=False)
        OrderService.update_order_status(self.order.id, 'cancelled')
        OrderService.update_payment_status(self.order.id, 'cancelled', print_receipt=False)
        self.product.refresh_from_db()
        self.assertEqual(self.product.stock_quantity, 10)
        self.assertEqual(
            StockHistory.objects.filter(
                related_order_id=self.order.id,
                notes__startswith=OrderService._STOCK_RESTORE_NOTE_PREFIX,
            ).count(),
            1,
        )

    @patch('apps.orders.services.print_service.PrintService.print_receipt')
    def test_order_status_paid_delegates_to_payment_flow(self, _mock_print):
        OrderService.update_order_status(self.order.id, 'paid')
        self.product.refresh_from_db()
        self.order.refresh_from_db()
        self.assertEqual(self.product.stock_quantity, 8)
        self.assertEqual(self.order.payment_status, 'paid')
        self.assertEqual(self.order.status, 'paid')

    @patch('apps.orders.services.print_service.PrintService.print_receipt')
    def test_cancel_then_repay_adjusts_stock_correctly(self, _mock_print):
        OrderService.update_payment_status(self.order.id, 'paid', print_receipt=False)
        OrderService.update_order_status(self.order.id, 'cancelled')
        OrderService.update_payment_status(self.order.id, 'paid', print_receipt=False)
        self.product.refresh_from_db()
        self.assertEqual(self.product.stock_quantity, 8)

    @patch('apps.orders.services.print_service.PrintService.print_receipt')
    def test_double_mark_paid_decreases_stock_once(self, _mock_print):
        OrderService.update_payment_status(self.order.id, 'paid', print_receipt=False)
        OrderService.update_payment_status(self.order.id, 'paid', print_receipt=False)
        self.product.refresh_from_db()
        self.assertEqual(self.product.stock_quantity, 8)
        self.assertEqual(
            StockHistory.objects.filter(
                related_order_id=self.order.id,
                change_type='sale',
            ).count(),
            len(self.order.items.all()),
        )

    def test_cancel_unpaid_order_does_not_change_stock(self):
        OrderService.update_order_status(self.order.id, 'cancelled')
        self.product.refresh_from_db()
        self.assertEqual(self.product.stock_quantity, 10)
