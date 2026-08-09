from django.urls import path
from apps.core.api.analytics.views import LandingEventCreateAPIView

urlpatterns = [
    path('landing-event/', LandingEventCreateAPIView.as_view(), name='landing-event'),
]
