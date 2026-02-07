/**
 * API 클라이언트 (React Native용)
 */

import axios, { AxiosInstance } from 'axios';
import * as SecureStore from 'expo-secure-store';
import { Platform } from 'react-native';
import type { User, Medication, MedicationLog, Alert, ApiResponse, GuardianRelation, EmergencyContact, CalendarData, HealthProfile, CachedVideo, VideoBookmark } from './types';

// 환경변수에서 API URL 가져오기
// 프로덕션 서버 URL (AWS Lightsail + SSL)
const PRODUCTION_API_URL = 'https://yaksok-care.com/api';

// 로그아웃 상태 플래그 (토큰 갱신 방지용)
let isLoggingOut = false;
export const setLoggingOut = (value: boolean) => { isLoggingOut = value; };

// 개발 시 로컬 IP로 변경, 프로덕션은 위 URL 사용
const API_BASE_URL =
    PRODUCTION_API_URL ||
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

// 인증이 필요없는 엔드포인트 목록
const PUBLIC_ENDPOINTS = ['/users/login/', '/users/register/', '/users/login/google/'];

// 응답 인터셉터: 토큰 갱신 처리
apiClient.interceptors.response.use(
    (response) => response,
    async (error) => {
        const originalRequest = error.config;
        const requestUrl = originalRequest?.url || '';

        // 로그인/회원가입 등 공개 엔드포인트는 토큰 갱신 시도하지 않음
        const isPublicEndpoint = PUBLIC_ENDPOINTS.some(endpoint => requestUrl.includes(endpoint));

        // 401 에러이고 아직 재시도하지 않은 경우 (공개 엔드포인트 및 로그아웃 중 제외)
        if (error.response?.status === 401 && !originalRequest._retry && !isPublicEndpoint && !isLoggingOut) {
            originalRequest._retry = true;
            console.log('[API] 401 Unauthorized 감지 - 토큰 갱신 시도');

            try {
                const refreshToken = await SecureStore.getItemAsync('refresh_token');
                if (!refreshToken) {
                    // 로그아웃 후 정상 상태 - 조용히 reject
                    return Promise.reject(error);
                }

                // SimpleJWT 토큰 갱신 요청
                const response = await axios.post(`${API_BASE_URL}/token/refresh/`, {
                    refresh: refreshToken,
                });

                const { access, refresh } = response.data;
                console.log('[API] 토큰 갱신 성공');

                // 새 토큰 저장
                await SecureStore.setItemAsync('access_token', access);
                if (refresh) {
                    await SecureStore.setItemAsync('refresh_token', refresh);
                }

                // 기존 요청 재시도 (새 토큰 적용)
                originalRequest.headers = {
                    ...originalRequest.headers,
                    Authorization: `Bearer ${access}`,
                };

                return apiClient(originalRequest);
            } catch (refreshError) {
                // 토큰 갱신 실패 시 조용히 처리 (로그아웃 상태일 수 있음)
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
        googleLogin: (accessToken: string, userInfo: { email: string; name: string; id: string }) =>
            apiClient.post<{ user: User; tokens: { access: string; refresh: string } }>(
                '/users/login/google/',
                { access_token: accessToken, user_info: userInfo }
            ),

        // 이메일 중복 확인
        checkEmail: (email: string) =>
            apiClient.post<{ available: boolean; error?: string; message?: string }>(
                '/users/check-email/',
                { email }
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
        create: (data: { name: string; is_severe?: boolean }) =>
            apiClient.post('/medications/groups/', data),
        delete: (id: number) => apiClient.delete(`/medications/groups/${id}/`),
    },

    // 복약 스케줄
    schedules: {
        create: (data: { medication: number; time_of_day: string; scheduled_time: string }) =>
            apiClient.post('/medications/schedules/', data),
        update: (id: number, data: any) =>
            apiClient.patch(`/medications/schedules/${id}/`, data),
        delete: (id: number) => apiClient.delete(`/medications/schedules/${id}/`),
    },


    // 보호자 관계
    guardians: {
        list: () => apiClient.get<ApiResponse<GuardianRelation>>('/users/guardians/'),
        delete: (id: number) => apiClient.delete(`/users/guardians/${id}/`),
    },

    // 초대 코드
    invite: {
        get: () => apiClient.get<{ code: string | null; expires_at?: string }>('/users/invite/'),
        generate: () => apiClient.post<{
            success: boolean;
            invite: { code: string; expires_at: string };
            message: string
        }>('/users/invite/'),
        accept: (code: string) => apiClient.post<{
            success: boolean;
            message: string;
            relation?: any;
            error?: string;
        }>('/users/invite/accept/', { code }),
    },

    // 비상 연락처
    emergencyContacts: {
        list: () => apiClient.get<ApiResponse<EmergencyContact>>('/users/emergency-contacts/'),
        create: (data: Partial<EmergencyContact>) =>
            apiClient.post<EmergencyContact>('/users/emergency-contacts/', data),
        update: (id: number, data: Partial<EmergencyContact>) =>
            apiClient.patch<EmergencyContact>(`/users/emergency-contacts/${id}/`, data),
        delete: (id: number) => apiClient.delete(`/users/emergency-contacts/${id}/`),
    },

    // 복약 기록
    logs: {
        today: () => apiClient.get<ApiResponse<MedicationLog>>('/medications/logs/today/'),
        take: (logId: number) => apiClient.post(`/medications/logs/${logId}/take/`),
        batchTake: (logIds: number[]) =>
            apiClient.post('/medications/logs/batch-take/', { log_ids: logIds }),
        calendar: (year: number, month: number) =>
            apiClient.get<CalendarData>(`/medications/logs/calendar/?year=${year}&month=${month}`),
        byDate: (date: string) =>
            apiClient.get<MedicationLog[]>(`/medications/logs/by-date/?date=${date}`),
    },

    // 알림
    alerts: {
        list: () => apiClient.get<ApiResponse<Alert>>('/alerts/'),
        send: (data: {
            recipient_id: number;
            message_type: 'check_in' | 'reminder' | 'im_ok' | 'need_help' | 'custom';
            custom_message?: string;
        }) => apiClient.post<{ success: boolean; message: string; alert_id: number }>('/alerts/send/', data),
    },

    // 시니어 모니터링 (보호자용)
    seniors: {
        // 시니어의 오늘 복약 현황
        getToday: (seniorId: number) =>
            apiClient.get<{
                senior_id: number;
                senior_name: string;
                date: string;
                summary: { total: number; taken: number; pending: number };
                logs: MedicationLog[];
            }>(`/medications/senior/${seniorId}/today/`),

        // 시니어의 약 목록
        getMedications: (seniorId: number) =>
            apiClient.get<{
                senior_id: number;
                senior_name: string;
                count: number;
                medications: Medication[];
            }>(`/medications/senior/${seniorId}/medications/`),

        // 시니어의 캘린더 데이터
        getCalendar: (seniorId: number, year: number, month: number) =>
            apiClient.get<{
                senior_id: number;
                senior_name: string;
                year: number;
                month: number;
                daily_summary: Record<string, { total: number; taken: number; missed: number }>;
                hospital_visits: Array<{
                    date: string;
                    medication_id: number;
                    medication_name: string;
                    days_supply: number;
                }>;
            }>(`/medications/senior/${seniorId}/calendar/?year=${year}&month=${month}`),
    },

    // 건강 정보
    health: {
        getProfile: () => apiClient.get<HealthProfile>('/health/profile/'),
        refreshProfile: () => apiClient.post<{ status: string }>('/health/profile/refresh/'),
        getFeed: (params?: { category?: string; page?: number }) => {
            const searchParams = new URLSearchParams();
            if (params?.category) searchParams.append('category', params.category);
            if (params?.page) searchParams.append('page', String(params.page));
            const qs = searchParams.toString();
            return apiClient.get<ApiResponse<CachedVideo>>(`/health/feed/${qs ? '?' + qs : ''}`);
        },
        getVideo: (id: number) => apiClient.get<CachedVideo>(`/health/feed/${id}/`),
        getBookmarks: () => apiClient.get<ApiResponse<VideoBookmark>>('/health/bookmarks/'),
        addBookmark: (videoId: number) => apiClient.post<VideoBookmark>('/health/bookmarks/', { video: videoId }),
        removeBookmark: (id: number) => apiClient.delete(`/health/bookmarks/${id}/`),
    },

    // 사용자
    users: {
        // 정보 수정
        update: (id: number, data: Partial<User>) => apiClient.patch<User>(`/users/${id}/`, data),

        // FCM 토큰
        updateFcmToken: (token: string) =>
            apiClient.patch('/users/update_fcm_token/', { fcm_token: token }),
        testPush: () => apiClient.post('/users/test-push/'),
    },
};

export { apiClient };
