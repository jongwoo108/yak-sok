import { useState } from 'react';
import {
    View,
    Text,
    StyleSheet,
    TextInput,
    TouchableOpacity,
    ScrollView,
    Alert,
    ActivityIndicator,
    Platform,
} from 'react-native';
import { useRouter, Stack } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import { api } from '../../services/api';
import { useMedicationStore } from '../../services/store';
import { colors, spacing, borderRadius, fontSize, fontWeight, shadows } from '../../components/theme';
import { GradientBackground } from '../../components/GradientBackground';

const TIME_OPTIONS = [
    { key: 'morning', label: '아침', icon: 'sunny-outline', time: '08:00' },
    { key: 'noon', label: '점심', icon: 'sunny', time: '12:00' },
    { key: 'evening', label: '저녁', icon: 'partly-sunny-outline', time: '18:00' },
    { key: 'night', label: '밤', icon: 'moon-outline', time: '21:00' },
] as const;

// 뉴모피즘 카드 컴포넌트
const NeumorphCard = ({ children, style }: { children: React.ReactNode; style?: any }) => {
    const flatStyle = Array.isArray(style) ? Object.assign({}, ...style.filter(Boolean)) : (style || {});
    const { alignItems, justifyContent, paddingVertical, ...containerStyle } = flatStyle;
    const surfaceStyle = { alignItems, justifyContent, paddingVertical };

    return (
        <View style={[styles.neumorphContainer, containerStyle]}>
            <View style={[styles.shadowDark, { borderRadius: borderRadius.xl }]} />
            <View style={[styles.shadowLight, { borderRadius: borderRadius.xl }]} />
            <View style={[styles.cardSurface, surfaceStyle]}>
                {children}
            </View>
        </View>
    );
};

export default function AddMedicationScreen() {
    const router = useRouter();
    const { fetchMedications } = useMedicationStore();
    const [loading, setLoading] = useState(false);
    const [formData, setFormData] = useState({
        name: '',
        dosage: '',
        description: '',
        selectedTimes: [] as string[],
    });

    const toggleTime = (timeKey: string) => {
        setFormData((prev) => ({
            ...prev,
            selectedTimes: prev.selectedTimes.includes(timeKey)
                ? prev.selectedTimes.filter((t) => t !== timeKey)
                : [...prev.selectedTimes, timeKey],
        }));
    };

    const handleSubmit = async () => {
        if (!formData.name.trim()) {
            Alert.alert('입력 오류', '약 이름을 입력해주세요.');
            return;
        }
        if (formData.selectedTimes.length === 0) {
            Alert.alert('입력 오류', '최소 하나의 복용 시간을 선택해주세요.');
            return;
        }

        setLoading(true);
        try {
            const schedules = formData.selectedTimes.map(timeKey => {
                const option = TIME_OPTIONS.find(o => o.key === timeKey);
                return {
                    time_of_day: timeKey,
                    scheduled_time: option?.time || '08:00',
                };
            });

            await api.medications.create({
                name: formData.name,
                dosage: formData.dosage,
                description: formData.description,
                schedules_input: schedules,
            });

            await fetchMedications();
            router.back();
        } catch (error) {
            Alert.alert('오류', '약 추가에 실패했습니다.');
        } finally {
            setLoading(false);
        }
    };

    return (
        <GradientBackground variant="ocean" style={styles.container}>
            <Stack.Screen options={{ headerShown: false }} />

            <ScrollView style={styles.scrollView} contentContainerStyle={styles.content}>
                {/* 헤더 */}
                <View style={styles.header}>
                    <TouchableOpacity onPress={() => router.back()} style={styles.backButton}>
                        <Ionicons name="chevron-back" size={22} color={colors.text} />
                    </TouchableOpacity>
                    <View style={styles.headerTitleRow}>
                        <Ionicons name="add-circle" size={24} color={colors.primary} style={{ marginRight: 8 }} />
                        <Text style={styles.title}>약 추가</Text>
                    </View>
                    <View style={{ width: 44 }} />
                </View>

                {/* 약 정보 입력 */}
                <NeumorphCard style={styles.cardSpacing}>
                    <View style={styles.sectionHeader}>
                        <Ionicons name="medical" size={18} color={colors.primary} />
                        <Text style={styles.sectionTitle}>약 정보</Text>
                    </View>

                    <View style={styles.inputContainer}>
                        <Text style={styles.inputLabel}>약 이름 *</Text>
                        <View style={styles.inputWrapper}>
                            <TextInput
                                style={styles.input}
                                placeholder="예: 혈압약, 당뇨약"
                                placeholderTextColor={colors.textLight}
                                value={formData.name}
                                onChangeText={(text) => setFormData({ ...formData, name: text })}
                            />
                        </View>
                    </View>

                    <View style={styles.inputContainer}>
                        <Text style={styles.inputLabel}>복용량</Text>
                        <View style={styles.inputWrapper}>
                            <TextInput
                                style={styles.input}
                                placeholder="예: 1정, 2알"
                                placeholderTextColor={colors.textLight}
                                value={formData.dosage}
                                onChangeText={(text) => setFormData({ ...formData, dosage: text })}
                            />
                        </View>
                    </View>

                    <View style={styles.inputContainer}>
                        <Text style={styles.inputLabel}>메모</Text>
                        <View style={styles.inputWrapper}>
                            <TextInput
                                style={[styles.input, styles.textArea]}
                                placeholder="추가 메모 (선택)"
                                placeholderTextColor={colors.textLight}
                                value={formData.description}
                                onChangeText={(text) => setFormData({ ...formData, description: text })}
                                multiline
                                numberOfLines={3}
                            />
                        </View>
                    </View>
                </NeumorphCard>

                {/* 복용 시간 선택 */}
                <NeumorphCard style={styles.cardSpacing}>
                    <View style={styles.sectionHeader}>
                        <Ionicons name="time" size={18} color={colors.primary} />
                        <Text style={styles.sectionTitle}>복용 시간 선택 *</Text>
                    </View>
                    <Text style={styles.sectionSubtitle}>
                        하나 이상 선택해주세요
                    </Text>

                    <View style={styles.timeGrid}>
                        {TIME_OPTIONS.map((option) => {
                            const isActive = formData.selectedTimes.includes(option.key);
                            return (
                                <TouchableOpacity
                                    key={option.key}
                                    style={[
                                        styles.timeButton,
                                        isActive && styles.timeButtonActive,
                                    ]}
                                    onPress={() => toggleTime(option.key)}
                                    activeOpacity={0.7}
                                >
                                    <View style={[
                                        styles.timeIconCircle,
                                        isActive && styles.timeIconCircleActive,
                                    ]}>
                                        <Ionicons
                                            name={option.icon as any}
                                            size={24}
                                            color={isActive ? colors.white : colors.primary}
                                        />
                                    </View>
                                    <Text style={[
                                        styles.timeLabel,
                                        isActive && styles.timeLabelActive,
                                    ]}>
                                        {option.label}
                                    </Text>
                                    <Text style={styles.timeValue}>{option.time}</Text>
                                </TouchableOpacity>
                            );
                        })}
                    </View>
                </NeumorphCard>

                {/* 저장 버튼 */}
                <TouchableOpacity
                    style={[styles.submitButton, loading && styles.buttonDisabled]}
                    onPress={handleSubmit}
                    disabled={loading}
                    activeOpacity={0.8}
                >
                    {loading ? (
                        <ActivityIndicator color={colors.white} />
                    ) : (
                        <>
                            <Ionicons name="checkmark" size={22} color={colors.white} style={{ marginRight: 8 }} />
                            <Text style={styles.submitButtonText}>약 추가하기</Text>
                        </>
                    )}
                </TouchableOpacity>

                <View style={{ height: 100 }} />
            </ScrollView>
        </GradientBackground>
    );
}

const styles = StyleSheet.create({
    container: {
        flex: 1,
    },
    scrollView: {
        flex: 1,
    },
    content: {
        padding: spacing.xl,
        paddingTop: Platform.OS === 'ios' ? 60 : 50,
    },

    // 헤더
    header: {
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'space-between',
        marginBottom: spacing.xl,
    },
    headerTitleRow: {
        flexDirection: 'row',
        alignItems: 'center',
    },
    backButton: {
        width: 44,
        height: 44,
        borderRadius: 22,
        backgroundColor: colors.base,
        alignItems: 'center',
        justifyContent: 'center',
        ...shadows.dark,
    },
    title: {
        fontSize: fontSize.xl,
        fontWeight: fontWeight.bold,
        color: colors.text,
    },

    // 뉴모피즘 카드
    neumorphContainer: {
        position: 'relative',
        marginBottom: spacing.lg,
    },
    shadowDark: {
        ...StyleSheet.absoluteFillObject,
        backgroundColor: '#FFFFFF',  // 흰색 배경
        ...shadows.dark,
    },
    shadowLight: {
        ...StyleSheet.absoluteFillObject,
        backgroundColor: '#FFFFFF',  // 흰색 배경
        ...shadows.light,
    },
    cardSurface: {
        backgroundColor: '#FFFFFF',  // 흰색 배경
        borderRadius: borderRadius.xl,
        padding: spacing.lg,
    },
    cardSpacing: {
        marginBottom: spacing.lg,
    },

    // 섹션
    sectionHeader: {
        flexDirection: 'row',
        alignItems: 'center',
        gap: spacing.sm,
        marginBottom: spacing.md,
    },
    sectionTitle: {
        fontSize: fontSize.lg,
        fontWeight: fontWeight.bold,
        color: colors.text,
    },
    sectionSubtitle: {
        fontSize: fontSize.sm,
        color: colors.textSecondary,
        marginBottom: spacing.lg,
    },

    // 입력 필드
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
        backgroundColor: '#FFFFFF',  // 흰색 배경
        borderRadius: borderRadius.lg,
        borderWidth: 1,
        borderColor: 'rgba(184, 196, 206, 0.3)',
    },
    input: {
        paddingHorizontal: spacing.lg,
        paddingVertical: spacing.md,
        fontSize: fontSize.base,
        color: colors.text,
    },
    textArea: {
        minHeight: 80,
        textAlignVertical: 'top',
    },

    // 시간 그리드
    timeGrid: {
        flexDirection: 'row',
        flexWrap: 'wrap',
        gap: spacing.md,
    },
    timeButton: {
        width: '47%',
        backgroundColor: colors.baseLight,
        borderRadius: borderRadius.lg,
        padding: spacing.lg,
        alignItems: 'center',
        borderWidth: 2,
        borderColor: 'transparent',
    },
    timeButtonActive: {
        borderColor: colors.primary,
        backgroundColor: colors.mintLight,
    },
    timeIconCircle: {
        width: 48,
        height: 48,
        borderRadius: 24,
        backgroundColor: colors.mintLight,
        alignItems: 'center',
        justifyContent: 'center',
        marginBottom: spacing.sm,
    },
    timeIconCircleActive: {
        backgroundColor: colors.primary,
    },
    timeLabel: {
        fontSize: fontSize.base,
        fontWeight: fontWeight.bold,
        color: colors.text,
        marginBottom: spacing.xs,
    },
    timeLabelActive: {
        color: colors.primary,
    },
    timeValue: {
        fontSize: fontSize.sm,
        color: colors.textSecondary,
    },

    // 저장 버튼
    submitButton: {
        backgroundColor: colors.primary,
        borderRadius: borderRadius.pill,
        paddingVertical: spacing.lg,
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'center',
        ...shadows.dark,
    },
    buttonDisabled: {
        opacity: 0.5,
    },
    submitButtonText: {
        fontSize: fontSize.lg,
        fontWeight: fontWeight.bold,
        color: colors.white,
    },
});
