from typing import Any
from rest_framework import generics, status
from rest_framework.response import Response
from django.contrib.auth import login, logout
from django.contrib.auth import get_user_model
from apps.admin_panel.api.auth.auth_serializers import (
    LoginSerializer,
    UserSerializer,
    LoginResponseSerializer,
    LogoutResponseSerializer,
    UserInfoResponseSerializer
)
from apps.admin_panel.api.permissions import IsAdminUser
from apps.logs.services.log_service import LogService
from apps.admin_panel.services.auth_service import AuthService
from apps.core.api.schema import custom_extend_schema
from apps.core.api.schema import ResponseStatusCodes
from django.utils.translation import gettext_lazy as _

User = get_user_model()


class LoginAPIView(generics.GenericAPIView):
    """
    API endpoint for admin login.
    
    Authenticates admin user and creates a session.
    """
    serializer_class = LoginSerializer
    
    @custom_extend_schema(
        resource_name="AdminLogin",
        parameters=[LoginSerializer],
        response_serializer=LoginResponseSerializer,
        status_codes=[
            ResponseStatusCodes.OK,
            ResponseStatusCodes.BAD_REQUEST,
            ResponseStatusCodes.UNAUTHORIZED,
        ],
        summary="Admin Login",
        description="Authenticate admin user and create a session. Returns user information on successful login.",
        tags=["Admin - Auth"],
        operation_id="admin_login"
    )
    def post(self, request):
        """
        Authenticate and login admin user.
        
        Args:
            request: HTTP request object with username and password
            
        Returns:
            Response: Standard response with user data in result field
            
        Raises:
            ValidationError: If credentials are invalid
        """
        request_serializer = LoginSerializer(data=request.data)
        request_serializer.is_valid(raise_exception=True)
        request_data = request_serializer.validated_data
        
        user = request_data['user']
        
        # Generate JWT tokens
        tokens = AuthService.generate_tokens(user)
        
        LogService.log_info(
            'admin',
            'admin_login',
            user=user,
            ip_address=request.META.get('REMOTE_ADDR'),
            details={'username': user.username}
        )

        response_data = {
            'access_token': tokens['access_token'],
            'refresh_token': tokens['refresh_token'],
            'user_info': UserSerializer(user).data
        }
        
        return Response(
            data=LoginResponseSerializer(response_data).data,
            status=status.HTTP_200_OK
        )


class LogoutAPIView(generics.GenericAPIView):
    """
    API endpoint for admin logout.
    
    Logs out the current admin user and destroys the session.
    """
    serializer_class = LogoutResponseSerializer
    permission_classes = [IsAdminUser]
    
    @custom_extend_schema(
        resource_name="AdminLogout",
        response_serializer=LogoutResponseSerializer,
        status_codes=[
            ResponseStatusCodes.OK,
            ResponseStatusCodes.UNAUTHORIZED,
        ],
        summary="Admin Logout",
        description="Logout the current admin user and destroy the session.",
        tags=["Admin - Auth"],
        operation_id="admin_logout"
    )
    def post(self, request):
        """
        Logout admin user.
        
        Args:
            request: HTTP request object
            
        Returns:
            Response: Standard response with success message
        """
        if request.user.is_authenticated:
            username = request.user.username
            logout(request)
            
            LogService.log_info(
                'admin',
                'admin_logout',
                user=request.user if hasattr(request, 'user') else None,
                ip_address=request.META.get('REMOTE_ADDR'),
                details={'username': username}
            )
        
        response_data = {'message': 'Logout successful'}
        
        return Response(
            data=LogoutResponseSerializer(response_data).data,
            status=status.HTTP_200_OK
        )


class UserInfoAPIView(generics.GenericAPIView):
    """
    API endpoint for getting current admin user information.
    
    Returns information about the currently authenticated admin user.
    """
    serializer_class = UserSerializer
    permission_classes = [IsAdminUser]
    
    @custom_extend_schema(
        resource_name="AdminUserInfo",
        response_serializer=UserInfoResponseSerializer,
        status_codes=[
            ResponseStatusCodes.OK,
            ResponseStatusCodes.UNAUTHORIZED,
        ],
        summary="Get Current User Info",
        description="Get information about the currently authenticated admin user.",
        tags=["Admin - Auth"],
        operation_id="admin_user_info"
    )
    def get(self, request):
        """
        Get current admin user information.
        
        Args:
            request: HTTP request object
            
        Returns:
            Response: Standard response with user data in result field
        """
        response_data = {
            'user': UserSerializer(request.user).data
        }
        
        return Response(
            data=UserInfoResponseSerializer(response_data).data,
            status=status.HTTP_200_OK,
        )

