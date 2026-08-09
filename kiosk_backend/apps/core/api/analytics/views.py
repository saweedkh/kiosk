from rest_framework import serializers, status
from rest_framework.response import Response
from rest_framework.views import APIView

from apps.core.models import LandingEvent, SiteSettings


class LandingEventSerializer(serializers.Serializer):
    event_type = serializers.ChoiceField(choices=['impression', 'start'])
    theme = serializers.CharField(max_length=20)
    session_key = serializers.CharField(max_length=64, required=False, allow_blank=True)


class LandingEventCreateAPIView(APIView):
    authentication_classes = []
    permission_classes = []

    def post(self, request):
        serializer = LandingEventSerializer(data=request.data)
        serializer.is_valid(raise_exception=True)
        data = serializer.validated_data
        theme = (data.get('theme') or '').strip().lower()
        valid_themes = {c[0] for c in SiteSettings.LANDING_THEME_CHOICES}
        if theme not in valid_themes:
            return Response({'detail': 'تم نامعتبر است'}, status=status.HTTP_400_BAD_REQUEST)

        LandingEvent.objects.create(
            event_type=data['event_type'],
            theme=theme,
            session_key=(data.get('session_key') or '')[:64],
        )
        return Response({'ok': True}, status=status.HTTP_201_CREATED)
