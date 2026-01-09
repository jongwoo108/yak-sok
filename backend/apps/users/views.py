"""
Users Views
"""

from rest_framework import viewsets, status, permissions
from rest_framework.decorators import action
from rest_framework.response import Response
from django.contrib.auth import get_user_model
from .models import GuardianRelation
from .serializers import (
    UserSerializer,
    UserCreateSerializer,
    GuardianRelationSerializer
)

User = get_user_model()


class UserViewSet(viewsets.ModelViewSet):
    """사용자 ViewSet"""
    
    queryset = User.objects.all()
    
    def get_serializer_class(self):
        if self.action == 'create':
            return UserCreateSerializer
        return UserSerializer
    
    def get_permissions(self):
        if self.action == 'create':
            return [permissions.AllowAny()]
        return [permissions.IsAuthenticated()]
    
    @action(detail=False, methods=['get'])
    def me(self, request):
        """현재 로그인한 사용자 정보"""
        serializer = UserSerializer(request.user)
        return Response(serializer.data)
    
    @action(detail=False, methods=['patch'])
    def update_fcm_token(self, request):
        """FCM 토큰 업데이트"""
        token = request.data.get('fcm_token')
        if token:
            request.user.fcm_token = token
            request.user.save(update_fields=['fcm_token'])
            return Response({'status': 'FCM 토큰이 업데이트되었습니다.'})
        return Response(
            {'error': 'fcm_token이 필요합니다.'},
            status=status.HTTP_400_BAD_REQUEST
        )


class GuardianRelationViewSet(viewsets.ModelViewSet):
    """보호자 관계 ViewSet"""
    
    serializer_class = GuardianRelationSerializer
    permission_classes = [permissions.IsAuthenticated]
    
    def get_queryset(self):
        user = self.request.user
        if user.role == User.Role.SENIOR:
            return GuardianRelation.objects.filter(senior=user)
        elif user.role == User.Role.GUARDIAN:
            return GuardianRelation.objects.filter(guardian=user)
        return GuardianRelation.objects.none()
