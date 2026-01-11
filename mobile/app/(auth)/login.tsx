import { useState, useEffect } from 'react';
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
import { MaterialCommunityIcons, Ionicons } from '@expo/vector-icons';
import { api } from '../../services/api';
import { useMedicationStore } from '../../services/store';
import { GradientBackground } from '../../components/GradientBackground';
import { colors, spacing, borderRadius, fontSize, fontWeight, shadows } from '../../components/theme';

import * as WebBrowser from 'expo-web-browser';
import * as Google from 'expo-auth-session/providers/google';

WebBrowser.maybeCompleteAuthSession();

export default function LoginScreen() {
    const router = useRouter();
    const { setUser } = useMedicationStore();
    const [email, setEmail] = useState('');
    const [password, setPassword] = useState('');
    const [loading, setLoading] = useState(false);

    const [request, response, promptAsync] = Google.useAuthRequest({
        // TODO: Google Cloud Console에서 클라이언트 ID 발급 필요
        iosClientId: 'YOUR_IOS_CLIENT_ID',
        androidClientId: 'YOUR_ANDROID_CLIENT_ID',
        webClientId: 'YOUR_WEB_CLIENT_ID',
    });

    useEffect(() => {
        if (response?.type === 'success') {
            const { id_token } = response.params;
            handleGoogleLoginSuccess(id_token);
        }
    }, [response]);

    const handleGoogleLoginSuccess = async (idToken: string) => {
        setLoading(true);
        try {
            const res = await api.auth.googleLogin(idToken);
            const { user, tokens } = res.data;

            await SecureStore.setItemAsync('access_token', tokens.access);
            await SecureStore.setItemAsync('refresh_token', tokens.refresh);

            setUser(user);
            router.replace('/(tabs)');
        } catch (error: any) {
            Alert.alert('로그인 실패', 'Google 로그인 중 오류가 발생했습니다.');
        } finally {
            setLoading(false);
        }
    };

    const handleLogin = async () => {
        if (!email || !password) {
            Alert.alert('입력 오류', '이메일과 비밀번호를 입력해주세요.');
            return;
        }

        setLoading(true);
        try {
            // 이메일/비밀번호 로그인 API 호출
            const response = await api.auth.login({ email, password });
            const { user, tokens } = response.data;

            // 토큰 저장
            await SecureStore.setItemAsync('access_token', tokens.access);
            await SecureStore.setItemAsync('refresh_token', tokens.refresh);

            // 상태 업데이트 및 이동
            setUser(user);
            router.replace('/(tabs)');
        } catch (error: any) {
            console.error(error);
            const message = error.response?.data?.error || '이메일 또는 비밀번호를 확인해주세요.';
            Alert.alert('로그인 실패', message);
        } finally {
            setLoading(false);
        }
    };

    const handleGoogleLogin = () => {
        promptAsync();
    };

    const handleDemoLogin = async () => {
        // 개발용 데모 진입
        router.replace('/(tabs)');
    };

    return (
        <GradientBackground variant="ocean" style={styles.container}>
            <KeyboardAvoidingView
                style={styles.keyboardView}
                behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
            >
                <View style={styles.content}>
                    {/* 로고 */}
                    <View style={styles.logoContainer}>
                        <View style={styles.logoNeumorph}>
                            <View style={styles.logoInner}>
                                <MaterialCommunityIcons name="pill" size={48} color={colors.primary} />
                            </View>
                        </View>
                        <Text style={styles.appName}>약속</Text>
                        <Text style={styles.appTagline}>시니어를 위한 복약 관리</Text>
                    </View>

                    {/* 입력 폼 */}
                    <View style={styles.cardContainer}>
                        <View style={styles.shadowDark} />
                        <View style={styles.shadowLight} />
                        <View style={styles.cardSurface}>
                            <View style={styles.inputContainer}>
                                <Text style={styles.inputLabel}>이메일</Text>
                                <View style={styles.inputWrapper}>
                                    <Ionicons name="mail-outline" size={20} color={colors.textLight} style={styles.inputIcon} />
                                    <TextInput
                                        style={styles.input}
                                        placeholder="example@email.com"
                                        placeholderTextColor={colors.textLight}
                                        value={email}
                                        onChangeText={setEmail}
                                        keyboardType="email-address"
                                        autoCapitalize="none"
                                        autoCorrect={false}
                                    />
                                </View>
                            </View>

                            <View style={styles.inputContainer}>
                                <Text style={styles.inputLabel}>비밀번호</Text>
                                <View style={styles.inputWrapper}>
                                    <Ionicons name="lock-closed-outline" size={20} color={colors.textLight} style={styles.inputIcon} />
                                    <TextInput
                                        style={styles.input}
                                        placeholder="비밀번호 입력"
                                        placeholderTextColor={colors.textLight}
                                        value={password}
                                        onChangeText={setPassword}
                                        secureTextEntry
                                    />
                                </View>
                            </View>

                            <TouchableOpacity
                                style={styles.loginButton}
                                onPress={handleLogin}
                                disabled={loading}
                            >
                                {loading ? (
                                    <ActivityIndicator color={colors.white} />
                                ) : (
                                    <Text style={styles.loginButtonText}>로그인</Text>
                                )}
                            </TouchableOpacity>
                        </View>
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
                        <Ionicons name="logo-google" size={20} color={colors.text} style={styles.googleIcon} />
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
        </GradientBackground>
    );
}

const styles = StyleSheet.create({
    container: {
        flex: 1,
    },
    keyboardView: {
        flex: 1,
    },
    content: {
        flex: 1,
        padding: spacing.xl,
        justifyContent: 'center',
    },
    logoContainer: {
        alignItems: 'center',
        marginBottom: spacing.xxxl,
    },
    logoNeumorph: {
        width: 100,
        height: 100,
        borderRadius: 50,
        backgroundColor: colors.base,
        alignItems: 'center',
        justifyContent: 'center',
        marginBottom: spacing.lg,
        ...shadows.dark, // Using dark shadow from theme
        // Additional shadow for depth if needed
        shadowColor: '#B8C4CE',
        shadowOffset: { width: 8, height: 8 },
        shadowOpacity: 0.5,
        shadowRadius: 10,
        elevation: 10,
    },
    logoInner: {
        width: 100,
        height: 100,
        borderRadius: 50,
        backgroundColor: colors.base,
        alignItems: 'center',
        justifyContent: 'center',
        shadowColor: '#FFFFFF',
        shadowOffset: { width: -8, height: -8 },
        shadowOpacity: 1,
        shadowRadius: 10,
    },
    appName: {
        fontSize: fontSize.xxxxl,
        fontWeight: fontWeight.bold,
        color: colors.text,
        marginBottom: spacing.xs,
    },
    appTagline: {
        fontSize: fontSize.base,
        color: colors.textSecondary,
        fontWeight: fontWeight.medium,
    },

    // Neumorphic Card Styles
    cardContainer: {
        position: 'relative',
        marginBottom: spacing.xl,
    },
    shadowDark: {
        ...StyleSheet.absoluteFillObject,
        backgroundColor: colors.base,
        ...shadows.dark,
        borderRadius: borderRadius.xxl,
    },
    shadowLight: {
        ...StyleSheet.absoluteFillObject,
        backgroundColor: colors.base,
        ...shadows.light,
        borderRadius: borderRadius.xxl,
    },
    cardSurface: {
        backgroundColor: colors.base,
        borderRadius: borderRadius.xxl,
        padding: spacing.xl,
    },

    inputContainer: {
        marginBottom: spacing.lg,
    },
    inputLabel: {
        fontSize: fontSize.sm,
        fontWeight: fontWeight.semibold,
        color: colors.text,
        marginBottom: spacing.sm,
    },
    inputWrapper: {
        flexDirection: 'row',
        alignItems: 'center',
        backgroundColor: colors.background,
        borderRadius: borderRadius.lg, // Reduced radius for inner inputs
        borderWidth: 1,
        borderColor: 'rgba(0,0,0,0.05)',
        paddingHorizontal: spacing.md,
    },
    inputIcon: {
        marginRight: spacing.sm,
    },
    input: {
        flex: 1,
        paddingVertical: spacing.md,
        fontSize: fontSize.base,
        color: colors.text,
    },
    loginButton: {
        backgroundColor: colors.primary,
        borderRadius: borderRadius.pill,
        paddingVertical: spacing.md,
        alignItems: 'center',
        marginTop: spacing.sm,
        ...shadows.mint,
    },
    loginButtonText: {
        fontSize: fontSize.lg,
        fontWeight: fontWeight.bold,
        color: colors.white,
    },
    divider: {
        flexDirection: 'row',
        alignItems: 'center',
        marginVertical: spacing.xl,
    },
    dividerLine: {
        flex: 1,
        height: 1,
        backgroundColor: colors.textLight,
        opacity: 0.3,
    },
    dividerText: {
        marginHorizontal: spacing.lg,
        fontSize: fontSize.sm,
        color: colors.textLight,
    },
    googleButton: {
        backgroundColor: colors.base,
        borderRadius: borderRadius.pill, // Pill shape for social button
        paddingVertical: spacing.md,
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'center',
        // Simple neumorph button style
        shadowColor: '#B8C4CE',
        shadowOffset: { width: 3, height: 3 },
        shadowOpacity: 0.3,
        shadowRadius: 5,
        elevation: 3,
    },
    googleIcon: {
        marginRight: spacing.sm,
    },
    googleButtonText: {
        fontSize: fontSize.base,
        fontWeight: fontWeight.semibold,
        color: colors.text,
    },
    demoButton: {
        paddingVertical: spacing.lg,
        alignItems: 'center',
    },
    demoButtonText: {
        fontSize: fontSize.sm,
        color: colors.textSecondary,
    },
    registerLink: {
        alignItems: 'center',
        marginTop: spacing.md,
    },
    registerText: {
        fontSize: fontSize.base,
        color: colors.textSecondary,
    },
    registerHighlight: {
        color: colors.primary,
        fontWeight: fontWeight.bold,
    },
});
