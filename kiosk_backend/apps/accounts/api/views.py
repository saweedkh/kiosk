from rest_framework import status
from rest_framework.response import Response
from rest_framework.views import APIView
from django.contrib.auth import get_user_model
from django.contrib.auth.models import Group

from apps.accounts.api.permissions import HasAppPermission
from apps.accounts.api.serializers import (
    AdminUserSerializer,
    GroupSerializer,
)
from apps.accounts.services.permission_service import PermissionService
from apps.accounts.services.user_service import GroupService, UserService

User = get_user_model()


class PermissionCatalogAPIView(APIView):
    permission_classes = [HasAppPermission]
    required_permission = 'manage_users'

    def get(self, request):
        return Response({'items': PermissionService.get_permission_catalog()})


class GroupListCreateAPIView(APIView):
    permission_classes = [HasAppPermission]
    required_permission = 'manage_users'

    def get(self, request):
        groups = Group.objects.all().order_by('name')
        return Response({'results': [GroupService.serialize_group(g) for g in groups]})

    def post(self, request):
        serializer = GroupSerializer(data=request.data)
        serializer.is_valid(raise_exception=True)
        data = serializer.validated_data
        try:
            group = GroupService.create_group(
                name=data['name'],
                permission_codes=data.get('permissions') or [],
                actor=request.user,
            )
        except ValueError as exc:
            return Response({'detail': str(exc)}, status=status.HTTP_400_BAD_REQUEST)
        return Response(GroupService.serialize_group(group), status=status.HTTP_201_CREATED)


class GroupDetailAPIView(APIView):
    permission_classes = [HasAppPermission]
    required_permission = 'manage_users'

    def get_object(self, pk):
        return Group.objects.get(pk=pk)

    def get(self, request, pk):
        try:
            group = self.get_object(pk)
        except Group.DoesNotExist:
            return Response({'detail': 'گروه یافت نشد'}, status=status.HTTP_404_NOT_FOUND)
        return Response(GroupService.serialize_group(group))

    def put(self, request, pk):
        try:
            group = self.get_object(pk)
        except Group.DoesNotExist:
            return Response({'detail': 'گروه یافت نشد'}, status=status.HTTP_404_NOT_FOUND)
        serializer = GroupSerializer(data=request.data, partial=True)
        serializer.is_valid(raise_exception=True)
        data = serializer.validated_data
        try:
            group = GroupService.update_group(
                group,
                name=data.get('name'),
                permission_codes=data.get('permissions'),
                actor=request.user,
            )
        except ValueError as exc:
            return Response({'detail': str(exc)}, status=status.HTTP_400_BAD_REQUEST)
        return Response(GroupService.serialize_group(group))

    def patch(self, request, pk):
        return self.put(request, pk)

    def delete(self, request, pk):
        try:
            group = self.get_object(pk)
        except Group.DoesNotExist:
            return Response({'detail': 'گروه یافت نشد'}, status=status.HTTP_404_NOT_FOUND)
        GroupService.delete_group(group, actor=request.user)
        return Response(status=status.HTTP_204_NO_CONTENT)


class UserListCreateAPIView(APIView):
    permission_classes = [HasAppPermission]
    required_permission = 'manage_users'

    def get(self, request):
        users = User.objects.all().order_by('username').prefetch_related('groups', 'profile')
        return Response({'results': [UserService.serialize_user(u) for u in users]})

    def post(self, request):
        serializer = AdminUserSerializer(data=request.data)
        serializer.is_valid(raise_exception=True)
        data = serializer.validated_data
        password = data.get('password')
        if not password:
            return Response({'detail': 'رمز عبور الزامی است'}, status=status.HTTP_400_BAD_REQUEST)
        try:
            user = UserService.create_user(
                username=data['username'],
                password=password,
                email=data.get('email', ''),
                first_name=data.get('first_name', ''),
                last_name=data.get('last_name', ''),
                is_active=data.get('is_active', True),
                is_staff=data.get('is_staff', True),
                is_superuser=data.get('is_superuser', False),
                group_ids=data.get('group_ids') or [],
                bale_chat_id=data.get('bale_chat_id') or None,
                bale_enabled=data.get('bale_enabled', False),
                actor=request.user,
            )
        except ValueError as exc:
            return Response({'detail': str(exc)}, status=status.HTTP_400_BAD_REQUEST)
        return Response(UserService.serialize_user(user), status=status.HTTP_201_CREATED)


class UserDetailAPIView(APIView):
    permission_classes = [HasAppPermission]
    required_permission = 'manage_users'

    def get_object(self, pk):
        return User.objects.prefetch_related('groups', 'profile').get(pk=pk)

    def get(self, request, pk):
        try:
            user = self.get_object(pk)
        except User.DoesNotExist:
            return Response({'detail': 'کاربر یافت نشد'}, status=status.HTTP_404_NOT_FOUND)
        return Response(UserService.serialize_user(user))

    def put(self, request, pk):
        try:
            user = self.get_object(pk)
        except User.DoesNotExist:
            return Response({'detail': 'کاربر یافت نشد'}, status=status.HTTP_404_NOT_FOUND)
        serializer = AdminUserSerializer(data=request.data, partial=True)
        serializer.is_valid(raise_exception=True)
        data = serializer.validated_data
        # Only apply fields explicitly present so defaults do not wipe flags.
        raw = request.data if hasattr(request.data, 'get') else {}
        # username is immutable via this endpoint
        try:
            user = UserService.update_user(
                user,
                email=data.get('email') if 'email' in data else None,
                first_name=data.get('first_name') if 'first_name' in data else None,
                last_name=data.get('last_name') if 'last_name' in data else None,
                is_active=data.get('is_active') if 'is_active' in data else None,
                is_staff=data.get('is_staff') if 'is_staff' in data else None,
                is_superuser=data.get('is_superuser') if 'is_superuser' in raw else None,
                password=data.get('password') or None,
                group_ids=data.get('group_ids') if 'group_ids' in data else None,
                bale_chat_id=data.get('bale_chat_id') if 'bale_chat_id' in data else None,
                bale_enabled=data.get('bale_enabled') if 'bale_enabled' in data else None,
                actor=request.user,
            )
        except ValueError as exc:
            return Response({'detail': str(exc)}, status=status.HTTP_400_BAD_REQUEST)
        return Response(UserService.serialize_user(user))

    def patch(self, request, pk):
        return self.put(request, pk)

    def delete(self, request, pk):
        try:
            user = self.get_object(pk)
        except User.DoesNotExist:
            return Response({'detail': 'کاربر یافت نشد'}, status=status.HTTP_404_NOT_FOUND)
        if user.id == request.user.id:
            return Response(
                {'detail': 'نمی‌توانید حساب خودتان را حذف کنید'},
                status=status.HTTP_400_BAD_REQUEST,
            )
        try:
            UserService.delete_user(user, actor=request.user)
        except ValueError as exc:
            return Response({'detail': str(exc)}, status=status.HTTP_400_BAD_REQUEST)
        return Response(status=status.HTTP_204_NO_CONTENT)
