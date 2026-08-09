from rest_framework import generics, status
from rest_framework.response import Response
from rest_framework.views import APIView

from apps.admin_panel.api.permissions import IsAdminUser, HasAppPermission
from apps.admin_panel.api.coupons.coupons_serializers import (
    CouponSerializer,
    CouponValidateSerializer,
)
from apps.orders.models import Coupon
from apps.orders.services.coupon_service import CouponService
from apps.core.api.schema import custom_extend_schema, ResponseStatusCodes


class CouponListCreateAPIView(generics.ListCreateAPIView):
    permission_classes = [IsAdminUser, HasAppPermission]
    required_permission = 'manage_coupons'
    serializer_class = CouponSerializer
    queryset = Coupon.objects.all().order_by('-created_at')
    pagination_class = None

    def get_permissions(self):
        if self.request.method == 'GET':
            # Superuser or anyone with manage_coupons / view_reports
            self.required_permission = 'view_reports'
        else:
            self.required_permission = 'manage_coupons'
        return super().get_permissions()

    def check_permissions(self, request):
        # Allow list for manage_coupons even without view_reports
        from apps.accounts.services.permission_service import PermissionService
        if request.method == 'GET' and request.user and request.user.is_authenticated:
            if (
                getattr(request.user, 'is_superuser', False)
                or PermissionService.user_has_permission(request.user, 'view_reports')
                or PermissionService.user_has_permission(request.user, 'manage_coupons')
            ):
                # Skip HasAppPermission by temporarily clearing required_permission
                for permission in self.get_permissions():
                    if permission.__class__.__name__ == 'HasAppPermission':
                        continue
                    if not permission.has_permission(request, self):
                        self.permission_denied(request)
                return
        return super().check_permissions(request)


class CouponDetailAPIView(generics.RetrieveUpdateDestroyAPIView):
    permission_classes = [IsAdminUser, HasAppPermission]
    required_permission = 'manage_coupons'
    serializer_class = CouponSerializer
    queryset = Coupon.objects.all()


class CouponValidateAPIView(APIView):
    """Public-ish validate used by kiosk checkout; also usable by admin."""
    authentication_classes = []
    permission_classes = []

    def post(self, request):
        serializer = CouponValidateSerializer(data=request.data)
        serializer.is_valid(raise_exception=True)
        data = serializer.validated_data
        try:
            preview = CouponService.preview(
                data['code'],
                data['items_total'],
                data.get('service_fee') or 0,
            )
        except ValueError as exc:
            return Response({'detail': str(exc)}, status=status.HTTP_400_BAD_REQUEST)
        return Response(preview)
