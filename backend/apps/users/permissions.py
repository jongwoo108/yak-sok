"""
Users Permissions - 프리미엄 사용자 권한 체크
"""

from rest_framework.permissions import BasePermission


class IsPremiumUser(BasePermission):
    """프리미엄 구독 사용자만 접근 가능"""
    message = '프리미엄 구독이 필요한 기능입니다.'

    def has_permission(self, request, view):
        return (
            request.user
            and request.user.is_authenticated
            and request.user.has_active_premium
        )
