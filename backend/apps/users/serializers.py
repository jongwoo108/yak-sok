"""
Users Serializers
"""

from rest_framework import serializers
from django.contrib.auth import get_user_model, authenticate
from .models import GuardianRelation, EmergencyContact

User = get_user_model()


class UserSerializer(serializers.ModelSerializer):
    """사용자 기본 시리얼라이저"""
    
    class Meta:
        model = User
        fields = [
            'id', 'username', 'email', 'first_name', 'last_name',
            'role', 'phone_number', 'emergency_contact', 'emergency_relation', 'emergency_name'
        ]
        read_only_fields = ['id']


class UserCreateSerializer(serializers.ModelSerializer):
    """사용자 생성 시리얼라이저 (회원가입)"""
    
    password = serializers.CharField(write_only=True, min_length=8)
    password_confirm = serializers.CharField(write_only=True, required=False)
    
    # Make optional fields explicit
    email = serializers.EmailField(required=True)
    first_name = serializers.CharField(required=True)
    last_name = serializers.CharField(required=False, allow_blank=True)
    role = serializers.ChoiceField(choices=User.Role.choices, default=User.Role.SENIOR)
    
    class Meta:
        model = User
        fields = [
            'username', 'email', 'password', 'password_confirm',
            'first_name', 'last_name', 'role', 'phone_number'
        ]
        extra_kwargs = {
            'username': {'required': False} # Email will be username
        }
    
    def validate(self, attrs):
        password_confirm = attrs.pop('password_confirm', None)
        if password_confirm and attrs['password'] != password_confirm:
            raise serializers.ValidationError({'password_confirm': '비밀번호가 일치하지 않습니다.'})
        
        # Email duplication check
        email = attrs.get('email')
        if User.objects.filter(email=email).exists():
            raise serializers.ValidationError({'email': '이미 가입된 이메일입니다.'})
            
        return attrs
    
    def create(self, validated_data):
        # Use email as username
        validated_data['username'] = validated_data.get('email')
        if 'last_name' not in validated_data:
            validated_data['last_name'] = ''
        return User.objects.create_user(**validated_data)


class LoginSerializer(serializers.Serializer):
    """이메일/비밀번호 로그인 시리얼라이저"""
    email = serializers.EmailField()
    password = serializers.CharField(write_only=True)
    
    def validate(self, attrs):
        email = attrs.get('email')
        password = attrs.get('password')
        
        if email and password:
            # Email을 username으로 사용하여 인증 시도
            # (User model의 USERNAME_FIELD가 'username'이지만 create_user에서 username=email로 저장함)
            # authenticate는 username/password를 기대하므로 username 인자에 email을 전달 시도
            # 하지만 Django 기본 백엔드나 커스텀 백엔드 설정에 따라 다름.
            # 여기서는 User 모델을 직접 조회해서 username을 알아내거나 커스텀 백엔드 사용 권장.
            # 간단히 user 조회 후 username으로 authenticate 호출
            try:
                user_obj = User.objects.get(email=email)
                user = authenticate(username=user_obj.username, password=password)
            except User.DoesNotExist:
                user = None
                
            if not user:
                raise serializers.ValidationError('이메일 또는 비밀번호가 올바르지 않습니다.')
        else:
            raise serializers.ValidationError('이메일과 비밀번호를 모두 입력해주세요.')
            
        attrs['user'] = user
        return attrs


class GoogleLoginSerializer(serializers.Serializer):
    """Google(Firebase) 로그인 시리얼라이저"""
    id_token = serializers.CharField()


class GuardianRelationSerializer(serializers.ModelSerializer):
    """보호자 관계 시리얼라이저"""
    
    senior_name = serializers.CharField(source='senior.username', read_only=True)
    guardian_name = serializers.CharField(source='guardian.username', read_only=True)
    
    class Meta:
        model = GuardianRelation
        fields = ['id', 'senior', 'guardian', 'senior_name', 'guardian_name', 'is_primary', 'created_at']
        read_only_fields = ['id', 'created_at']


class EmergencyContactSerializer(serializers.ModelSerializer):
    """비상 연락처 시리얼라이저"""
    
    class Meta:
        model = EmergencyContact
        fields = [
            'id', 'name', 'relation', 'phone_number', 'email',
            'notify_by_email', 'is_primary', 'created_at', 'updated_at'
        ]
        read_only_fields = ['id', 'created_at', 'updated_at']
    
    def create(self, validated_data):
        validated_data['user'] = self.context['request'].user
        return super().create(validated_data)

