import { useState, useEffect } from 'react';
import {
    View,
    Text,
    StyleSheet,
    TextInput,
    TouchableOpacity,
    TouchableWithoutFeedback,
    Keyboard,
    KeyboardAvoidingView,
    Platform,
    Alert,
    ActivityIndicator,
} from 'react-native';
import { useRouter } from 'expo-router';
import * as SecureStore from 'expo-secure-store';
import { MaterialCommunityIcons, Ionicons } from '@expo/vector-icons';
import Constants from 'expo-constants';
import { api } from '../../services/api';
import { useMedicationStore } from '../../services/store';
import { NotificationService } from '../../services/notification';
import { GradientBackground } from '../../components/GradientBackground';
import { colors, spacing, borderRadius, fontSize, fontWeight, shadows } from '../../components/theme';

import * as WebBrowser from 'expo-web-browser';
import * as Google from 'expo-auth-session/providers/google';
import * as AuthSession from 'expo-auth-session';
import * as KakaoLogin from '@react-native-seoul/kakao-login';

WebBrowser.maybeCompleteAuthSession();

// 환경변수에서 Google 클라이언트 ID 가져오기
const googleClientIds = {
    iosClientId: Constants.expoConfig?.extra?.googleIosClientId,
    androidClientId: Constants.expoConfig?.extra?.googleAndroidClientId,
    webClientId: Constants.expoConfig?.extra?.googleWebClientId,
};

const hasGoogleClientId =
    !!googleClientIds.iosClientId ||
    !!googleClientIds.androidClientId ||
    !!googleClientIds.webClientId;

// 카카오 REST API 키
const kakaoRestApiKey = Constants.expoConfig?.extra?.kakaoRestApiKey;
const hasKakaoKey = !!kakaoRestApiKey;

function GoogleLoginButton({ onSuccess, disabled }: { onSuccess: (accessToken: string) => void; disabled: boolean }) {
    const [request, response, promptAsync] = Google.useAuthRequest({
        ...googleClientIds,
        scopes: ['openid', 'profile', 'email'],
    });

    useEffect(() => {
        if (response?.type === 'success') {
            const { authentication } = response;
            if (authentication?.accessToken) {
                onSuccess(authentication.accessToken);
            } else {
                Alert.alert('로그인 실패', 'Google 인증 토큰을 받지 못했습니다.');
            }
        } else if (response?.type === 'error') {
            Alert.alert('로그인 실패', response.error?.message || 'Google 로그인 중 오류가 발생했습니다.');
        }
    }, [response, onSuccess]);

    return (
        <TouchableOpacity
            style={styles.googleButton}
            onPress={() => promptAsync()}
            disabled={disabled || !request}
        >
            <Ionicons name="logo-google" size={20} color={colors.text} style={styles.googleIcon} />
            <Text style={styles.googleButtonText}>Google로 로그인</Text>
        </TouchableOpacity>
    );
}

// 카카오 로그인 버튼 (네이티브 SDK 사용)
function KakaoLoginButton({ onSuccess, disabled }: { onSuccess: (accessToken: string) => void; disabled: boolean }) {
    const [isLoggingIn, setIsLoggingIn] = useState(false);

    const handlePress = async () => {
        if (isLoggingIn) return;
        setIsLoggingIn(true);
        try {
            const result = await KakaoLogin.login();
            if (result.accessToken) {
                onSuccess(result.accessToken);
            } else {
                Alert.alert('로그인 실패', '카카오 인증 토큰을 받지 못했습니다.');
            }
        } catch (error: any) {
            console.error('Kakao login error:', error);
            // 사용자가 취소한 경우는 에러 메시지 표시 안함
            if (error.message?.includes('cancel') || error.code === 'E_CANCELLED_OPERATION') {
                return;
            }
            Alert.alert('로그인 실패', error.message || '카카오 로그인 중 오류가 발생했습니다.');
        } finally {
            setIsLoggingIn(false);
        }
    };

    return (
        <TouchableOpacity
            style={styles.kakaoButton}
            onPress={handlePress}
            disabled={disabled || isLoggingIn}
        >
            <Text style={styles.kakaoButtonText}>카카오로 로그인</Text>
        </TouchableOpacity>
    );
}

export default function LoginScreen() {
    const router = useRouter();
    const { setUser, resetStore } = useMedicationStore();
    const [email, setEmail] = useState('');
    const [password, setPassword] = useState('');
    const [loading, setLoading] = useState(false);

    const handleGoogleLoginSuccess = async (accessToken: string) => {
        setLoading(true);
        try {
            // accessToken으로 Google 사용자 정보 가져오기
            const userInfoResponse = await fetch('https://www.googleapis.com/userinfo/v2/me', {
                headers: { Authorization: `Bearer ${accessToken}` },
            });
            const userInfo = await userInfoResponse.json();

            // 백엔드에 Google 사용자 정보 전달
            const res = await api.auth.googleLogin(accessToken, userInfo);
            const { user, tokens } = res.data;

            await SecureStore.setItemAsync('access_token', tokens.access);
            await SecureStore.setItemAsync('refresh_token', tokens.refresh);

            resetStore(); // 이전 사용자 데이터 초기화
            setUser(user);
            await NotificationService.updateServerToken(); // FCM 토큰 서버에 전송
            router.replace('/(tabs)');
        } catch (error: any) {
            console.error('Google login error:', error);
            Alert.alert('로그인 실패', 'Google 로그인 중 오류가 발생했습니다.');
        } finally {
            setLoading(false);
        }
    };

    // 카카오 로그인 성공 핸들러
    const handleKakaoLoginSuccess = async (accessToken: string) => {
        setLoading(true);
        try {
            const res = await api.auth.kakaoLogin(accessToken);
            const { user, tokens } = res.data;

            await SecureStore.setItemAsync('access_token', tokens.access);
            await SecureStore.setItemAsync('refresh_token', tokens.refresh);

            resetStore();
            setUser(user);
            await NotificationService.updateServerToken();
            router.replace('/(tabs)');
        } catch (error: any) {
            console.error('Kakao login error:', error);
            const message = error.response?.data?.error || '카카오 로그인 중 오류가 발생했습니다.';
            Alert.alert('로그인 실패', message);
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
            await NotificationService.updateServerToken(); // FCM 토큰 서버에 전송
            router.replace('/(tabs)');
        } catch (error: any) {
            console.error(error);
            const message = error.response?.data?.error || '이메일 또는 비밀번호를 확인해주세요.';
            Alert.alert('로그인 실패', message);
        } finally {
            setLoading(false);
        }
    };

    return (
        <GradientBackground variant="ocean" style={styles.container}>
            <TouchableWithoutFeedback onPress={Keyboard.dismiss} accessible={false}>
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

                        {hasGoogleClientId ? (
                            <GoogleLoginButton
                                onSuccess={handleGoogleLoginSuccess}
                                disabled={loading}
                            />
                        ) : (
                            <Text style={styles.googleDisabledText}>Google 로그인은 현재 비활성화되어 있습니다.</Text>
                        )}

                        {hasKakaoKey && (
                            <KakaoLoginButton
                                onSuccess={handleKakaoLoginSuccess}
                                disabled={loading}
                            />
                        )}



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
            </TouchableWithoutFeedback>
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
        fontSize: fontSize.xl,
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
        letterSpacing: 0,
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
        backgroundColor: '#FFFFFF',
        borderRadius: borderRadius.pill,
        paddingVertical: spacing.md,
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'center',
        borderWidth: 1,
        borderColor: '#DADCE0',
        shadowColor: '#000',
        shadowOffset: { width: 0, height: 1 },
        shadowOpacity: 0.1,
        shadowRadius: 2,
        elevation: 2,
    },
    googleIcon: {
        marginRight: spacing.sm,
    },
    googleButtonText: {
        fontSize: fontSize.base,
        fontWeight: fontWeight.semibold,
        color: '#3C4043',
    },
    googleDisabledText: {
        textAlign: 'center',
        fontSize: fontSize.sm,
        color: colors.textLight,
    },
    kakaoButton: {
        backgroundColor: '#F5E6A3',  // 부드러운 파스텔 옐로우 (테마에 맞춤)
        borderRadius: borderRadius.pill,
        paddingVertical: spacing.md,
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'center',
        marginTop: spacing.md,
        shadowColor: '#C4B882',
        shadowOffset: { width: 2, height: 2 },
        shadowOpacity: 0.3,
        shadowRadius: 4,
        elevation: 3,
    },
    kakaoButtonText: {
        fontSize: fontSize.base,
        fontWeight: fontWeight.semibold,
        color: '#5C4E00',  // 어두운 골드 톤
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
