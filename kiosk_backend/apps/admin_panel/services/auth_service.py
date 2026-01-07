"""
Authentication service for admin panel.
Provides JWT token generation and management.
"""
from typing import Dict, Optional
from django.contrib.auth import get_user_model
from rest_framework_simplejwt.tokens import RefreshToken
from rest_framework_simplejwt.exceptions import TokenError

User = get_user_model()


class AuthService:
    """
    Authentication service for admin panel.
    
    Provides methods for JWT token generation and management.
    """
    
    @staticmethod
    def generate_tokens(user: User) -> Dict[str, str]:
        """
        Generate JWT access and refresh tokens for a user.
        
        Args:
            user: User instance
            
        Returns:
            Dictionary containing 'access_token' and 'refresh_token'
            
        Raises:
            ValueError: If user is not active or not staff
        """
        if not user.is_active:
            raise ValueError('User account is not active')
        
        if not user.is_staff:
            raise ValueError('User does not have admin access')
        
        refresh = RefreshToken.for_user(user)
        
        return {
            'access_token': str(refresh.access_token),
            'refresh_token': str(refresh),
        }
    
    @staticmethod
    def refresh_access_token(refresh_token: str) -> Dict[str, str]:
        """
        Generate a new access token using a refresh token.
        
        Args:
            refresh_token: Refresh token string
            
        Returns:
            Dictionary containing new 'access_token'
            
        Raises:
            TokenError: If refresh token is invalid or expired
        """
        try:
            refresh = RefreshToken(refresh_token)
            return {
                'access_token': str(refresh.access_token),
            }
        except TokenError as e:
            raise ValueError(f'Invalid or expired refresh token: {str(e)}')
    
    @staticmethod
    def blacklist_token(refresh_token: str) -> None:
        """
        Blacklist a refresh token (logout).
        
        Args:
            refresh_token: Refresh token string to blacklist
            
        Raises:
            TokenError: If refresh token is invalid
        """
        try:
            token = RefreshToken(refresh_token)
            token.blacklist()
        except TokenError as e:
            raise ValueError(f'Invalid refresh token: {str(e)}')

