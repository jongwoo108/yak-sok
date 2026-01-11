/**
 * API 클라이언트 (React Native용)
 */

import axios, { AxiosInstance } from 'axios';
import * as SecureStore from 'expo-secure-store';
import { Platform } from 'react-native';
import type { User, Medication, MedicationLog, Alert, ApiResponse } from './types';

// 환경변수에서 API URL 가져오기
// 주의: 물리 기기(폰)에서 테스트하려면 아래 'YOUR_LOCAL_IP'를 컴퓨터의 IP 주소(예: 192.168.0.x)로 변경하고 주석을 해제하세요.
const MANUAL_IP = 'http://172.30.1.56:8000/api';

const API_BASE_URL =
    MANUAL_IP ||
    process.env.EXPO_PUBLIC_API_URL ||
    (Platform.OS === 'android' ? 'http://10.0.2.2:8000/api' : 'http://localhost:8000/api');

// Axios 인스턴스 생성
const apiClient: AxiosInstance = axios.create({
    baseURL: API_BASE_URL,
    headers: {
        'Content-Type': 'application/json',
    },
    timeout: 10000,
});

// 요청 인터셉터: 토큰 자동 첨부
apiClient.interceptors.request.use(
    async (config) => {
        const token = await SecureStore.getItemAsync('access_token');
        if (token) {
            config.headers.Authorization = `Bearer ${token}`;
        }
        return config;
    },
    (error) => Promise.reject(error)
);

// 응답 인터셉터: 토큰 갱신 처리
apiClient.interceptors.response.use(
    (response) => response,
    async (error) => {
        const originalRequest = error.config;

        if (error.response?.status === 401 && !originalRequest._retry) {
            originalRequest._retry = true;

            try {
                const refreshToken = await SecureStore.getItemAsync('refresh_token');
                if (refreshToken) {
                    const response = await axios.post(`${API_BASE_URL}/users/token-refresh/`, {
                        refresh: refreshToken,
                    });

                    const { access } = response.data;
                    await SecureStore.setItemAsync('access_token', access);

                    originalRequest.headers.Authorization = `Bearer ${access}`;
                    return apiClient(originalRequest);
                }
            } catch (refreshError) {
                await SecureStore.deleteItemAsync('access_token');
                await SecureStore.deleteItemAsync('refresh_token');
            }
        }

        return Promise.reject(error);
    }
);

// API 함수들
export const api = {
    // 인증
    auth: {
        // 내 정보 조회
        me: () => apiClient.get<User>('/users/me/'),

        // 이메일 로그인
        login: (data: any) =>
            apiClient.post<{ user: User; tokens: { access: string; refresh: string } }>(
                '/users/login/',
                data
            ),

        // 회원가입
        register: (data: any) =>
            apiClient.post<{ user: User; tokens: { access: string; refresh: string } }>(
                '/users/register/',
                data
            ),

        // 구글 로그인
        googleLogin: (idToken: string) =>
            apiClient.post<{ user: User; tokens: { access: string; refresh: string } }>(
                '/users/login/google/',
                { id_token: idToken }
            ),
    },

    // 복약
    medications: {
        list: () => apiClient.get<ApiResponse<Medication>>('/medications/'),
        get: (id: number) => apiClient.get<Medication>(`/medications/${id}/`),
        create: (data: Partial<Medication> & { schedules_input?: any[]; group_id?: number | null }) =>
            apiClient.post<Medication>('/medications/', data),
        update: (id: number, data: Partial<Medication>) =>
            apiClient.patch<Medication>(`/medications/${id}/`, data),
        delete: (id: number) => apiClient.delete(`/medications/${id}/`),
        scanPrescriptionBase64: (base64Image: string) =>
            apiClient.post('/medications/scan/', { image_base64: base64Image }, { timeout: 60000 }),
    },

    // 약품 그룹
    medicationGroups: {
        list: () => apiClient.get('/medications/groups/'),
        create: (data: { name: string }) => apiClient.post('/medications/groups/', data),
        delete: (id: number) => apiClient.delete(`/medications/groups/${id}/`),
    },

    // 복약 기록
    logs: {
        today: () => apiClient.get<ApiResponse<MedicationLog>>('/medications/logs/today/'),
        take: (logId: number) => apiClient.post(`/medications/logs/${logId}/take/`),
        batchTake: (logIds: number[]) =>
            apiClient.post('/medications/logs/batch-take/', { log_ids: logIds }),
    },

    // 알림
    alerts: {
        list: () => apiClient.get<ApiResponse<Alert>>('/alerts/'),
    },

    // FCM 토큰
    users: {
        updateFcmToken: (token: string) =>
            apiClient.patch('/users/update_fcm_token/', { fcm_token: token }),
        testPush: () => apiClient.post('/users/test-push/'),
    },
};

export { apiClient };
