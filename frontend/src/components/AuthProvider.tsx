'use client';

import { useEffect } from 'react';
import { useMedicationStore } from '@/services/store';

export default function AuthProvider({ children }: { children: React.ReactNode }) {
    const { fetchUser, isAuthenticated } = useMedicationStore();

    useEffect(() => {
        // 앱 초기화 시 사용자 정보 불러오기
        const initAuth = async () => {
            const token = localStorage.getItem('access_token');
            if (token && !isAuthenticated) {
                await fetchUser();
            }
        };
        initAuth();
    }, [fetchUser, isAuthenticated]);

    return <>{children}</>;
}
