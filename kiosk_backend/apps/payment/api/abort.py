from rest_framework.permissions import AllowAny
from rest_framework.response import Response
from rest_framework.views import APIView

from apps.core.models.settings import SiteSettings
from apps.payment.gateway.adapter import PaymentGatewayAdapter


class PaymentAbortAPIView(APIView):
    """Kiosk cancel: stop the in-flight POS wait so the device/lock is released."""

    permission_classes = [AllowAny]
    authentication_classes = []

    def post(self, request):
        if not SiteSettings.get_settings().kiosk_payment_cancel_enabled:
            return Response(
                {'success': False, 'message': 'لغو پرداخت از کیوسک غیرفعال است'},
                status=403,
            )
        try:
            gateway = PaymentGatewayAdapter.get_gateway()
            if not hasattr(gateway, 'cancel_payment'):
                return Response({'success': False, 'message': 'cancel not supported'})
            result = gateway.cancel_payment('')
            return Response(result)
        except Exception as exc:  # noqa: BLE001
            return Response({'success': False, 'message': str(exc)}, status=200)
