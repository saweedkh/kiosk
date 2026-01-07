from rest_framework import generics, status
from rest_framework.response import Response
from rest_framework.permissions import AllowAny, IsAdminUser
from rest_framework.parsers import MultiPartParser, FormParser, JSONParser
from apps.core.models.settings import SiteSettings
from apps.core.api.settings.serializers import (
    SiteSettingsSerializer,
    SiteSettingsPublicSerializer
)
from apps.core.api.schema import custom_extend_schema, ResponseStatusCodes


class SiteSettingsPublicAPIView(generics.RetrieveAPIView):
    """
    API endpoint برای دریافت تنظیمات عمومی سایت
    بدون نیاز به authentication - برای استفاده در frontend
    """
    queryset = SiteSettings.objects.all()
    serializer_class = SiteSettingsPublicSerializer
    permission_classes = [AllowAny]
    
    def get_object(self):
        """
        برگرداندن تنظیمات سایت (یا ایجاد یک رکورد پیش‌فرض)
        """
        return SiteSettings.get_settings()
    
    @custom_extend_schema(
        resource_name="SiteSettingsPublic",
        response_serializer=SiteSettingsPublicSerializer,
        status_codes=[
            ResponseStatusCodes.OK,
        ],
        summary="دریافت تنظیمات عمومی سایت",
        description="دریافت تنظیمات عمومی سایت شامل نام، لوگو، کپی رایت و اطلاعات تماس. بدون نیاز به authentication.",
        tags=["Settings"],
        operation_id="site_settings_public",
    )
    def get(self, request, *args, **kwargs):
        return super().get(request, *args, **kwargs)


class SiteSettingsAdminAPIView(generics.RetrieveUpdateAPIView):
    """
    API endpoint برای دریافت و ویرایش تنظیمات سایت
    فقط برای admin - شامل تمام فیلدها
    """
    queryset = SiteSettings.objects.all()
    serializer_class = SiteSettingsSerializer
    permission_classes = [IsAdminUser]
    parser_classes = [MultiPartParser, FormParser, JSONParser]  # پشتیبانی از آپلود فایل
    
    def get_object(self):
        """
        برگرداندن تنظیمات سایت (یا ایجاد یک رکورد پیش‌فرض)
        """
        return SiteSettings.get_settings()
    
    @custom_extend_schema(
        resource_name="SiteSettingsAdmin",
        response_serializer=SiteSettingsSerializer,
        status_codes=[
            ResponseStatusCodes.OK,
            ResponseStatusCodes.UNAUTHORIZED,
            ResponseStatusCodes.FORBIDDEN,
        ],
        summary="دریافت تنظیمات سایت (Admin)",
        description="دریافت تنظیمات کامل سایت. فقط برای admin.",
        tags=["Admin - Settings"],
        operation_id="site_settings_admin_get",
    )
    def get(self, request, *args, **kwargs):
        return super().get(request, *args, **kwargs)
    
    @custom_extend_schema(
        resource_name="SiteSettingsAdmin",
        response_serializer=SiteSettingsSerializer,
        status_codes=[
            ResponseStatusCodes.OK,
            ResponseStatusCodes.BAD_REQUEST,
            ResponseStatusCodes.UNAUTHORIZED,
            ResponseStatusCodes.FORBIDDEN,
        ],
        summary="ویرایش تنظیمات سایت (Admin)",
        description="ویرایش تنظیمات سایت شامل نام، لوگو، کپی رایت و اطلاعات تماس. فقط برای admin.",
        tags=["Admin - Settings"],
        operation_id="site_settings_admin_update",
    )
    def put(self, request, *args, **kwargs):
        return super().put(request, *args, **kwargs)
    
    @custom_extend_schema(
        resource_name="SiteSettingsAdmin",
        response_serializer=SiteSettingsSerializer,
        status_codes=[
            ResponseStatusCodes.OK,
            ResponseStatusCodes.BAD_REQUEST,
            ResponseStatusCodes.UNAUTHORIZED,
            ResponseStatusCodes.FORBIDDEN,
        ],
        summary="ویرایش جزئی تنظیمات سایت (Admin)",
        description="ویرایش جزئی تنظیمات سایت. فقط برای admin.",
        tags=["Admin - Settings"],
        operation_id="site_settings_admin_patch",
    )
    def patch(self, request, *args, **kwargs):
        return super().patch(request, *args, **kwargs)

