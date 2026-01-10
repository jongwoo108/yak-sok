import { useState } from 'react';
import {
    View,
    Text,
    StyleSheet,
    TextInput,
    TouchableOpacity,
    KeyboardAvoidingView,
    Platform,
    Alert,
    ActivityIndicator,
} from 'react-native';
import { useRouter } from 'expo-router';
import * as SecureStore from 'expo-secure-store';
import { api } from '../../services/api';
import { useMedicationStore } from '../../services/store';

export default function LoginScreen() {
    const router = useRouter();
    const { setUser } = useMedicationStore();
    const [email, setEmail] = useState('');
    const [password, setPassword] = useState('');
    const [loading, setLoading] = useState(false);

    const handleLogin = async () => {
        if (!email || !password) {
            Alert.alert('입력 오류', '이메일과 비밀번호를 입력해주세요.');
            return;
        }

        setLoading(true);
        try {
            // 이메일/비밀번호 로그인 API 호출
            // TODO: 실제 로그인 API 연동
            Alert.alert('알림', '로그인 기능은 아직 구현 중입니다.\nGoogle 로그인을 이용해주세요.');
        } catch (error) {
            Alert.alert('로그인 실패', '이메일 또는 비밀번호를 확인해주세요.');
        } finally {
            setLoading(false);
        }
    };

    const handleGoogleLogin = async () => {
        setLoading(true);
        try {
            // TODO: Google 로그인 연동
            // 1. expo-auth-session으로 Google 로그인
            // 2. ID Token 획득
            // 3. 백엔드 google-login API 호출
            Alert.alert('알림', 'Google 로그인은 추후 구현 예정입니다.');
        } catch (error: any) {
            Alert.alert('로그인 실패', error.message || 'Google 로그인에 실패했습니다.');
        } finally {
            setLoading(false);
        }
    };

    const handleDemoLogin = async () => {
        // 개발용 데모 진입
        router.replace('/(tabs)');
    };

    return (
        <KeyboardAvoidingView
            style={styles.container}
            behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
        >
            <View style={styles.content}>
                {/* 로고 */}
                <View style={styles.logoContainer}>
                    <View style={styles.logo}>
                        <Text style={styles.logoEmoji}>💊</Text>
                    </View>
                    <Text style={styles.appName}>약속</Text>
                    <Text style={styles.appTagline}>시니어를 위한 복약 관리</Text>
                </View>

                {/* 입력 폼 */}
                <View style={styles.form}>
                    <View style={styles.inputContainer}>
                        <Text style={styles.inputLabel}>이메일</Text>
                        <TextInput
                            style={styles.input}
                            placeholder="example@email.com"
                            placeholderTextColor="#999"
                            value={email}
                            onChangeText={setEmail}
                            keyboardType="email-address"
                            autoCapitalize="none"
                            autoCorrect={false}
                        />
                    </View>

                    <View style={styles.inputContainer}>
                        <Text style={styles.inputLabel}>비밀번호</Text>
                        <TextInput
                            style={styles.input}
                            placeholder="비밀번호 입력"
                            placeholderTextColor="#999"
                            value={password}
                            onChangeText={setPassword}
                            secureTextEntry
                        />
                    </View>

                    <TouchableOpacity
                        style={styles.loginButton}
                        onPress={handleLogin}
                        disabled={loading}
                    >
                        {loading ? (
                            <ActivityIndicator color="white" />
                        ) : (
                            <Text style={styles.loginButtonText}>로그인</Text>
                        )}
                    </TouchableOpacity>
                </View>

                {/* 소셜 로그인 */}
                <View style={styles.divider}>
                    <View style={styles.dividerLine} />
                    <Text style={styles.dividerText}>또는</Text>
                    <View style={styles.dividerLine} />
                </View>

                <TouchableOpacity
                    style={styles.googleButton}
                    onPress={handleGoogleLogin}
                    disabled={loading}
                >
                    <Text style={styles.googleIcon}>G</Text>
                    <Text style={styles.googleButtonText}>Google로 로그인</Text>
                </TouchableOpacity>

                {/* 개발용 데모 버튼 */}
                <TouchableOpacity
                    style={styles.demoButton}
                    onPress={handleDemoLogin}
                >
                    <Text style={styles.demoButtonText}>🔓 데모 모드로 둘러보기</Text>
                </TouchableOpacity>

                {/* 회원가입 링크 */}
                <TouchableOpacity
                    style={styles.registerLink}
                    onPress={() => router.push('/(auth)/register')}
                >
                    <Text style={styles.registerText}>
                        계정이 없으신가요? <Text style={styles.registerHighlight}>회원가입</Text>
                    </Text>
                </TouchableOpacity>
            </View>
        </KeyboardAvoidingView>
    );
}

const styles = StyleSheet.create({
    container: {
        flex: 1,
        backgroundColor: '#F0F7F4',
    },
    content: {
        flex: 1,
        padding: 24,
        justifyContent: 'center',
    },
    logoContainer: {
        alignItems: 'center',
        marginBottom: 40,
    },
    logo: {
        width: 100,
        height: 100,
        borderRadius: 50,
        backgroundColor: '#2D8B72',
        alignItems: 'center',
        justifyContent: 'center',
        marginBottom: 16,
        shadowColor: '#2D8B72',
        shadowOffset: { width: 0, height: 12 },
        shadowOpacity: 0.4,
        shadowRadius: 20,
        elevation: 12,
    },
    logoEmoji: {
        fontSize: 48,
    },
    appName: {
        fontSize: 36,
        fontWeight: '800',
        color: '#333',
        marginBottom: 4,
    },
    appTagline: {
        fontSize: 16,
        color: '#666',
    },
    form: {
        backgroundColor: '#FFFDF5',
        borderRadius: 24,
        padding: 24,
        shadowColor: '#000',
        shadowOffset: { width: 0, height: 8 },
        shadowOpacity: 0.1,
        shadowRadius: 16,
        elevation: 8,
    },
    inputContainer: {
        marginBottom: 16,
    },
    inputLabel: {
        fontSize: 14,
        fontWeight: '600',
        color: '#333',
        marginBottom: 8,
    },
    input: {
        backgroundColor: '#F0F7F4',
        borderRadius: 12,
        paddingHorizontal: 16,
        paddingVertical: 14,
        fontSize: 16,
        color: '#333',
    },
    loginButton: {
        backgroundColor: '#2D8B72',
        borderRadius: 16,
        paddingVertical: 16,
        alignItems: 'center',
        marginTop: 8,
        shadowColor: '#2D8B72',
        shadowOffset: { width: 0, height: 4 },
        shadowOpacity: 0.3,
        shadowRadius: 8,
        elevation: 4,
    },
    loginButtonText: {
        fontSize: 18,
        fontWeight: '700',
        color: 'white',
    },
    divider: {
        flexDirection: 'row',
        alignItems: 'center',
        marginVertical: 24,
    },
    dividerLine: {
        flex: 1,
        height: 1,
        backgroundColor: '#DDD',
    },
    dividerText: {
        marginHorizontal: 16,
        fontSize: 14,
        color: '#999',
    },
    googleButton: {
        backgroundColor: '#FFFDF5',
        borderRadius: 16,
        paddingVertical: 16,
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'center',
        borderWidth: 2,
        borderColor: '#E8E4DC',
    },
    googleIcon: {
        fontSize: 20,
        fontWeight: '700',
        color: '#4285F4',
        marginRight: 12,
    },
    googleButtonText: {
        fontSize: 16,
        fontWeight: '600',
        color: '#333',
    },
    demoButton: {
        paddingVertical: 16,
        alignItems: 'center',
        marginTop: 12,
    },
    demoButtonText: {
        fontSize: 14,
        color: '#666',
    },
    registerLink: {
        alignItems: 'center',
        marginTop: 24,
    },
    registerText: {
        fontSize: 14,
        color: '#666',
    },
    registerHighlight: {
        color: '#2D8B72',
        fontWeight: '600',
    },
});
