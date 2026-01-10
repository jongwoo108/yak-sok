/**
 * Auth Service
 * 로그인, 회원가입, 구글 로그인 API 호출
 */
import { apiClient } from '@/services/api';


// 타입 정의
interface LoginCredentials {
    email: string;
    password?: string;
}

interface RegisterData {
    email: string;
    password: string;
    password_confirm: string;
    first_name: string;
    last_name: string;
    role: 'senior' | 'guardian';
    phone_number?: string;
}

interface AuthResponse {
    user: any;
    tokens: {
        access: string;
        refresh: string;
    };
}

export const authService = {
    // 이메일 로그인
    login: async (credentials: LoginCredentials): Promise<AuthResponse> => {
        const response = await apiClient.post('/users/login/', credentials);
        return response.data;
    },

    // 회원가입
    register: async (data: RegisterData): Promise<AuthResponse> => {
        const response = await apiClient.post('/users/register/', data);
        return response.data;
    },

    // 구글 로그인 (ID Token 전송)
    googleLogin: async (idToken: string): Promise<AuthResponse> => {
        const response = await apiClient.post('/users/login/google/', { id_token: idToken });
        return response.data;
    },

    // 토큰 갱신 (Optional: api intercepter에서 처리하지만 수동 호출 필요 시)
    refreshToken: async (refresh: string) => {
        const response = await apiClient.post('/token/refresh/', { refresh });
        return response.data;
    }
};
