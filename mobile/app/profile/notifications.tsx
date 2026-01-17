/**
 * NotificationSettingsScreen - 알림 시간 설정 화면
 * 아침/점심/저녁/취침전 기본 알림 시간을 설정
 */

import { useState, useEffect } from 'react';
import {
    View,
    Text,
    StyleSheet,
    ScrollView,
    TouchableOpacity,
    Platform,
    Alert,
    Modal,
} from 'react-native';
import { useRouter } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import AsyncStorage from '@react-native-async-storage/async-storage';
import DateTimePicker from '@react-native-community/datetimepicker';
import { colors, spacing, borderRadius, fontSize, fontWeight, shadows } from '../../components/theme';
import { GradientBackground } from '../../components/GradientBackground';
import { NeumorphCard } from '../../components';

const STORAGE_KEY = 'notification_time_settings';

interface TimeSettings {
    morning: string;
    noon: string;
    evening: string;
    night: string;
}

const DEFAULT_TIMES: TimeSettings = {
    morning: '08:00',
    noon: '12:00',
    evening: '18:00',
    night: '22:00',
};

const TIME_LABELS: { [key: string]: { label: string; icon: string } } = {
    morning: { label: '아침', icon: 'sunny' },
    noon: { label: '점심', icon: 'partly-sunny' },
    evening: { label: '저녁', icon: 'moon' },
    night: { label: '취침 전', icon: 'bed' },
};

// 시간 문자열을 Date 객체로 변환
const timeStringToDate = (timeStr: string): Date => {
    const [hours, minutes] = timeStr.split(':').map(Number);
    const date = new Date();
    date.setHours(hours, minutes, 0, 0);
    return date;
};

// Date 객체를 시간 문자열로 변환
const dateToTimeString = (date: Date): string => {
    const hours = date.getHours().toString().padStart(2, '0');
    const minutes = date.getMinutes().toString().padStart(2, '0');
    return `${hours}:${minutes}`;
};

export default function NotificationSettingsScreen() {
    const router = useRouter();
    const [times, setTimes] = useState<TimeSettings>(DEFAULT_TIMES);
    const [showPicker, setShowPicker] = useState(false);
    const [editingKey, setEditingKey] = useState<keyof TimeSettings | null>(null);
    const [pickerDate, setPickerDate] = useState(new Date());
    const [hasChanges, setHasChanges] = useState(false);

    // 저장된 설정 로드
    useEffect(() => {
        const loadSettings = async () => {
            try {
                const stored = await AsyncStorage.getItem(STORAGE_KEY);
                if (stored) {
                    setTimes(JSON.parse(stored));
                }
            } catch (error) {
                console.error('Failed to load notification settings:', error);
            }
        };
        loadSettings();
    }, []);

    // 시간 편집 시작
    const openTimePicker = (key: keyof TimeSettings) => {
        setEditingKey(key);
        setPickerDate(timeStringToDate(times[key]));
        setShowPicker(true);
    };

    // 시간 선택 완료
    const handleTimeChange = (event: any, selectedDate?: Date) => {
        if (Platform.OS === 'android') {
            setShowPicker(false);
        }

        if (selectedDate && editingKey) {
            const newTime = dateToTimeString(selectedDate);
            setTimes((prev) => ({
                ...prev,
                [editingKey]: newTime,
            }));
            setHasChanges(true);
            setPickerDate(selectedDate);
        }
    };

    // iOS용 피커 확인
    const confirmIOSPicker = () => {
        setShowPicker(false);
        setEditingKey(null);
    };

    // 설정 저장
    const saveSettings = async () => {
        try {
            await AsyncStorage.setItem(STORAGE_KEY, JSON.stringify(times));
            setHasChanges(false);
            Alert.alert('저장 완료', '알림 시간 설정이 저장되었습니다.');
        } catch (error) {
            Alert.alert('오류', '설정 저장에 실패했습니다.');
        }
    };

    // 기본값으로 초기화
    const resetToDefaults = () => {
        Alert.alert(
            '초기화',
            '기본 시간으로 초기화하시겠습니까?',
            [
                { text: '취소', style: 'cancel' },
                {
                    text: '초기화',
                    onPress: () => {
                        setTimes(DEFAULT_TIMES);
                        setHasChanges(true);
                    },
                },
            ]
        );
    };

    return (
        <GradientBackground variant="ocean" style={styles.container}>
            <ScrollView
                style={styles.scrollView}
                contentContainerStyle={styles.content}
                showsVerticalScrollIndicator={false}
            >
                {/* 헤더 */}
                <View style={styles.header}>
                    <TouchableOpacity onPress={() => router.back()} style={styles.backButton}>
                        <Ionicons name="chevron-back" size={22} color={colors.text} />
                    </TouchableOpacity>
                    <Text style={styles.headerTitle}>알림 시간 설정</Text>
                    <TouchableOpacity onPress={resetToDefaults} style={styles.resetButton}>
                        <Ionicons name="refresh" size={20} color={colors.textSecondary} />
                    </TouchableOpacity>
                </View>

                {/* 안내 문구 */}
                <NeumorphCard style={styles.infoCard}>
                    <Ionicons name="information-circle" size={20} color={colors.primary} />
                    <Text style={styles.infoText}>
                        새로운 약을 등록할 때 사용되는 기본 알림 시간입니다.
                    </Text>
                </NeumorphCard>

                {/* 시간 설정 목록 */}
                <NeumorphCard style={styles.settingsCard}>
                    {Object.entries(TIME_LABELS).map(([key, { label, icon }]) => (
                        <TouchableOpacity
                            key={key}
                            style={styles.timeRow}
                            onPress={() => openTimePicker(key as keyof TimeSettings)}
                            activeOpacity={0.7}
                        >
                            <View style={styles.timeInfo}>
                                <View style={styles.iconCircle}>
                                    <Ionicons name={icon as any} size={18} color={colors.primary} />
                                </View>
                                <Text style={styles.timeLabel}>{label}</Text>
                            </View>
                            <View style={styles.timeValueContainer}>
                                <Text style={styles.timeValue}>{times[key as keyof TimeSettings]}</Text>
                                <Ionicons name="chevron-forward" size={18} color={colors.textLight} />
                            </View>
                        </TouchableOpacity>
                    ))}
                </NeumorphCard>

                {/* 저장 버튼 */}
                <TouchableOpacity
                    style={[styles.saveButton, !hasChanges && styles.saveButtonDisabled]}
                    onPress={saveSettings}
                    disabled={!hasChanges}
                >
                    <Text style={styles.saveButtonText}>저장</Text>
                </TouchableOpacity>
            </ScrollView>

            {/* iOS용 모달 피커 */}
            {Platform.OS === 'ios' && showPicker && (
                <Modal
                    visible={showPicker}
                    transparent={true}
                    animationType="slide"
                >
                    <View style={styles.pickerModal}>
                        <View style={styles.pickerContainer}>
                            <View style={styles.pickerHeader}>
                                <TouchableOpacity onPress={() => setShowPicker(false)}>
                                    <Text style={styles.pickerCancel}>취소</Text>
                                </TouchableOpacity>
                                <Text style={styles.pickerTitle}>
                                    {editingKey ? TIME_LABELS[editingKey].label : ''} 시간
                                </Text>
                                <TouchableOpacity onPress={confirmIOSPicker}>
                                    <Text style={styles.pickerDone}>확인</Text>
                                </TouchableOpacity>
                            </View>
                            <DateTimePicker
                                value={pickerDate}
                                mode="time"
                                display="spinner"
                                onChange={handleTimeChange}
                                style={styles.picker}
                                textColor={colors.text}
                            />
                        </View>
                    </View>
                </Modal>
            )}

            {/* Android용 피커 */}
            {Platform.OS === 'android' && showPicker && (
                <DateTimePicker
                    value={pickerDate}
                    mode="time"
                    is24Hour={true}
                    display="default"
                    onChange={handleTimeChange}
                />
            )}
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
    backButton: {
        width: 44,
        height: 44,
        borderRadius: 22,
        backgroundColor: colors.base,
        alignItems: 'center',
        justifyContent: 'center',
        ...shadows.soft,
    },
    headerTitle: {
        fontSize: fontSize.xl,
        fontWeight: fontWeight.bold,
        color: colors.text,
    },
    resetButton: {
        width: 44,
        height: 44,
        borderRadius: 22,
        backgroundColor: colors.base,
        alignItems: 'center',
        justifyContent: 'center',
        ...shadows.soft,
    },

    // 안내 카드
    infoCard: {
        flexDirection: 'row',
        alignItems: 'center',
        gap: spacing.sm,
        marginBottom: spacing.lg,
    },
    infoText: {
        flex: 1,
        fontSize: fontSize.sm,
        color: colors.textSecondary,
    },

    // 설정 카드
    settingsCard: {
        marginBottom: spacing.xl,
    },
    timeRow: {
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'space-between',
        paddingVertical: spacing.lg,
        borderBottomWidth: 1,
        borderBottomColor: 'rgba(184, 196, 206, 0.2)',
    },
    timeInfo: {
        flexDirection: 'row',
        alignItems: 'center',
    },
    iconCircle: {
        width: 36,
        height: 36,
        borderRadius: 18,
        backgroundColor: colors.mintLight,
        alignItems: 'center',
        justifyContent: 'center',
        marginRight: spacing.md,
    },
    timeLabel: {
        fontSize: fontSize.base,
        fontWeight: fontWeight.medium,
        color: colors.text,
    },
    timeValueContainer: {
        flexDirection: 'row',
        alignItems: 'center',
        gap: spacing.xs,
    },
    timeValue: {
        fontSize: fontSize.lg,
        fontWeight: fontWeight.semibold,
        color: colors.primary,
    },

    // 저장 버튼
    saveButton: {
        backgroundColor: colors.primary,
        borderRadius: borderRadius.pill,
        paddingVertical: spacing.lg,
        alignItems: 'center',
        justifyContent: 'center',
    },
    saveButtonDisabled: {
        opacity: 0.5,
    },
    saveButtonText: {
        fontSize: fontSize.base,
        fontWeight: fontWeight.bold,
        color: colors.white,
    },

    // iOS 피커 모달
    pickerModal: {
        flex: 1,
        justifyContent: 'flex-end',
        backgroundColor: 'rgba(0, 0, 0, 0.5)',
    },
    pickerContainer: {
        backgroundColor: colors.white,
        borderTopLeftRadius: borderRadius.xxl,
        borderTopRightRadius: borderRadius.xxl,
        paddingBottom: Platform.OS === 'ios' ? 30 : 0,
    },
    pickerHeader: {
        flexDirection: 'row',
        justifyContent: 'space-between',
        alignItems: 'center',
        padding: spacing.lg,
        borderBottomWidth: 1,
        borderBottomColor: 'rgba(184, 196, 206, 0.2)',
    },
    pickerTitle: {
        fontSize: fontSize.base,
        fontWeight: fontWeight.semibold,
        color: colors.text,
    },
    pickerCancel: {
        fontSize: fontSize.base,
        color: colors.textSecondary,
    },
    pickerDone: {
        fontSize: fontSize.base,
        fontWeight: fontWeight.semibold,
        color: colors.primary,
    },
    picker: {
        height: 200,
        backgroundColor: colors.white,
    },
    pickerText: {
        color: colors.text,
    },
});
