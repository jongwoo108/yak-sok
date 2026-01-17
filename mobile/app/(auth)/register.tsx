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
    ScrollView,
} from 'react-native';
import { useRouter } from 'expo-router';
import * as SecureStore from 'expo-secure-store';
import { Ionicons, FontAwesome5 } from '@expo/vector-icons';
import { api } from '../../services/api';
import { useMedicationStore } from '../../services/store';
import { GradientBackground } from '../../components/GradientBackground';
import { colors, spacing, borderRadius, fontSize, fontWeight, shadows } from '../../components/theme';

export default function RegisterScreen() {
    const router = useRouter();
    const { setUser } = useMedicationStore();
    const [step, setStep] = useState(1);
    const [formData, setFormData] = useState({
        email: '',
        password: '',
        confirmPassword: '',
        firstName: '',
        role: '' as 'patient' | 'senior' | 'guardian' | '',
        phoneNumber: '',
    });

    const handleNext = () => {
        if (step === 1) {
            if (!formData.email || !formData.password || !formData.confirmPassword) {
                Alert.alert('입력 오류', '모든 필드를 입력해주세요.');
                return;
            }
            if (formData.password !== formData.confirmPassword) {
                Alert.alert('입력 오류', '비밀번호가 일치하지 않습니다.');
                return;
            }
            setStep(2);
        } else if (step === 2) {
            if (!formData.firstName || !formData.role) {
                Alert.alert('입력 오류', '이름과 역할을 선택해주세요.');
                return;
            }
            handleRegister();
        }
    };

    const handleRegister = async () => {
        try {
            const response = await api.auth.register({
                email: formData.email,
                password: formData.password,
                first_name: formData.firstName,
                role: formData.role,
                phone_number: formData.phoneNumber,
                username: formData.email,
            });

            const { user, tokens } = response.data;

            await SecureStore.setItemAsync('access_token', tokens.access);
            await SecureStore.setItemAsync('refresh_token', tokens.refresh);

            setUser(user);

            Alert.alert('가입 완료', `${user.first_name}님 환영합니다!`, [
                { text: '시작하기', onPress: () => router.replace('/(tabs)') }
            ]);
        } catch (error: any) {
            console.error('Register error:', error.response?.data);
            // DRF validation error는 필드별로 에러를 반환
            const errorData = error.response?.data;
            let message = '회원가입에 실패했습니다. 다시 시도해주세요.';
            
            if (errorData) {
                if (errorData.email) {
                    message = errorData.email[0];
                } else if (errorData.password) {
                    message = errorData.password[0];
                } else if (errorData.first_name) {
                    message = errorData.first_name[0];
                } else if (errorData.non_field_errors) {
                    message = errorData.non_field_errors[0];
                } else if (typeof errorData === 'string') {
                    message = errorData;
                }
            }
            
            Alert.alert('회원가입 실패', message);
        }
    };

    return (
        <GradientBackground variant="ocean" style={styles.container}>
            <KeyboardAvoidingView
                style={styles.keyboardView}
                behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
            >
                <ScrollView contentContainerStyle={styles.scrollContent} showsVerticalScrollIndicator={false}>
                    <View style={styles.content}>
                        {/* 헤더 */}
                        <View style={styles.header}>
                            <TouchableOpacity
                                style={styles.backButton}
                                onPress={() => (step > 1 ? setStep(step - 1) : router.back())}
                            >
                                <Ionicons name="arrow-back" size={24} color={colors.primary} />
                            </TouchableOpacity>
                            <Text style={styles.stepIndicator}>
                                {step}/2 단계
                            </Text>
                        </View>

                        <View style={styles.titleContainer}>
                            <Text style={styles.title}>회원가입</Text>
                            <Text style={styles.subtitle}>
                                {step === 1 ? '계정 정보를 입력해주세요' : '추가 정보를 입력해주세요'}
                            </Text>
                        </View>

                        {/* 폼 카드 */}
                        <View style={styles.cardContainer}>
                            <View style={styles.shadowDark} />
                            <View style={styles.shadowLight} />
                            <View style={styles.cardSurface}>
                                {step === 1 ? (
                                    <>
                                        <View style={styles.inputContainer}>
                                            <Text style={styles.inputLabel}>이메일</Text>
                                            <View style={styles.inputWrapper}>
                                                <Ionicons name="mail-outline" size={20} color={colors.textLight} style={styles.inputIcon} />
                                                <TextInput
                                                    style={styles.input}
                                                    placeholder="example@email.com"
                                                    placeholderTextColor={colors.textLight}
                                                    value={formData.email}
                                                    onChangeText={(text) =>
                                                        setFormData({ ...formData, email: text })
                                                    }
                                                    keyboardType="email-address"
                                                    autoCapitalize="none"
                                                />
                                            </View>
                                        </View>

                                        <View style={styles.inputContainer}>
                                            <Text style={styles.inputLabel}>비밀번호</Text>
                                            <View style={styles.inputWrapper}>
                                                <Ionicons name="lock-closed-outline" size={20} color={colors.textLight} style={styles.inputIcon} />
                                                <TextInput
                                                    style={styles.input}
                                                    placeholder="8자 이상 입력"
                                                    placeholderTextColor={colors.textLight}
                                                    value={formData.password}
                                                    onChangeText={(text) =>
                                                        setFormData({ ...formData, password: text })
                                                    }
                                                    secureTextEntry
                                                />
                                            </View>
                                        </View>

                                        <View style={styles.inputContainer}>
                                            <Text style={styles.inputLabel}>비밀번호 확인</Text>
                                            <View style={styles.inputWrapper}>
                                                <Ionicons name="checkmark-circle-outline" size={20} color={colors.textLight} style={styles.inputIcon} />
                                                <TextInput
                                                    style={styles.input}
                                                    placeholder="비밀번호 재입력"
                                                    placeholderTextColor={colors.textLight}
                                                    value={formData.confirmPassword}
                                                    onChangeText={(text) =>
                                                        setFormData({ ...formData, confirmPassword: text })
                                                    }
                                                    secureTextEntry
                                                />
                                            </View>
                                        </View>
                                    </>
                                ) : (
                                    <>
                                        <View style={styles.inputContainer}>
                                            <Text style={styles.inputLabel}>이름</Text>
                                            <View style={styles.inputWrapper}>
                                                <Ionicons name="person-outline" size={20} color={colors.textLight} style={styles.inputIcon} />
                                                <TextInput
                                                    style={styles.input}
                                                    placeholder="이름을 입력해주세요"
                                                    placeholderTextColor={colors.textLight}
                                                    value={formData.firstName}
                                                    onChangeText={(text) =>
                                                        setFormData({ ...formData, firstName: text })
                                                    }
                                                />
                                            </View>
                                        </View>

                                        <View style={styles.inputContainer}>
                                            <Text style={styles.inputLabel}>사용자 유형</Text>
                                            <View style={styles.roleContainer}>
                                                <TouchableOpacity
                                                    style={[
                                                        styles.roleButton,
                                                        formData.role === 'patient' && styles.roleButtonActive,
                                                    ]}
                                                    onPress={() =>
                                                        setFormData({ ...formData, role: 'patient' })
                                                    }
                                                >
                                                    <View style={[
                                                        styles.roleIconCircle,
                                                        formData.role === 'patient' && styles.roleIconCircleActive
                                                    ]}>
                                                        <FontAwesome5
                                                            name="pills"
                                                            size={22}
                                                            color={formData.role === 'patient' ? colors.primary : colors.textLight}
                                                        />
                                                    </View>
                                                    <Text
                                                        style={[
                                                            styles.roleText,
                                                            formData.role === 'patient' && styles.roleTextActive,
                                                        ]}
                                                    >
                                                        복약자
                                                    </Text>
                                                    <Text style={styles.roleDescription}>
                                                        나의 약 관리
                                                    </Text>
                                                </TouchableOpacity>

                                                <TouchableOpacity
                                                    style={[
                                                        styles.roleButton,
                                                        formData.role === 'senior' && styles.roleButtonActive,
                                                    ]}
                                                    onPress={() =>
                                                        setFormData({ ...formData, role: 'senior' })
                                                    }
                                                >
                                                    <View style={[
                                                        styles.roleIconCircle,
                                                        formData.role === 'senior' && styles.roleIconCircleActive
                                                    ]}>
                                                        <FontAwesome5
                                                            name="user-alt"
                                                            size={22}
                                                            color={formData.role === 'senior' ? colors.primary : colors.textLight}
                                                        />
                                                    </View>
                                                    <Text
                                                        style={[
                                                            styles.roleText,
                                                            formData.role === 'senior' && styles.roleTextActive,
                                                        ]}
                                                    >
                                                        시니어
                                                    </Text>
                                                    <Text style={styles.roleDescription}>
                                                        보호자 연결
                                                    </Text>
                                                </TouchableOpacity>

                                                <TouchableOpacity
                                                    style={[
                                                        styles.roleButton,
                                                        formData.role === 'guardian' && styles.roleButtonActive,
                                                    ]}
                                                    onPress={() =>
                                                        setFormData({ ...formData, role: 'guardian' })
                                                    }
                                                >
                                                    <View style={[
                                                        styles.roleIconCircle,
                                                        formData.role === 'guardian' && styles.roleIconCircleActive
                                                    ]}>
                                                        <FontAwesome5
                                                            name="user-friends"
                                                            size={20}
                                                            color={formData.role === 'guardian' ? colors.primary : colors.textLight}
                                                        />
                                                    </View>
                                                    <Text
                                                        style={[
                                                            styles.roleText,
                                                            formData.role === 'guardian' && styles.roleTextActive,
                                                        ]}
                                                    >
                                                        보호자
                                                    </Text>
                                                    <Text style={styles.roleDescription}>
                                                        시니어 관리
                                                    </Text>
                                                </TouchableOpacity>
                                            </View>
                                        </View>
                                    </>
                                )}

                                <TouchableOpacity style={styles.nextButton} onPress={handleNext}>
                                    <Text style={styles.nextButtonText}>
                                        {step === 1 ? '다음' : '가입 완료'}
                                    </Text>
                                </TouchableOpacity>
                            </View>
                        </View>
                    </View>
                </ScrollView>
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
    scrollContent: {
        flexGrow: 1,
    },
    content: {
        flex: 1,
        padding: spacing.xl,
        paddingTop: Platform.OS === 'ios' ? 60 : 50,
    },
    header: {
        flexDirection: 'row',
        justifyContent: 'space-between',
        alignItems: 'center',
        marginBottom: spacing.xl,
    },
    backButton: {
        width: 40,
        height: 40,
        borderRadius: 20,
        backgroundColor: colors.base,
        alignItems: 'center',
        justifyContent: 'center',
        ...shadows.light, // Using simplistic shadow here for small button
    },
    stepIndicator: {
        fontSize: fontSize.sm,
        color: colors.textSecondary,
        fontWeight: fontWeight.bold,
    },
    titleContainer: {
        marginBottom: spacing.xl,
    },
    title: {
        fontSize: fontSize.xxxl,
        fontWeight: fontWeight.bold,
        color: colors.text,
        marginBottom: spacing.xs,
    },
    subtitle: {
        fontSize: fontSize.base,
        color: colors.textSecondary,
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
        borderRadius: borderRadius.lg,
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

    roleContainer: {
        flexDirection: 'row',
        gap: spacing.sm,
    },
    roleButton: {
        flex: 1,
        backgroundColor: colors.background,
        borderRadius: borderRadius.lg,
        padding: spacing.md,
        alignItems: 'center',
        borderWidth: 2,
        borderColor: 'transparent',
    },
    roleButtonActive: {
        borderColor: colors.primary,
        backgroundColor: 'rgba(45, 139, 114, 0.05)',
    },
    roleIconCircle: {
        width: 50,
        height: 50,
        borderRadius: 25,
        backgroundColor: colors.base,
        alignItems: 'center',
        justifyContent: 'center',
        marginBottom: spacing.sm,
        // Small neumorphism for these circles
        shadowColor: '#B8C4CE',
        shadowOffset: { width: 3, height: 3 },
        shadowOpacity: 0.3,
        shadowRadius: 5,
        elevation: 3,
    },
    roleIconCircleActive: {
        backgroundColor: colors.mintLight,
    },
    roleText: {
        fontSize: fontSize.sm,
        fontWeight: fontWeight.bold,
        color: colors.text,
        marginBottom: spacing.xxs,
    },
    roleTextActive: {
        color: colors.primary,
    },
    roleDescription: {
        fontSize: fontSize.xs,
        color: colors.textSecondary,
        textAlign: 'center',
    },
    nextButton: {
        backgroundColor: colors.primary,
        borderRadius: borderRadius.pill,
        paddingVertical: spacing.md,
        alignItems: 'center',
        marginTop: spacing.lg,
        ...shadows.mint,
    },
    nextButtonText: {
        fontSize: fontSize.lg,
        fontWeight: fontWeight.bold,
        color: colors.white,
    },
});
