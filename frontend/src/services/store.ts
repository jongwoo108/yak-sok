/**
 * Zustand 상태 관리 스토어
 */

import { create } from 'zustand';
import { api } from './api';
import type { User, Medication, MedicationLog, Alert } from './types';

interface AppState {
    // 사용자
    user: User | null;
    isAuthenticated: boolean;

    // 복약
    medications: Medication[];
    todayLogs: MedicationLog[];

    // 알림
    alerts: Alert[];

    // 로딩 상태
    isLoading: boolean;
    error: string | null;

    // 액션
    setUser: (user: User | null) => void;
    fetchUser: () => Promise<void>;
    login: (credentials: { email: string; password?: string }) => Promise<void>;
    loginWithGoogle: () => Promise<void>;
    logout: () => void;


    fetchMedications: () => Promise<void>;
    fetchTodayLogs: () => Promise<void>;
    takeMedication: (logId: number) => Promise<void>;
    updateMedication: (id: number, data: any) => Promise<void>;
    deleteMedication: (id: number) => Promise<void>;

    fetchAlerts: () => Promise<void>;

    clearError: () => void;
}

export const useMedicationStore = create<AppState>((set, get) => ({
    // 초기 상태
    user: null,
    isAuthenticated: false,
    medications: [],
    todayLogs: [],
    alerts: [],
    isLoading: false,
    error: null,

    // 사용자 액션
    setUser: (user) => set({ user, isAuthenticated: !!user }),

    fetchUser: async () => {
        try {
            set({ isLoading: true, error: null });
            const response = await api.auth.me();
            set({ user: response.data, isAuthenticated: true });
        } catch (error) {
            // 토큰 만료 또는 비로그인 상태는 에러로 취급하지 않음 (조용히 실패)
            set({ user: null, isAuthenticated: false });
        } finally {
            set({ isLoading: false });
        }
    },

    login: async (credentials) => {
        try {
            set({ isLoading: true, error: null });
            const { user, tokens } = await import('./auth').then(m => m.authService.login(credentials));

            // 토큰 저장
            localStorage.setItem('access_token', tokens.access);
            localStorage.setItem('refresh_token', tokens.refresh);

            // API 헤더 설정 (axios interceptor가 처리하겠지만 명시적 호출 가능)

            set({ user, isAuthenticated: true });
        } catch (error: any) {
            const msg = error.response?.data?.non_field_errors?.[0] || '로그인에 실패했습니다.';
            set({ error: msg });
            throw error;
        } finally {
            set({ isLoading: false });
        }
    },

    loginWithGoogle: async () => {
        try {
            set({ isLoading: true, error: null });
            // 1. Firebase Google 로그인 -> ID Token 획득
            const { signInWithGoogle } = await import('./firebase');
            const idToken = await signInWithGoogle();

            // 2. 백엔드 로그인 -> JWT 토큰 획득
            const { authService } = await import('./auth');
            const { user, tokens } = await authService.googleLogin(idToken);

            // 3. 저장 및 상태 업데이트
            localStorage.setItem('access_token', tokens.access);
            localStorage.setItem('refresh_token', tokens.refresh);

            set({ user, isAuthenticated: true });
        } catch (error: any) {
            set({ error: 'Google 로그인에 실패했습니다.' });
            throw error;
        } finally {
            set({ isLoading: false });
        }
    },

    logout: () => {
        localStorage.removeItem('access_token');
        localStorage.removeItem('refresh_token');
        set({ user: null, isAuthenticated: false });
        // Optional: window.location.href = '/login';
    },

    // 복약 액션
    fetchMedications: async () => {
        try {
            set({ isLoading: true, error: null });
            const response = await api.medications.list();
            set({ medications: response.data.results || response.data });
        } catch (error) {
            set({ error: '약 목록을 불러올 수 없습니다.' });
        } finally {
            set({ isLoading: false });
        }
    },

    fetchTodayLogs: async () => {
        try {
            set({ isLoading: true, error: null });
            const response = await api.logs.today();
            set({ todayLogs: response.data.results || response.data });
        } catch (error) {
            set({ error: '오늘의 복약 기록을 불러올 수 없습니다.' });
            // 개발용 더미 데이터
            set({
                todayLogs: [
                    {
                        id: 1,
                        schedule: 1,
                        medication_name: '혈압약',
                        scheduled_datetime: new Date().toISOString(),
                        taken_datetime: null,
                        status: 'pending',
                        status_display: '대기 중',
                        notes: '',
                        created_at: new Date().toISOString(),
                        updated_at: new Date().toISOString(),
                    },
                    {
                        id: 2,
                        schedule: 2,
                        medication_name: '당뇨약',
                        scheduled_datetime: new Date(Date.now() + 3600000).toISOString(),
                        taken_datetime: null,
                        status: 'pending',
                        status_display: '대기 중',
                        notes: '',
                        created_at: new Date().toISOString(),
                        updated_at: new Date().toISOString(),
                    },
                ],
            });
        } finally {
            set({ isLoading: false });
        }
    },

    takeMedication: async (logId) => {
        try {
            set({ isLoading: true, error: null });
            await api.logs.take(logId);

            // 로컬 상태 업데이트
            const logs = get().todayLogs.map((log) =>
                log.id === logId
                    ? { ...log, status: 'taken' as const, taken_datetime: new Date().toISOString() }
                    : log
            );
            set({ todayLogs: logs });
        } catch (error) {
            // 개발용: API 실패해도 로컬 상태 업데이트
            const logs = get().todayLogs.map((log) =>
                log.id === logId
                    ? { ...log, status: 'taken' as const, taken_datetime: new Date().toISOString() }
                    : log
            );
            set({ todayLogs: logs });
        } finally {
            set({ isLoading: false });
        }
    },

    updateMedication: async (id, data) => {
        try {
            set({ isLoading: true, error: null });
            const response = await api.medications.update(id, data);

            // 로컬 상태 업데이트
            const updatedMedication = response.data;
            const meds = get().medications.map((med) =>
                med.id === id ? updatedMedication : med
            );
            set({ medications: meds });
        } catch (error) {
            set({ error: '약 정보를 수정할 수 없습니다.' });
            throw error;
        } finally {
            set({ isLoading: false });
        }
    },

    deleteMedication: async (id) => {
        try {
            set({ isLoading: true, error: null });
            await api.medications.delete(id);

            // 로컬 상태 업데이트
            const meds = get().medications.filter((med) => med.id !== id);
            set({ medications: meds });
        } catch (error) {
            set({ error: '약을 삭제할 수 없습니다.' });
            throw error;
        } finally {
            set({ isLoading: false });
        }
    },

    // 알림 액션
    fetchAlerts: async () => {
        try {
            set({ isLoading: true, error: null });
            const response = await api.alerts.list();
            set({ alerts: response.data.results || response.data });
        } catch (error) {
            set({ error: '알림을 불러올 수 없습니다.' });
        } finally {
            set({ isLoading: false });
        }
    },

    clearError: () => set({ error: null }),
}));
