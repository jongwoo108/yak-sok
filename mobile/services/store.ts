/**
 * Zustand 상태 관리 스토어 (React Native용)
 */

import { create } from 'zustand';
import * as SecureStore from 'expo-secure-store';
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
    logout: () => Promise<void>;

    fetchMedications: () => Promise<void>;
    deleteMedication: (id: number) => Promise<void>;
    deleteMedicationGroup: (id: number) => Promise<void>;
    fetchTodayLogs: () => Promise<void>;
    takeMedication: (logId: number) => Promise<void>;
    batchTakeMedications: (logIds: number[]) => Promise<void>;

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
            set({ user: null, isAuthenticated: false });
        } finally {
            set({ isLoading: false });
        }
    },

    logout: async () => {
        await SecureStore.deleteItemAsync('access_token');
        await SecureStore.deleteItemAsync('refresh_token');
        set({ user: null, isAuthenticated: false });
    },

    // 복약 액션
    fetchMedications: async () => {
        try {
            set({ isLoading: true, error: null });
            const response = await api.medications.list();
            set({ medications: response.data.results || [] });
        } catch (error) {
            set({ error: '약 목록을 불러올 수 없습니다.' });
        } finally {
            set({ isLoading: false });
        }
    },

    deleteMedication: async (id) => {
        try {
            set({ isLoading: true, error: null });
            await api.medications.delete(id);
            const currentMeds = get().medications;
            set({ medications: currentMeds.filter((med) => med.id !== id) });
        } catch (error) {
            set({ error: '약 삭제에 실패했습니다.' });
        } finally {
            set({ isLoading: false });
        }
    },

    deleteMedicationGroup: async (id: number) => {
        try {
            set({ isLoading: true, error: null });
            await api.medicationGroups.delete(id);
            const currentMeds = get().medications;
            // 해당 그룹의 약들을 제거
            set({ medications: currentMeds.filter((med) => med.group_id !== id) });
        } catch (error) {
            set({ error: '그룹 삭제에 실패했습니다.' });
        } finally {
            set({ isLoading: false });
        }
    },

    fetchTodayLogs: async () => {
        try {
            set({ isLoading: true, error: null });
            const response = await api.logs.today();
            set({ todayLogs: response.data.results || response.data || [] });
        } catch (error) {
            set({ error: '오늘의 복약 기록을 불러올 수 없습니다.' });
        } finally {
            set({ isLoading: false });
        }
    },

    takeMedication: async (logId) => {
        try {
            set({ error: null });
            await api.logs.take(logId);

            const logs = get().todayLogs.map((log) =>
                log.id === logId
                    ? { ...log, status: 'taken' as const, taken_datetime: new Date().toISOString() }
                    : log
            );
            set({ todayLogs: logs });
        } catch (error) {
            set({ error: '복용 기록에 실패했습니다.' });
        } finally {
            set({ isLoading: false });
        }
    },

    batchTakeMedications: async (logIds) => {
        try {
            set({ error: null });
            await api.logs.batchTake(logIds);

            const logs = get().todayLogs.map((log) =>
                logIds.includes(log.id)
                    ? { ...log, status: 'taken' as const, taken_datetime: new Date().toISOString() }
                    : log
            );
            set({ todayLogs: logs });
        } catch (error) {
            set({ error: '복용 기록에 실패했습니다.' });
        } finally {
            set({ isLoading: false });
        }
    },

    // 알림 액션
    fetchAlerts: async () => {
        try {
            set({ isLoading: true, error: null });
            const response = await api.alerts.list();
            set({ alerts: response.data.results || [] });
        } catch (error) {
            set({ error: '알림을 불러올 수 없습니다.' });
        } finally {
            set({ isLoading: false });
        }
    },

    clearError: () => set({ error: null }),
}));
