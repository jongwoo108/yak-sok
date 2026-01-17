"""
Users Views
"""

from rest_framework import viewsets, status, permissions, generics
from rest_framework.views import APIView
from rest_framework.decorators import action
from rest_framework.response import Response
from rest_framework_simplejwt.tokens import RefreshToken

from django.contrib.auth import get_user_model
from django.conf import settings

import firebase_admin
from firebase_admin import auth as firebase_auth

from .models import GuardianRelation, EmergencyContact
from .serializers import (
    UserSerializer,
    UserCreateSerializer,
    GuardianRelationSerializer,
    LoginSerializer,
    GoogleLoginSerializer,
    EmergencyContactSerializer
)

User = get_user_model()


def get_tokens_for_user(user):
    """
    유저 객체에 대한 JWT 토큰 쌍 생성
    """
    refresh = RefreshToken.for_user(user)
    return {
        'refresh': str(refresh),
        'access': str(refresh.access_token),
    }


class RegisterView(generics.CreateAPIView):
    """
    회원가입 View
    """
    queryset = User.objects.all()
    permission_classes = [permissions.AllowAny]
    serializer_class = UserCreateSerializer
    
    def create(self, request, *args, **kwargs):
        print(f"[Register] Request data: {request.data}")  # 디버그 로그
        serializer = self.get_serializer(data=request.data)
        if not serializer.is_valid():
            print(f"[Register] Validation errors: {serializer.errors}")  # 에러 로그
            return Response(serializer.errors, status=status.HTTP_400_BAD_REQUEST)
        user = serializer.save()
        
        # 가입 즉시 로그인 처리 (토큰 발급)
        tokens = get_tokens_for_user(user)
        
        return Response({
            'user': UserSerializer(user).data,
            'tokens': tokens
        }, status=status.HTTP_201_CREATED)


class LoginView(APIView):
    """
    이메일 로그인 View
    """
    permission_classes = [permissions.AllowAny]
    
    def post(self, request):
        serializer = LoginSerializer(data=request.data)
        serializer.is_valid(raise_exception=True)
        user = serializer.validated_data['user']
        
        tokens = get_tokens_for_user(user)
        
        return Response({
            'user': UserSerializer(user).data,
            'tokens': tokens
        })


class GoogleLoginView(APIView):
    """
    Google 로그인 (Firebase ID Token 검증)
    """
    permission_classes = [permissions.AllowAny]
    
    def post(self, request):
        serializer = GoogleLoginSerializer(data=request.data)
        serializer.is_valid(raise_exception=True)
        id_token = serializer.validated_data['id_token']
        
        try:
            # 1. Firebase Admin SDK로 ID Token 검증 (clock_skew_seconds로 시간 오차 허용)
            decoded_token = firebase_auth.verify_id_token(id_token, clock_skew_seconds=60)
            uid = decoded_token['uid']
            email = decoded_token.get('email')
            name = decoded_token.get('name', '')
            picture = decoded_token.get('picture', '')
            
            if not email:
                return Response(
                    {'error': '이메일 정보가 없는 계정입니다.'},
                    status=status.HTTP_400_BAD_REQUEST
                )
            
            # 2. 사용자 조회 또는 생성
            user, created = User.objects.get_or_create(
                email=email,
                defaults={
                    'username': email, # 이메일을 username으로 사용
                    'first_name': name,
                    'is_active': True
                }
            )
            
            if created:
                user.set_unusable_password() # 소셜 로그인 유저는 비밀번호 없음
                user.save()
            
            # 3. 토큰 발급
            tokens = get_tokens_for_user(user)
            
            return Response({
                'user': UserSerializer(user).data,
                'tokens': tokens,
                'created': created
            })
            
        except ValueError as e:
            print(f"!!! Google Login ValueError: {e}")
            return Response(
                {'error': '유효하지 않은 토큰입니다.', 'details': str(e)},
                status=status.HTTP_401_UNAUTHORIZED
            )
        except firebase_auth.InvalidIdTokenError as e:
            print(f"!!! Google Login InvalidIdTokenError: {e}")
            return Response(
                {'error': '만료되거나 잘못된 ID Token입니다.'},
                status=status.HTTP_401_UNAUTHORIZED
            )
        except Exception as e:
            return Response(
                {'error': '로그인 처리 중 오류가 발생했습니다.', 'details': str(e)},
                status=status.HTTP_500_INTERNAL_SERVER_ERROR
            )


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
        if token is not None:
            request.user.fcm_token = token
            request.user.save(update_fields=['fcm_token'])
            return Response({'status': 'FCM 토큰이 업데이트되었습니다.'})
        return Response(
            {'error': 'fcm_token이 필요합니다.'},
            status=status.HTTP_400_BAD_REQUEST
        )

    @action(detail=False, methods=['post'], url_path='test-push')
    def test_push(self, request):
        """테스트 푸시 알림 발송"""
        from apps.alerts.fcm_service import FCMService
        
        user = request.user
        if not user.fcm_token:
            return Response({'error': 'FCM 토큰이 없습니다.'}, status=400)
            
        success = FCMService.send_notification(
            token=user.fcm_token,
            title="🔔 테스트 알림",
            body="알림이 정상적으로 수신되었습니다!",
            data={"type": "test"}
        )
        
        if success:
            return Response({'status': 'sent'})
        return Response({'error': '발송 실패'}, status=500)


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


class EmergencyContactViewSet(viewsets.ModelViewSet):
    """비상 연락처 ViewSet"""
    
    serializer_class = EmergencyContactSerializer
    permission_classes = [permissions.IsAuthenticated]
    
    def get_queryset(self):
        return EmergencyContact.objects.filter(user=self.request.user)

