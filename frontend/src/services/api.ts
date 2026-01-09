/**
 * API 클라이언트
 */

import axios from 'axios';

// 백엔드 직접 호출 (Next.js 프록시 우회)
export const API_BASE_URL = 'http://172.30.1.56:8000/api/'; // process.env.NEXT_PUBLIC_API_URL || 'http://localhost:8000/api/';

export const apiClient = axios.create({
    baseURL: API_BASE_URL,
    headers: {
        'Content-Type': 'application/json',
    },
});

// 요청 인터셉터: JWT 토큰 추가
apiClient.interceptors.request.use((config) => {
    const token = localStorage.getItem('access_token');
    if (token) {
        config.headers.Authorization = `Bearer ${token}`;
    }
    return config;
});

// 응답 인터셉터: 토큰 갱신 처리
apiClient.interceptors.response.use(
    (response) => response,
    async (error) => {
        const originalRequest = error.config;

        if (error.response?.status === 401 && !originalRequest._retry) {
            originalRequest._retry = true;

            try {
                const refreshToken = localStorage.getItem('refresh_token');
                if (refreshToken) {
                    const response = await axios.post(`${API_BASE_URL}token/refresh/`, {
                        refresh: refreshToken,
                    });

                    const { access } = response.data;
                    localStorage.setItem('access_token', access);

                    originalRequest.headers.Authorization = `Bearer ${access}`;
                    return apiClient(originalRequest);
                }
            } catch (refreshError) {
                // 리프레시 실패 시 로그아웃
                localStorage.removeItem('access_token');
                localStorage.removeItem('refresh_token');
                window.location.href = '/login';
            }
        }

        return Promise.reject(error);
    }
);

// API 함수들 
// 주의: path에 leading slash 없어야 함 (baseURL에 trailing slash 있음)
export const api = {
    // 인증
    auth: {
        login: (username: string, password: string) =>
            apiClient.post('token/', { username, password }),
        register: (data: any) =>
            apiClient.post('users/', data),
        me: () =>
            apiClient.get('users/me'),
    },

    // 복약
    medications: {
        list: () =>
            apiClient.get('medications/'),
        get: (id: number) =>
            apiClient.get(`medications/${id}`),
        create: (data: any) =>
            apiClient.post('medications/', data),
        update: (id: number, data: any) =>
            apiClient.patch(`medications/${id}`, data),
        delete: (id: number) =>
            apiClient.delete(`medications/${id}`),
        scanPrescription: (image: File) => {
            const formData = new FormData();
            formData.append('image', image);
            return apiClient.post('medications/scan_prescription', formData, {
                headers: { 'Content-Type': 'multipart/form-data' },
            });
        },
        voiceCommand: (audio: File) => {
            const formData = new FormData();
            formData.append('audio', audio);
            return apiClient.post('medications/voice_command', formData, {
                headers: { 'Content-Type': 'multipart/form-data' },
            });
        },
    },

    // 복약 기록
    logs: {
        today: () =>
            apiClient.get('medications/logs/today'),
        take: (id: number) =>
            apiClient.post(`medications/logs/${id}/take`),
    },

    // 알림
    alerts: {
        list: () =>
            apiClient.get('alerts/'),
        pending: () =>
            apiClient.get('alerts/pending'),
    },

    // 비상 연락처
    emergencyContacts: {
        list: () =>
            apiClient.get('alerts/emergency-contacts'),
        create: (data: any) =>
            apiClient.post('alerts/emergency-contacts', data),
        update: (id: number, data: any) =>
            apiClient.patch(`alerts/emergency-contacts/${id}`, data),
        delete: (id: number) =>
            apiClient.delete(`alerts/emergency-contacts/${id}`),
    },
};
