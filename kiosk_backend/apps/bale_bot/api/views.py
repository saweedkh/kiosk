from rest_framework import status
from rest_framework.response import Response
from rest_framework.views import APIView
from rest_framework import serializers

from apps.accounts.api.permissions import IsSuperUser
from apps.bale_bot.services.config_service import BaleConfigService


class BaleBotSettingsSerializer(serializers.Serializer):
    is_enabled = serializers.BooleanField(required=False)
    bot_token = serializers.CharField(required=False, allow_blank=True, max_length=255)
    api_base = serializers.CharField(required=False, allow_blank=True, max_length=255)
    clear_token = serializers.BooleanField(required=False, default=False)


class BaleBotSettingsAPIView(APIView):
    """Get/update Bale bot enable flag and token (superuser only)."""

    permission_classes = [IsSuperUser]

    def get(self, request):
        return Response(BaleConfigService.serialize())

    def put(self, request):
        return self._update(request)

    def patch(self, request):
        return self._update(request)

    def _update(self, request):
        serializer = BaleBotSettingsSerializer(data=request.data, partial=True)
        serializer.is_valid(raise_exception=True)
        data = serializer.validated_data
        try:
            obj = BaleConfigService.update(
                is_enabled=data.get('is_enabled'),
                bot_token=data.get('bot_token'),
                api_base=data.get('api_base'),
                clear_token=bool(data.get('clear_token')),
                actor=request.user,
            )
        except ValueError as exc:
            return Response({'detail': str(exc)}, status=status.HTTP_400_BAD_REQUEST)
        return Response(BaleConfigService.serialize(obj), status=status.HTTP_200_OK)


class BaleBotHealthAPIView(APIView):
    """Live health check against Bale API + polling worker freshness."""

    permission_classes = [IsSuperUser]

    def get(self, request):
        return Response(BaleConfigService.check_health())
