import { useState } from 'react';
import { View, Text, StyleSheet, TextInput, Alert, TouchableOpacity } from 'react-native';
import { useRouter } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import { useMedicationStore } from '../../services/store';
import { api } from '../../services/api';
import { colors, spacing, borderRadius, fontSize, fontWeight, shadows } from '../../components/theme';
import { GradientBackground } from '../../components/GradientBackground';
import { NeumorphCard } from '../../components';

export default function ProfileEditScreen() {
    const router = useRouter();
    const { user, setUser } = useMedicationStore();

    // User role check is not strictly needed for rendering inputs, assuming both can edit phone/name
    const [firstName, setFirstName] = useState(user?.first_name || '');
    const [lastName, setLastName] = useState(user?.last_name || '');
    const [phoneNumber, setPhoneNumber] = useState(user?.phone_number || '');
    const [loading, setLoading] = useState(false);

    const handleSave = async () => {
        if (!user || !user.id) return;

        if (!firstName.trim()) {
            Alert.alert('오류', '이름을 입력해주세요.');
            return;
        }

        setLoading(true);
        try {
            const updatedData = {
                first_name: firstName,
                last_name: lastName,
                phone_number: phoneNumber
            };

            const response = await api.users.update(user.id, updatedData);

            // Update local store
            setUser({ ...user, ...response.data });

            Alert.alert('성공', '프로필이 수정되었습니다.', [
                { text: '확인', onPress: () => router.back() }
            ]);
        } catch (error: any) {
            console.error('Update profile error:', error);
            Alert.alert('실패', '프로필 수정 중 오류가 발생했습니다.');
        } finally {
            setLoading(false);
        }
    };

    return (
        <GradientBackground variant="ocean" style={styles.container}>
            {/* Header */}
            <View style={styles.header}>
                <TouchableOpacity onPress={() => router.back()} style={styles.backButton}>
                    <Ionicons name="arrow-back" size={24} color={colors.text} />
                </TouchableOpacity>
                <Text style={styles.headerTitle}>프로필 수정</Text>
                <View style={{ width: 24 }} />
            </View>

            <View style={styles.content}>
                <NeumorphCard style={styles.formCard}>
                    {/* First Name */}
                    <View style={styles.inputGroup}>
                        <Text style={styles.label}>이름</Text>
                        <TextInput
                            style={styles.input}
                            value={firstName}
                            onChangeText={setFirstName}
                            placeholder="이름을 입력하세요"
                            placeholderTextColor={colors.textLight}
                        />
                    </View>

                    {/* Last Name (Optional but good to have if model supports it) */}
                    <View style={styles.inputGroup}>
                        <Text style={styles.label}>성</Text>
                        <TextInput
                            style={styles.input}
                            value={lastName}
                            onChangeText={setLastName}
                            placeholder="성을 입력하세요"
                            placeholderTextColor={colors.textLight}
                        />
                    </View>

                    {/* Phone Number */}
                    <View style={styles.inputGroup}>
                        <Text style={styles.label}>전화번호</Text>
                        <TextInput
                            style={styles.input}
                            value={phoneNumber}
                            onChangeText={setPhoneNumber}
                            placeholder="010-0000-0000"
                            placeholderTextColor={colors.textLight}
                            keyboardType="phone-pad"
                        />
                    </View>

                    {/* Email (Read only) */}
                    <View style={styles.inputGroup}>
                        <Text style={styles.label}>이메일</Text>
                        <View style={[styles.input, styles.inputDisabled]}>
                            <Text style={{ color: colors.textSecondary }}>{user?.email}</Text>
                        </View>
                    </View>
                </NeumorphCard>

                <TouchableOpacity
                    style={styles.saveButton}
                    onPress={handleSave}
                    disabled={loading}
                >
                    <Text style={styles.saveButtonText}>
                        {loading ? '저장 중...' : '저장하기'}
                    </Text>
                </TouchableOpacity>
            </View>
        </GradientBackground>
    );
}

const styles = StyleSheet.create({
    container: {
        flex: 1,
    },
    header: {
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'space-between',
        paddingHorizontal: spacing.lg,
        paddingTop: 60,
        paddingBottom: spacing.lg,
    },
    backButton: {
        padding: spacing.xs,
    },
    headerTitle: {
        fontSize: fontSize.xl,
        fontWeight: fontWeight.bold,
        color: colors.text,
    },
    content: {
        flex: 1,
        padding: spacing.xl,
    },
    formCard: {
        padding: spacing.xl,
        marginBottom: spacing.xxl,
    },
    inputGroup: {
        marginBottom: spacing.lg,
    },
    label: {
        fontSize: fontSize.sm,
        color: colors.textSecondary,
        marginBottom: spacing.xs,
        fontWeight: fontWeight.medium,
    },
    input: {
        backgroundColor: colors.background,
        borderRadius: borderRadius.md,
        padding: spacing.md,
        fontSize: fontSize.base,
        color: colors.text,
        borderWidth: 1,
        borderColor: 'rgba(0,0,0,0.05)',
    },
    inputDisabled: {
        backgroundColor: colors.surface,
        borderColor: 'transparent',
    },
    saveButton: {
        backgroundColor: colors.primary,
        paddingVertical: spacing.lg,
        borderRadius: borderRadius.xl,
        alignItems: 'center',
        ...shadows.mint,
    },
    saveButtonText: {
        color: colors.white,
        fontSize: fontSize.lg,
        fontWeight: fontWeight.bold,
    },
});
