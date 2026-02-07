import { useEffect, useState } from 'react';
import { Redirect } from 'expo-router';
import { View, ActivityIndicator, StyleSheet } from 'react-native';
import * as SecureStore from 'expo-secure-store';
import * as SplashScreen from 'expo-splash-screen';
import { useMedicationStore } from '../services/store';
import { api } from '../services/api';
import { colors } from '../components/theme';

type AuthState = 'loading' | 'authenticated' | 'unauthenticated';

export default function Index() {
    const [authState, setAuthState] = useState<AuthState>('loading');
    const { setUser } = useMedicationStore();

    useEffect(() => {
        const restoreAuth = async () => {
            try {
                // SecureStore에서 토큰 확인
                const token = await SecureStore.getItemAsync('access_token');
                
                if (token) {
                    // 토큰이 있으면 사용자 정보 가져오기
                    const response = await api.auth.me();
                    setUser(response.data);
                    setAuthState('authenticated');
                } else {
                    setAuthState('unauthenticated');
                }
            } catch (error) {
                // 토큰이 유효하지 않으면 삭제
                console.log('[Auth] Token restore failed:', error);
                await SecureStore.deleteItemAsync('access_token');
                await SecureStore.deleteItemAsync('refresh_token');
                setUser(null);
                setAuthState('unauthenticated');
            } finally {
                // 인증 확인 완료 후 스플래시 숨김
                await SplashScreen.hideAsync();
            }
        };

        restoreAuth();
    }, []);

    // 로딩 중일 때 (스플래시가 덮고 있으므로 빈 화면)
    if (authState === 'loading') {
        return (
            <View style={styles.container}>
                <ActivityIndicator size="large" color={colors.primary} />
            </View>
        );
    }

    return <Redirect href={authState === 'authenticated' ? '/(tabs)' : '/(auth)/login'} />;
}

const styles = StyleSheet.create({
    container: {
        flex: 1,
        justifyContent: 'center',
        alignItems: 'center',
        backgroundColor: colors.background,
    },
});
