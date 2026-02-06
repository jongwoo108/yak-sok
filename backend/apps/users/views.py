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
from django.utils import timezone
from django.views.generic import TemplateView

import firebase_admin
from firebase_admin import auth as firebase_auth

from .models import GuardianRelation, EmergencyContact, InviteCode
from .serializers import (
    UserSerializer,
    UserCreateSerializer,
    GuardianRelationSerializer,
    LoginSerializer,
    GoogleLoginSerializer,
    EmergencyContactSerializer,
    InviteCodeSerializer,
    AcceptInviteSerializer,
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


class CheckEmailView(APIView):
    """
    이메일 중복 확인 API (회원가입 전 사전 체크용)
    """
    authentication_classes = []
    permission_classes = [permissions.AllowAny]
    
    def post(self, request):
        email = request.data.get('email', '').strip().lower()
        
        if not email:
            return Response(
                {'error': '이메일을 입력해주세요.'},
                status=status.HTTP_400_BAD_REQUEST
            )
        
        # 이메일 형식 간단 검증
        import re
        email_pattern = r'^[a-zA-Z0-9._%+-]+@[a-zA-Z0-9.-]+\.[a-zA-Z]{2,}$'
        if not re.match(email_pattern, email):
            return Response(
                {'available': False, 'error': '올바른 이메일 형식이 아닙니다.'},
                status=status.HTTP_400_BAD_REQUEST
            )
        
        # 중복 확인 (email 또는 username으로 검색)
        exists = User.objects.filter(email__iexact=email).exists() or \
                 User.objects.filter(username__iexact=email).exists()
        
        if exists:
            return Response({
                'available': False,
                'error': '이미 가입된 이메일입니다.'
            })
        
        return Response({
            'available': True,
            'message': '사용 가능한 이메일입니다.'
        })


class RegisterView(generics.CreateAPIView):
    """
    회원가입 View
    """
    queryset = User.objects.all()
    authentication_classes = []  # JWT 인증 비활성화
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
    authentication_classes = []  # JWT 인증 비활성화
    permission_classes = [permissions.AllowAny]

    def post(self, request):
        # 디버그 로깅
        print(f"[Login] Content-Type: {request.content_type}")
        print(f"[Login] Request data: {request.data}")

        serializer = LoginSerializer(data=request.data)
        if not serializer.is_valid():
            print(f"[Login] Validation errors: {serializer.errors}")
            return Response(serializer.errors, status=status.HTTP_401_UNAUTHORIZED)

        user = serializer.validated_data['user']
        tokens = get_tokens_for_user(user)

        return Response({
            'user': UserSerializer(user).data,
            'tokens': tokens
        })


class GoogleLoginView(APIView):
    """
    Google 로그인 (Access Token + User Info 검증)
    """
    authentication_classes = []  # JWT 인증 비활성화
    permission_classes = [permissions.AllowAny]
    
    def post(self, request):
        access_token = request.data.get('access_token')
        user_info = request.data.get('user_info')
        
        if not access_token or not user_info:
            return Response(
                {'error': 'access_token과 user_info가 필요합니다.'},
                status=status.HTTP_400_BAD_REQUEST
            )
        
        try:
            # Google API로 토큰 검증
            import requests
            verify_response = requests.get(
                'https://www.googleapis.com/oauth2/v3/tokeninfo',
                params={'access_token': access_token}
            )
            
            if verify_response.status_code != 200:
                return Response(
                    {'error': '유효하지 않은 Access Token입니다.'},
                    status=status.HTTP_401_UNAUTHORIZED
                )
            
            token_info = verify_response.json()
            email = user_info.get('email') or token_info.get('email')
            name = user_info.get('name', '')
            
            if not email:
                return Response(
                    {'error': '이메일 정보가 없는 계정입니다.'},
                    status=status.HTTP_400_BAD_REQUEST
                )
            
            # 사용자 조회 또는 생성
            user, created = User.objects.get_or_create(
                email=email,
                defaults={
                    'username': email,
                    'first_name': name,
                    'is_active': True
                }
            )
            
            if created:
                user.set_unusable_password()
                user.save()
            
            # 토큰 발급
            tokens = get_tokens_for_user(user)
            
            return Response({
                'user': UserSerializer(user).data,
                'tokens': tokens,
                'created': created
            })
            
        except Exception as e:
            print(f"!!! Google Login Error: {e}")
            return Response(
                {'error': 'Google 로그인 처리 중 오류가 발생했습니다.', 'details': str(e)},
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
        """FCM 토큰 업데이트
        - 같은 토큰을 가진 다른 사용자가 있으면 해당 토큰 삭제 (디바이스당 1계정 보장)
        """
        token = request.data.get('fcm_token')
        if token is not None:
            # 다른 사용자가 같은 토큰을 가지고 있으면 삭제 (디바이스당 1계정)
            if token:
                User.objects.filter(fcm_token=token).exclude(id=request.user.id).update(fcm_token='')
            
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
            title="테스트 알림",
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
        # 복약자(PATIENT)와 시니어(SENIOR) 모두 동일하게 처리
        if user.role in [User.Role.SENIOR, User.Role.PATIENT]:
            return GuardianRelation.objects.filter(senior=user)
        elif user.role == User.Role.GUARDIAN:
            return GuardianRelation.objects.filter(guardian=user)
        return GuardianRelation.objects.none()


class InviteCodeView(APIView):
    """초대 코드 생성/조회 API"""
    
    permission_classes = [permissions.IsAuthenticated]
    
    def get(self, request):
        """내 활성 초대 코드 조회"""
        invite = InviteCode.objects.filter(
            user=request.user,
            is_used=False,
            expires_at__gt=timezone.now()
        ).first()
        
        if invite:
            serializer = InviteCodeSerializer(invite)
            return Response(serializer.data)
        return Response({'code': None, 'message': '활성 초대 코드가 없습니다.'})
    
    def post(self, request):
        """새 초대 코드 생성 (기존 코드 무효화)"""
        import random
        import string
        
        # 기존 미사용 코드 무효화 (만료 처리)
        InviteCode.objects.filter(
            user=request.user,
            is_used=False
        ).update(expires_at=timezone.now())
        
        # 새 6자리 코드 생성
        while True:
            code = ''.join(random.choices(string.digits, k=6))
            if not InviteCode.objects.filter(code=code).exists():
                break
        
        # 24시간 후 만료
        expires_at = timezone.now() + timezone.timedelta(hours=24)
        
        invite = InviteCode.objects.create(
            user=request.user,
            code=code,
            expires_at=expires_at
        )
        
        serializer = InviteCodeSerializer(invite)
        return Response({
            'success': True,
            'invite': serializer.data,
            'message': f'초대 코드가 생성되었습니다. 24시간 내에 사용해주세요.'
        }, status=status.HTTP_201_CREATED)


class AcceptInviteView(APIView):
    """초대 코드 수락 API"""
    
    permission_classes = [permissions.IsAuthenticated]
    
    def post(self, request):
        serializer = AcceptInviteSerializer(data=request.data)
        serializer.is_valid(raise_exception=True)
        
        code = serializer.validated_data['code']
        
        # 초대 코드 조회
        try:
            invite = InviteCode.objects.get(code=code)
        except InviteCode.DoesNotExist:
            return Response(
                {'error': '유효하지 않은 초대 코드입니다.'},
                status=status.HTTP_404_NOT_FOUND
            )
        
        # 유효성 검사
        if invite.is_used:
            return Response(
                {'error': '이미 사용된 초대 코드입니다.'},
                status=status.HTTP_400_BAD_REQUEST
            )
        
        if invite.is_expired:
            return Response(
                {'error': '만료된 초대 코드입니다.'},
                status=status.HTTP_400_BAD_REQUEST
            )
        
        # 자기 자신의 코드인지 확인
        if invite.user == request.user:
            return Response(
                {'error': '자신의 초대 코드는 사용할 수 없습니다.'},
                status=status.HTTP_400_BAD_REQUEST
            )
        
        # 역할에 따라 연결 생성
        inviter = invite.user
        accepter = request.user
        
        # 복약자/시니어 - 보호자 매칭
        # 복약자와 시니어 모두 보호자와 연결 가능
        if inviter.role == User.Role.GUARDIAN and accepter.role in [User.Role.PATIENT, User.Role.SENIOR]:
            senior, guardian = accepter, inviter  # senior 필드에 복약자/시니어 저장
        elif inviter.role in [User.Role.PATIENT, User.Role.SENIOR] and accepter.role == User.Role.GUARDIAN:
            senior, guardian = inviter, accepter
        else:
            return Response(
                {'error': '복약자/시니어와 보호자만 연결할 수 있습니다.'},
                status=status.HTTP_400_BAD_REQUEST
            )
        
        # 이미 연결되어 있는지 확인
        if GuardianRelation.objects.filter(senior=senior, guardian=guardian).exists():
            return Response(
                {'error': '이미 연결된 사용자입니다.'},
                status=status.HTTP_400_BAD_REQUEST
            )
        
        # 연결 생성
        relation = GuardianRelation.objects.create(
            senior=senior,
            guardian=guardian,
            is_primary=not GuardianRelation.objects.filter(senior=senior).exists()
        )
        
        # 초대 코드 사용 처리
        invite.is_used = True
        invite.used_by = accepter
        invite.save()
        
        return Response({
            'success': True,
            'message': f'{inviter.first_name or inviter.username}님과 연결되었습니다.',
            'relation': GuardianRelationSerializer(relation).data
        })


class EmergencyContactViewSet(viewsets.ModelViewSet):
    """비상 연락처 ViewSet"""
    
    serializer_class = EmergencyContactSerializer
    permission_classes = [permissions.IsAuthenticated]
    
    def get_queryset(self):
        return EmergencyContact.objects.filter(user=self.request.user)


class TermsView(TemplateView):
    """이용약관 페이지 (인증 불필요)"""
    template_name = 'terms.html'

    def dispatch(self, request, *args, **kwargs):
        # DRF 인증 우회
        return super().dispatch(request, *args, **kwargs)


class PrivacyView(TemplateView):
    """개인정보 처리방침 페이지 (인증 불필요)"""
    template_name = 'privacy.html'

    def dispatch(self, request, *args, **kwargs):
        # DRF 인증 우회
        return super().dispatch(request, *args, **kwargs)

