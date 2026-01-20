import { useEffect, useState } from 'react';
import { Stack, useRouter, useSegments } from 'expo-router';
import { StatusBar } from 'expo-status-bar';
import { View, StyleSheet, ActivityIndicator } from 'react-native';
import * as SecureStore from 'expo-secure-store';
import { colors } from '../components/theme';
import { api } from '../services/api';

import { useMedicationStore } from '../services/store';

export default function RootLayout() {
    const router = useRouter();
    const segments = useSegments();
    const [isLoading, setIsLoading] = useState(true);
    const { setUser } = useMedicationStore();

    useEffect(() => {
        checkAuth();
    }, []);

    const checkAuth = async () => {
        try {
            const token = await SecureStore.getItemAsync('access_token');
            const inAuthGroup = segments[0] === '(auth)';

            if (!token && !inAuthGroup) {
                // 토큰 없음: 로그인 화면으로
                router.replace('/(auth)/login');
            } else if (token) {
                // 토큰 있음: 사용자 정보 가져오기 시도 (토큰 유효성 검증)
                try {
                    const response = await api.auth.me();
                    // 스토어에 사용자 정보 저장 (중요: 앱 재시작 시 상태 복원)
                    setUser(response.data);

                    // 알림 토큰 업데이트 (비동기, 실패해도 앱은 계속 작동)
                    try {
                        console.log('Attempting to update notification token...');
                        const { NotificationService } = require('../services/notification');
                        NotificationService.updateServerToken()
                            .then(() => console.log('Token update function called'))
                            .catch((e: any) => console.warn('Token update error:', e));
                    } catch (notifError) {
                        console.warn('Notification service initialization failed:', notifError);
                    }

                    // 성공하면 메인으로 (만약 로그인 화면에 있다면)
                    if (inAuthGroup) {
                        router.replace('/(tabs)');
                    }
                } catch (e) {
                    // 유효하지 않은 토큰: 로그아웃 처리
                    await SecureStore.deleteItemAsync('access_token');
                    await SecureStore.deleteItemAsync('refresh_token');
                    router.replace('/(auth)/login');
                }
            }
        } catch (e) {
            console.error('Auth Check Error', e);
        } finally {
            setIsLoading(false);
        }
    };

    if (isLoading) {
        return (
            <View style={[styles.container, styles.center]}>
                <ActivityIndicator size="large" color={colors.primary} />
            </View>
        );
    }

    return (
        <View style={styles.container}>
            <StatusBar style="dark" />
            <Stack
                screenOptions={{
                    headerShown: false,
                    contentStyle: { backgroundColor: colors.background },
                    animation: 'slide_from_right',
                }}
            >
                <Stack.Screen name="(tabs)" options={{ headerShown: false }} />
                <Stack.Screen name="(auth)" options={{ headerShown: false }} />
                <Stack.Screen name="medications/add" options={{ headerShown: false }} />
            </Stack>
        </View>
    );
}

const styles = StyleSheet.create({
    container: {
        flex: 1,
        backgroundColor: colors.background,
    },
    center: {
        justifyContent: 'center',
        alignItems: 'center',
    },
});
