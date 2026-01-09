"""
Users Serializers
"""

from rest_framework import serializers
from django.contrib.auth import get_user_model
from .models import GuardianRelation

User = get_user_model()


class UserSerializer(serializers.ModelSerializer):
    """사용자 기본 시리얼라이저"""
    
    class Meta:
        model = User
        fields = [
            'id', 'username', 'email', 'first_name', 'last_name',
            'role', 'phone_number', 'emergency_contact'
        ]
        read_only_fields = ['id']


class UserCreateSerializer(serializers.ModelSerializer):
    """사용자 생성 시리얼라이저"""
    
    password = serializers.CharField(write_only=True, min_length=8)
    password_confirm = serializers.CharField(write_only=True)
    
    class Meta:
        model = User
        fields = [
            'username', 'email', 'password', 'password_confirm',
            'first_name', 'last_name', 'role', 'phone_number'
        ]
    
    def validate(self, attrs):
        if attrs['password'] != attrs.pop('password_confirm'):
            raise serializers.ValidationError({'password_confirm': '비밀번호가 일치하지 않습니다.'})
        return attrs
    
    def create(self, validated_data):
        password = validated_data.pop('password')
        user = User(**validated_data)
        user.set_password(password)
        user.save()
        return user


class GuardianRelationSerializer(serializers.ModelSerializer):
    """보호자 관계 시리얼라이저"""
    
    senior_name = serializers.CharField(source='senior.username', read_only=True)
    guardian_name = serializers.CharField(source='guardian.username', read_only=True)
    
    class Meta:
        model = GuardianRelation
        fields = ['id', 'senior', 'guardian', 'senior_name', 'guardian_name', 'is_primary', 'created_at']
        read_only_fields = ['id', 'created_at']
