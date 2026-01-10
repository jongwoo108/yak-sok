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

export default function RegisterScreen() {
    const router = useRouter();
    const [step, setStep] = useState(1);
    const [formData, setFormData] = useState({
        email: '',
        password: '',
        confirmPassword: '',
        firstName: '',
        role: '' as 'senior' | 'guardian' | '',
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
            // TODO: 실제 회원가입 API 연동
            Alert.alert('알림', '회원가입 기능은 아직 구현 중입니다.', [
                { text: '확인', onPress: () => router.replace('/(auth)/login') },
            ]);
        } catch (error) {
            Alert.alert('회원가입 실패', '다시 시도해주세요.');
        }
    };

    return (
        <KeyboardAvoidingView
            style={styles.container}
            behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
        >
            <ScrollView contentContainerStyle={styles.scrollContent}>
                <View style={styles.content}>
                    {/* 헤더 */}
                    <View style={styles.header}>
                        <TouchableOpacity
                            style={styles.backButton}
                            onPress={() => (step > 1 ? setStep(step - 1) : router.back())}
                        >
                            <Text style={styles.backButtonText}>← 뒤로</Text>
                        </TouchableOpacity>
                        <Text style={styles.stepIndicator}>
                            {step}/2
                        </Text>
                    </View>

                    <View style={styles.titleContainer}>
                        <Text style={styles.title}>회원가입</Text>
                        <Text style={styles.subtitle}>
                            {step === 1 ? '계정 정보를 입력해주세요' : '추가 정보를 입력해주세요'}
                        </Text>
                    </View>

                    {/* 폼 */}
                    <View style={styles.form}>
                        {step === 1 ? (
                            <>
                                <View style={styles.inputContainer}>
                                    <Text style={styles.inputLabel}>이메일</Text>
                                    <TextInput
                                        style={styles.input}
                                        placeholder="example@email.com"
                                        placeholderTextColor="#999"
                                        value={formData.email}
                                        onChangeText={(text) =>
                                            setFormData({ ...formData, email: text })
                                        }
                                        keyboardType="email-address"
                                        autoCapitalize="none"
                                    />
                                </View>

                                <View style={styles.inputContainer}>
                                    <Text style={styles.inputLabel}>비밀번호</Text>
                                    <TextInput
                                        style={styles.input}
                                        placeholder="8자 이상 입력"
                                        placeholderTextColor="#999"
                                        value={formData.password}
                                        onChangeText={(text) =>
                                            setFormData({ ...formData, password: text })
                                        }
                                        secureTextEntry
                                    />
                                </View>

                                <View style={styles.inputContainer}>
                                    <Text style={styles.inputLabel}>비밀번호 확인</Text>
                                    <TextInput
                                        style={styles.input}
                                        placeholder="비밀번호 재입력"
                                        placeholderTextColor="#999"
                                        value={formData.confirmPassword}
                                        onChangeText={(text) =>
                                            setFormData({ ...formData, confirmPassword: text })
                                        }
                                        secureTextEntry
                                    />
                                </View>
                            </>
                        ) : (
                            <>
                                <View style={styles.inputContainer}>
                                    <Text style={styles.inputLabel}>이름</Text>
                                    <TextInput
                                        style={styles.input}
                                        placeholder="이름을 입력해주세요"
                                        placeholderTextColor="#999"
                                        value={formData.firstName}
                                        onChangeText={(text) =>
                                            setFormData({ ...formData, firstName: text })
                                        }
                                    />
                                </View>

                                <View style={styles.inputContainer}>
                                    <Text style={styles.inputLabel}>사용자 유형</Text>
                                    <View style={styles.roleContainer}>
                                        <TouchableOpacity
                                            style={[
                                                styles.roleButton,
                                                formData.role === 'senior' && styles.roleButtonActive,
                                            ]}
                                            onPress={() =>
                                                setFormData({ ...formData, role: 'senior' })
                                            }
                                        >
                                            <Text style={styles.roleEmoji}>👴</Text>
                                            <Text
                                                style={[
                                                    styles.roleText,
                                                    formData.role === 'senior' && styles.roleTextActive,
                                                ]}
                                            >
                                                시니어
                                            </Text>
                                            <Text style={styles.roleDescription}>
                                                복약 관리를 받습니다
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
                                            <Text style={styles.roleEmoji}>👨‍👩‍👧</Text>
                                            <Text
                                                style={[
                                                    styles.roleText,
                                                    formData.role === 'guardian' && styles.roleTextActive,
                                                ]}
                                            >
                                                보호자
                                            </Text>
                                            <Text style={styles.roleDescription}>
                                                시니어를 관리합니다
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
            </ScrollView>
        </KeyboardAvoidingView>
    );
}

const styles = StyleSheet.create({
    container: {
        flex: 1,
        backgroundColor: '#F0F7F4',
    },
    scrollContent: {
        flexGrow: 1,
    },
    content: {
        flex: 1,
        padding: 24,
        paddingTop: 60,
    },
    header: {
        flexDirection: 'row',
        justifyContent: 'space-between',
        alignItems: 'center',
        marginBottom: 32,
    },
    backButton: {
        padding: 8,
    },
    backButtonText: {
        fontSize: 16,
        color: '#2D8B72',
        fontWeight: '600',
    },
    stepIndicator: {
        fontSize: 14,
        color: '#999',
        fontWeight: '600',
    },
    titleContainer: {
        marginBottom: 32,
    },
    title: {
        fontSize: 32,
        fontWeight: '800',
        color: '#333',
        marginBottom: 8,
    },
    subtitle: {
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
        marginBottom: 20,
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
    roleContainer: {
        flexDirection: 'row',
        gap: 12,
    },
    roleButton: {
        flex: 1,
        backgroundColor: '#F0F7F4',
        borderRadius: 16,
        padding: 16,
        alignItems: 'center',
        borderWidth: 2,
        borderColor: 'transparent',
    },
    roleButtonActive: {
        borderColor: '#2D8B72',
        backgroundColor: 'rgba(45, 139, 114, 0.1)',
    },
    roleEmoji: {
        fontSize: 32,
        marginBottom: 8,
    },
    roleText: {
        fontSize: 16,
        fontWeight: '700',
        color: '#333',
        marginBottom: 4,
    },
    roleTextActive: {
        color: '#2D8B72',
    },
    roleDescription: {
        fontSize: 12,
        color: '#999',
        textAlign: 'center',
    },
    nextButton: {
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
    nextButtonText: {
        fontSize: 18,
        fontWeight: '700',
        color: 'white',
    },
});
