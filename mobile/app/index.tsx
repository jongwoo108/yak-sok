import { useEffect, useState } from 'react';
import { Redirect } from 'expo-router';
import { View, ActivityIndicator, StyleSheet } from 'react-native';
import * as SecureStore from 'expo-secure-store';
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
            }
        };

        restoreAuth();
    }, []);

    // 로딩 중일 때 스플래시 화면 표시
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
