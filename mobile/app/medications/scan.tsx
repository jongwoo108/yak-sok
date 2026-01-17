'use strict';

import { useState, useRef, useEffect } from 'react';
import AsyncStorage from '@react-native-async-storage/async-storage';
import {
    View,
    Text,
    StyleSheet,
    ScrollView,
    TouchableOpacity,
    ActivityIndicator,
    Image,
    Alert,
    TextInput,
    Platform,
    Switch,
} from 'react-native';
import { useRouter } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import * as ImagePicker from 'expo-image-picker';
import * as ImageManipulator from 'expo-image-manipulator';
import { useMedicationStore } from '../../services/store';
import { api } from '../../services/api';
import { colors, spacing, borderRadius, fontSize, fontWeight, shadows } from '../../components/theme';
import { GradientBackground } from '../../components/GradientBackground';

// 기본 복용 시간 매핑
const TIME_PRESETS: { [key: string]: { time_of_day: string; scheduled_time: string } } = {
    '아침': { time_of_day: 'morning', scheduled_time: '08:00' },
    '점심': { time_of_day: 'noon', scheduled_time: '12:00' },
    '저녁': { time_of_day: 'evening', scheduled_time: '18:00' },
    '취침전': { time_of_day: 'night', scheduled_time: '22:00' },
    '취침 전': { time_of_day: 'night', scheduled_time: '22:00' },
};

interface MedicationScheduleEdit {
    time_of_day: string;
    scheduled_time: string;
    enabled: boolean;
}

interface MedicationEdit {
    name: string;
    dosage: string;
    description: string;
    schedules: MedicationScheduleEdit[];
    isDuplicate: boolean;
    noScheduleDetected: boolean; // 스케줄이 감지되지 않은 경우
}

type Step = 'capture' | 'analyze' | 'edit';

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

export default function ScanScreen() {
    const router = useRouter();
    const { medications: existingMedications, fetchMedications } = useMedicationStore();

    const [step, setStep] = useState<Step>('capture');
    const [images, setImages] = useState<{ uri: string; base64?: string }[]>([]);
    const [isLoading, setIsLoading] = useState(false);
    const [error, setError] = useState('');
    const [medicationsToEdit, setMedicationsToEdit] = useState<MedicationEdit[]>([]);
    const [symptom, setSymptom] = useState('');
    const [isSevere, setIsSevere] = useState(false);
    const [daysSupply, setDaysSupply] = useState('');  // 처방 일수
    const [customTimes, setCustomTimes] = useState<{ [key: string]: string }>({
        morning: '08:00',
        noon: '12:00',
        evening: '18:00',
        night: '22:00',
    });

    // 저장된 알림 시간 설정 로드
    useEffect(() => {
        const loadTimeSettings = async () => {
            try {
                const stored = await AsyncStorage.getItem('notification_time_settings');
                if (stored) {
                    setCustomTimes(JSON.parse(stored));
                }
            } catch (error) {
                console.log('Failed to load notification time settings:', error);
            }
        };
        loadTimeSettings();
    }, []);

    // 이미지 전처리 (HEIC -> JPEG 변환 및 압축)
    const processImage = async (uri: string) => {
        try {
            const manipResult = await ImageManipulator.manipulateAsync(
                uri,
                [], // 크기 조절이나 회전이 필요하면 여기에 추가
                { compress: 0.8, format: ImageManipulator.SaveFormat.JPEG, base64: true }
            );
            return manipResult;
        } catch (error) {
            console.error('Image manipulation error:', error);
            Alert.alert('오류', '이미지 처리 중 문제가 발생했습니다.');
            return null;
        }
    };

    // 카메라로 촬영
    const takePhoto = async () => {
        const { status } = await ImagePicker.requestCameraPermissionsAsync();
        if (status !== 'granted') {
            Alert.alert('권한 필요', '카메라 접근 권한이 필요합니다.');
            return;
        }

        const result = await ImagePicker.launchCameraAsync({
            mediaTypes: ['images'],
            quality: 0.8,
        });

        if (!result.canceled && result.assets[0]) {
            const processed = await processImage(result.assets[0].uri);
            if (processed) {
                setImages(prev => [...prev, { uri: processed.uri, base64: processed.base64 }]);

                // 연속 촬영 안내
                Alert.alert(
                    '사진 추가',
                    '사진이 추가되었습니다. 다른 사진을 더 촬영하시겠습니까?',
                    [
                        { text: '아니오 (분석하기)', style: 'cancel' },
                        { text: '예 (더 찍기)', onPress: () => takePhoto() }
                    ]
                );
            }
        }
    };

    // 갤러리에서 선택
    const pickImage = async () => {
        const { status } = await ImagePicker.requestMediaLibraryPermissionsAsync();
        if (status !== 'granted') {
            Alert.alert('권한 필요', '갤러리 접근 권한이 필요합니다.');
            return;
        }

        const result = await ImagePicker.launchImageLibraryAsync({
            mediaTypes: ['images'],
            quality: 0.8,
            allowsMultipleSelection: true,
            selectionLimit: 10,
        });

        if (!result.canceled && result.assets && result.assets.length > 0) {
            setIsLoading(true); // 처리 중 로딩 표시
            try {
                // 여러 장의 이미지를 병렬로 처리
                const processedAssets = await Promise.all(
                    result.assets.map(asset => processImage(asset.uri))
                );

                const validAssets = processedAssets
                    .filter(p => p !== null)
                    .map(p => ({ uri: p!.uri, base64: p!.base64 }));

                setImages(prev => [...prev, ...validAssets]);
            } catch (err) {
                console.error('Image picking/processing error:', err);
                Alert.alert('오류', '이미지를 처리하는 중 문제가 발생했습니다.');
            } finally {
                setIsLoading(false);
            }
        }
    };

    // 이미지 삭제
    const removeImage = (index: number) => {
        setImages(prev => prev.filter((_, i) => i !== index));
    };

    // AI 분석
    const handleAnalyzeAll = async () => {
        if (images.length === 0) {
            setError('이미지를 최소 1개 이상 선택해주세요.');
            return;
        }

        setIsLoading(true);
        setError('');
        setStep('analyze');

        try {
            const allMedications: MedicationEdit[] = [];
            let detectedSymptom = '';

            for (const image of images) {
                const response = await api.medications.scanPrescriptionBase64(image.base64 || '');
                const result = response.data;

                if (!result.success) {
                    throw new Error(result.message || 'OCR 분석에 실패했습니다.');
                }

                if (!detectedSymptom && result.symptom) {
                    detectedSymptom = result.symptom;
                }

                const meds: MedicationEdit[] = result.medications?.map((med: any) => {
                    const isDuplicate = existingMedications.some(existing => existing.name === med.name) ||
                        allMedications.some(existing => existing.name === med.name);

                    const schedules: MedicationScheduleEdit[] = [];
                    if (med.times && Array.isArray(med.times)) {
                        med.times.forEach((timeStr: string) => {
                            const preset = TIME_PRESETS[timeStr];
                            if (preset) {
                                schedules.push({
                                    time_of_day: preset.time_of_day,
                                    scheduled_time: preset.scheduled_time,
                                    enabled: true,
                                });
                            }
                        });
                    }

                    // 스케줄이 없으면 자동으로 추가하지 않고 사용자에게 직접 선택하게 함
                    const noScheduleDetected = schedules.length === 0;

                    return {
                        name: med.name,
                        dosage: med.dosage || '',
                        description: med.description || med.frequency || '',
                        schedules,
                        isDuplicate,
                        noScheduleDetected,
                    };
                }) || [];

                allMedications.push(...meds);
            }

            setMedicationsToEdit(allMedications);
            setSymptom(detectedSymptom);
            setStep('edit');

        } catch (err: any) {
            console.error('OCR Error Details:', err);

            // 데모 모드 (인증 실패 또는 네트워크 오류 시)
            const isAuthError = err.response?.status === 401 || err.message?.includes('401');

            if (isAuthError) {
                // 토큰이 없거나 인증 실패 시 데모 데이터 사용
                // Alert.alert('데모 모드', '로그인이 되어있지 않아 데모 데이터로 진행합니다.');

                const demoResult = {
                    success: true,
                    symptom: '고혈압',
                    medications: [
                        {
                            name: '아모디핀정 5mg',
                            dosage: '1정',
                            frequency: '1일 1회',
                            times: ['아침'],
                            description: '흰색의 육각형 정제, 고혈압 치료제'
                        },
                        {
                            name: '다이아벡스정 500mg',
                            dosage: '1정',
                            frequency: '1일 2회',
                            times: ['아침', '저녁'],
                            description: '흰색의 원형 필름코팅정, 당뇨병 치료제'
                        }
                    ]
                };

                // 데모 데이터 처리 로직 (위의 try 블록 복제)
                const allMedications: MedicationEdit[] = [];
                // 1장만 처리한다고 가정
                const meds: MedicationEdit[] = demoResult.medications.map((med: any) => {
                    const isDuplicate = existingMedications.some(existing => existing.name === med.name);

                    const schedules: MedicationScheduleEdit[] = [];
                    if (med.times && Array.isArray(med.times)) {
                        med.times.forEach((timeStr: string) => {
                            const preset = TIME_PRESETS[timeStr];
                            if (preset) {
                                schedules.push({
                                    time_of_day: preset.time_of_day,
                                    scheduled_time: preset.scheduled_time,
                                    enabled: true,
                                });
                            }
                        });
                    }

                    // 데모 모드에서도 스케줄이 없으면 사용자에게 직접 선택하게 함
                    const noScheduleDetected = schedules.length === 0;

                    return {
                        name: med.name,
                        dosage: med.dosage || '',
                        description: med.description || med.frequency || '',
                        schedules,
                        isDuplicate,
                        noScheduleDetected,
                    };
                });

                allMedications.push(...meds);
                setMedicationsToEdit(allMedications);
                setSymptom(demoResult.symptom);
                setStep('edit');
                return; // 성공했으므로 종료
            }

            const errorMessage = err.response?.data?.error || err.message || 'OCR 처리에 실패했습니다.';
            setError(errorMessage);
            setStep('capture');
        } finally {
            setIsLoading(false);
        }
    };

    // 스케줄 토글
    const toggleSchedule = (medIndex: number, scheduleIndex: number) => {
        setMedicationsToEdit(prev => {
            const updated = [...prev];
            updated[medIndex].schedules[scheduleIndex].enabled =
                !updated[medIndex].schedules[scheduleIndex].enabled;
            return updated;
        });
    };

    // 스케줄 추가
    const addSchedule = (medIndex: number, timeOfDay: string) => {
        // 사용자 정의 알림 시간 사용, 없으면 기본값
        const scheduledTime = customTimes[timeOfDay] || TIME_PRESETS[Object.keys(TIME_PRESETS).find(k => TIME_PRESETS[k].time_of_day === timeOfDay) || '아침']?.scheduled_time || '08:00';

        setMedicationsToEdit(prev => {
            const updated = [...prev];
            const exists = updated[medIndex].schedules.some(s => s.time_of_day === timeOfDay);
            if (!exists) {
                updated[medIndex].schedules.push({
                    time_of_day: timeOfDay,
                    scheduled_time: scheduledTime,
                    enabled: true,
                });
            }
            return updated;
        });
    };

    // 등록 확정
    const handleConfirm = async () => {
        console.log('[handleConfirm] 시작');
        const { createMedication } = useMedicationStore.getState();
        const newMedications = medicationsToEdit.filter(med =>
            !med.isDuplicate && med.schedules.some(s => s.enabled)
        );

        if (newMedications.length === 0) {
            Alert.alert('알림', '등록할 약이 없습니다. 복용 시간을 선택해주세요.');
            return;
        }

        console.log('[handleConfirm] 등록할 약 개수:', newMedications.length);
        setIsLoading(true);
        setError('');

        try {
            let groupId: number | null = null;
            if (symptom) {
                console.log('[handleConfirm] 그룹 생성 중:', symptom, '중증 여부:', isSevere);
                try {
                    // 가끔 발생하는 타입 오류 방지를 위해 any 타입 단언 사용
                    const groupResponse = await (api.medicationGroups.create as any)({
                        name: symptom,
                        is_severe: isSevere
                    });
                    groupId = groupResponse.data.id;
                    console.log('[handleConfirm] 그룹 생성 완료, groupId:', groupId);
                } catch (groupError: any) {
                    console.error('[handleConfirm] 그룹 생성 중 에러:', groupError.response?.status, groupError.message);
                    if (groupError.response?.status === 401) {
                        throw new Error('인증 세션이 만료되었습니다. 다시 로그인한 후에 시도해주세요.');
                    }
                    throw groupError;
                }
            }

            for (let i = 0; i < newMedications.length; i++) {
                const med = newMedications[i];
                console.log(`[handleConfirm] 약 ${i + 1}/${newMedications.length} 등록 중:`, med.name);
                const enabledSchedules = med.schedules
                    .filter(s => s.enabled)
                    .map(s => ({
                        time_of_day: s.time_of_day,
                        scheduled_time: s.scheduled_time,
                    }));

                // store action 사용 (자동으로 fetchMedications, fetchTodayLogs 실행)
                // 처방전 스캔 시점 = 병원 방문일 (start_date = 오늘)
                await createMedication({
                    name: med.name,
                    dosage: med.dosage,
                    description: med.description,
                    schedules_input: enabledSchedules,
                    group_id: groupId,
                    days_supply: daysSupply ? parseInt(daysSupply) : null,
                    start_date: new Date().toISOString().split('T')[0],  // 오늘 날짜
                });
                console.log(`[handleConfirm] 약 ${i + 1} 등록 완료`);
            }

            console.log('[handleConfirm] 모든 약 등록 및 동기화 완료, router.replace 호출');
            router.replace('/(tabs)/medications');
            console.log('[handleConfirm] 완료');
        } catch (err: any) {
            console.error('[handleConfirm] 에러 발생:', err);
            console.error('[handleConfirm] 에러 메시지:', err?.message);
            if (err.response) {
                console.error('[handleConfirm] 에러 응답 상태:', err.response.status);
                console.error('[handleConfirm] 에러 응답 데이터:', JSON.stringify(err.response.data, null, 2));
            } else {
                console.error('[handleConfirm] 응답 없음 (네트워크 오류 가능성)');
            }
            setError('약 등록에 실패했습니다: ' + (err.response?.data?.error || err.message));
        } finally {
            setIsLoading(false);
        }
    };

    const getTimeLabel = (timeOfDay: string) => {
        const labels: { [key: string]: string } = {
            morning: '아침',
            noon: '점심',
            evening: '저녁',
            night: '취침 전',
        };
        return labels[timeOfDay] || timeOfDay;
    };

    const resetAll = () => {
        setStep('capture');
        setImages([]);
        setMedicationsToEdit([]);
        setSymptom('');
        setDaysSupply('');
        setError('');
    };

    return (
        <GradientBackground variant="ocean" style={styles.container}>
            <ScrollView style={styles.scrollView} contentContainerStyle={styles.content}>
                {/* 헤더 */}
                <View style={styles.header}>
                    <TouchableOpacity onPress={() => router.back()} style={styles.backButton}>
                        <Ionicons name="chevron-back" size={22} color={colors.text} />
                    </TouchableOpacity>
                    <View style={styles.headerTitleRow}>
                        <Ionicons name="camera" size={24} color={colors.primary} style={{ marginRight: 8 }} />
                        <Text style={styles.title}>처방전 스캔</Text>
                    </View>
                    <View style={{ width: 44 }} />
                </View>

                {/* 에러 메시지 */}
                {error !== '' && (
                    <NeumorphCard style={styles.errorCard}>
                        <View style={styles.errorContent}>
                            <Ionicons name="alert-circle" size={20} color={colors.dangerDark} />
                            <Text style={styles.errorText}>{error}</Text>
                        </View>
                    </NeumorphCard>
                )}

                {/* STEP: 분석 중 */}
                {step === 'analyze' && (
                    <NeumorphCard style={styles.analyzeCard}>
                        <View style={styles.analyzeContent}>
                            <View style={styles.analyzeIcon}>
                                <ActivityIndicator size="large" color={colors.primary} />
                            </View>
                            <Text style={styles.analyzeTitle}>AI가 처방전을 분석 중입니다</Text>
                            <Text style={styles.analyzeSubtitle}>
                                {images.length}장의 이미지를 분석하고 있어요...
                            </Text>
                        </View>
                    </NeumorphCard>
                )}

                {/* STEP 1: 이미지 촬영/수집 */}
                {step === 'capture' && (
                    <>
                        {isLoading && (
                            <View style={styles.loadingOverlay}>
                                <ActivityIndicator size="large" color={colors.primary} />
                                <Text style={styles.loadingText}>이미지 처리 중...</Text>
                            </View>
                        )}
                        {/* 촬영된 이미지 목록 */}
                        {images.length > 0 && (
                            <NeumorphCard style={styles.cardSpacing}>
                                <View style={styles.cardLabelRow}>
                                    <Ionicons name="images" size={18} color={colors.primary} />
                                    <Text style={styles.cardLabel}>촬영한 사진 ({images.length}장)</Text>
                                </View>
                                <View style={styles.imageGrid}>
                                    {images.map((img, idx) => (
                                        <View key={idx} style={styles.imageWrapper}>
                                            <Image source={{ uri: img.uri }} style={styles.thumbnail} />
                                            <TouchableOpacity
                                                style={styles.removeButton}
                                                onPress={() => removeImage(idx)}
                                            >
                                                <Ionicons name="close" size={14} color={colors.white} />
                                            </TouchableOpacity>
                                        </View>
                                    ))}
                                </View>
                            </NeumorphCard>
                        )}

                        {/* 촬영 버튼들 */}
                        <View style={styles.captureButtons}>
                            <TouchableOpacity style={styles.captureButton} onPress={takePhoto}>
                                <View style={styles.captureIconCircle}>
                                    <Ionicons name="camera" size={28} color={colors.primary} />
                                </View>
                                <Text style={styles.captureText}>카메라</Text>
                            </TouchableOpacity>
                            <TouchableOpacity style={styles.captureButton} onPress={pickImage}>
                                <View style={styles.captureIconCircle}>
                                    <Ionicons name="images" size={28} color={colors.blueDark} />
                                </View>
                                <Text style={styles.captureText}>갤러리</Text>
                            </TouchableOpacity>
                        </View>

                        {/* 팁 */}
                        <NeumorphCard style={styles.tipCard}>
                            <View style={styles.tipHeader}>
                                <Ionicons name="bulb" size={18} color={colors.primary} />
                                <Text style={styles.tipTitle}>스캔 팁</Text>
                            </View>
                            <Text style={styles.tipText}>• 여러 봉지가 있으면 모두 촬영한 후 분석하세요</Text>
                            <Text style={styles.tipText}>• 밝은 곳에서 글씨가 잘 보이도록 촬영해주세요</Text>
                        </NeumorphCard>

                        {/* AI 분석 버튼 */}
                        <TouchableOpacity
                            style={[styles.analyzeButton, images.length === 0 && styles.buttonDisabled]}
                            onPress={handleAnalyzeAll}
                            disabled={images.length === 0}
                        >
                            <Ionicons name="search" size={20} color={colors.white} style={{ marginRight: 8 }} />
                            <Text style={styles.analyzeButtonText}>
                                {images.length > 1
                                    ? `${images.length}장 AI 분석하기`
                                    : 'AI로 분석하기'}
                            </Text>
                        </TouchableOpacity>
                    </>
                )}

                {/* STEP 3: 결과 편집 */}
                {step === 'edit' && (
                    <>
                        {/* 증상 입력 */}
                        <NeumorphCard style={styles.symptomCard}>
                            <View style={styles.symptomHeader}>
                                <Ionicons name="folder" size={18} color={colors.primary} />
                                <Text style={styles.symptomLabel}>AI가 추정한 증상</Text>
                            </View>
                            <TextInput
                                style={styles.symptomInput}
                                value={symptom}
                                onChangeText={setSymptom}
                                placeholder="증상/질환명 (예: 고혈압, 당뇨)"
                                placeholderTextColor={colors.textLight}
                            />

                            {/* 중증 질환 토글 */}
                            <View style={styles.severeToggleRow}>
                                <View style={styles.severeLabelContainer}>
                                    <Ionicons
                                        name={isSevere ? "alert-circle" : "alert-circle-outline"}
                                        size={18}
                                        color={isSevere ? colors.danger : colors.textLight}
                                    />
                                    <Text style={[styles.severeLabel, isSevere && styles.severeLabelActive]}>
                                        중증 질환으로 설정
                                    </Text>
                                </View>
                                <Switch
                                    value={isSevere}
                                    onValueChange={setIsSevere}
                                    trackColor={{ false: colors.baseDark, true: colors.dangerLight }}
                                    thumbColor={isSevere ? colors.danger : colors.baseLight}
                                    ios_backgroundColor={colors.baseDark}
                                />
                            </View>
                            {isSevere && (
                                <Text style={styles.severeHelpText}>
                                    * 미복용 시 보호자에게 즉시 긴급 알림이 발송됩니다.
                                </Text>
                            )}
                        </NeumorphCard>

                        {/* 처방 일수 입력 */}
                        <NeumorphCard style={styles.daysSupplyCard}>
                            <View style={styles.daysSupplyHeader}>
                                <Ionicons name="calendar" size={18} color="#2196F3" />
                                <Text style={styles.daysSupplyLabel}>처방 일수</Text>
                            </View>
                            <View style={styles.daysSupplyInputRow}>
                                <TextInput
                                    style={styles.daysSupplyInput}
                                    value={daysSupply}
                                    onChangeText={(text) => setDaysSupply(text.replace(/[^0-9]/g, ''))}
                                    placeholder="예: 30"
                                    placeholderTextColor={colors.textLight}
                                    keyboardType="number-pad"
                                    maxLength={3}
                                />
                                <Text style={styles.daysSupplyUnit}>일</Text>
                            </View>
                            <Text style={styles.daysSupplyHint}>
                                입력하면 약이 떨어지는 날을 캘린더에 표시합니다
                            </Text>
                            {daysSupply && parseInt(daysSupply) > 0 && (
                                <View style={styles.daysSupplyPreview}>
                                    <Ionicons name="calendar-outline" size={16} color="#2196F3" />
                                    <Text style={styles.daysSupplyPreviewText}>
                                        다음 병원 방문일: {(() => {
                                            const endDate = new Date();
                                            endDate.setDate(endDate.getDate() + parseInt(daysSupply));
                                            return endDate.toLocaleDateString('ko-KR', { month: 'long', day: 'numeric' });
                                        })()}
                                    </Text>
                                </View>
                            )}
                        </NeumorphCard>

                        {/* 약품 목록 */}
                        <NeumorphCard style={styles.cardSpacing}>
                            <View style={styles.sectionHeader}>
                                <Ionicons name="time" size={18} color={colors.primary} />
                                <Text style={styles.sectionTitle}>복용 시간 설정 ({medicationsToEdit.length}개)</Text>
                            </View>

                            {medicationsToEdit.map((med, medIndex) => (
                                <View
                                    key={medIndex}
                                    style={[
                                        styles.medicationItem,
                                        med.isDuplicate && styles.medicationItemDuplicate
                                    ]}
                                >
                                    <View style={styles.medicationHeader}>
                                        <View style={{ flex: 1 }}>
                                            <Text style={styles.medicationName}>{med.name}</Text>
                                            <Text style={styles.medicationDosage}>{med.dosage}</Text>
                                        </View>
                                        {med.isDuplicate && (
                                            <View style={styles.duplicateBadge}>
                                                <Text style={styles.duplicateText}>이미 등록됨</Text>
                                            </View>
                                        )}
                                    </View>

                                    {!med.isDuplicate && (
                                        <>
                                            {/* 스케줄이 감지되지 않은 경우 안내 메시지 */}
                                            {med.noScheduleDetected && med.schedules.filter(s => s.enabled).length === 0 && (
                                                <View style={styles.noScheduleWarning}>
                                                    <Ionicons name="alert-circle" size={16} color={colors.warning} />
                                                    <Text style={styles.noScheduleWarningText}>
                                                        복용 일정이 감지되지 않았습니다. 아래에서 직접 선택해주세요.
                                                    </Text>
                                                </View>
                                            )}
                                            <View style={styles.timeButtons}>
                                                {['morning', 'noon', 'evening', 'night'].map(timeOfDay => {
                                                    const schedule = med.schedules.find(s => s.time_of_day === timeOfDay);
                                                    const isActive = schedule?.enabled;

                                                    return (
                                                        <TouchableOpacity
                                                            key={timeOfDay}
                                                            style={[
                                                                styles.timeButton,
                                                                isActive && styles.timeButtonActive,
                                                                med.noScheduleDetected && !isActive && styles.timeButtonHighlight
                                                            ]}
                                                            onPress={() => {
                                                                if (schedule) {
                                                                    toggleSchedule(medIndex, med.schedules.indexOf(schedule));
                                                                } else {
                                                                    addSchedule(medIndex, timeOfDay);
                                                                }
                                                            }}
                                                        >
                                                            <Text style={[
                                                                styles.timeButtonText,
                                                                isActive && styles.timeButtonTextActive
                                                            ]}>
                                                                {getTimeLabel(timeOfDay)}
                                                            </Text>
                                                        </TouchableOpacity>
                                                    );
                                                })}
                                            </View>
                                        </>
                                    )}
                                </View>
                            ))}
                        </NeumorphCard>

                        {/* 버튼들 */}
                        <TouchableOpacity
                            style={[styles.confirmButton, isLoading && styles.buttonDisabled]}
                            onPress={handleConfirm}
                            disabled={isLoading}
                        >
                            {isLoading ? (
                                <ActivityIndicator color="white" />
                            ) : (
                                <>
                                    <Ionicons name="checkmark" size={20} color={colors.white} style={{ marginRight: 8 }} />
                                    <Text style={styles.confirmButtonText}>
                                        {symptom ? `"${symptom}" 그룹으로 등록` : '등록 완료'}
                                    </Text>
                                </>
                            )}
                        </TouchableOpacity>

                        <TouchableOpacity style={styles.resetButton} onPress={resetAll}>
                            <Ionicons name="refresh" size={18} color={colors.textSecondary} style={{ marginRight: 8 }} />
                            <Text style={styles.resetButtonText}>처음부터 다시</Text>
                        </TouchableOpacity>
                    </>
                )}

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
        backgroundColor: colors.base,
        ...shadows.dark,
    },
    shadowLight: {
        ...StyleSheet.absoluteFillObject,
        backgroundColor: colors.base,
        ...shadows.light,
    },
    cardSurface: {
        backgroundColor: colors.base,
        borderRadius: borderRadius.xl,
        padding: spacing.lg,
    },
    cardSpacing: {
        marginBottom: spacing.lg,
    },

    // 에러
    errorCard: {
        marginBottom: spacing.lg,
    },
    errorContent: {
        flexDirection: 'row',
        alignItems: 'center',
        gap: spacing.sm,
    },
    errorText: {
        color: colors.dangerDark,
        fontSize: fontSize.sm,
        flex: 1,
    },

    // 분석 중
    analyzeCard: {
        marginBottom: spacing.lg,
    },
    analyzeContent: {
        width: '100%',
        alignItems: 'center',
        justifyContent: 'center',
        paddingVertical: spacing.xl,
    },
    analyzeIcon: {
        alignItems: 'center',
        justifyContent: 'center',
        marginBottom: spacing.xl,
    },
    analyzeTitle: {
        fontSize: fontSize.lg,
        fontWeight: fontWeight.bold,
        color: colors.text,
        marginBottom: spacing.sm,
    },
    analyzeSubtitle: {
        fontSize: fontSize.base,
        color: colors.textSecondary,
    },
    loadingOverlay: {
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'center',
        padding: spacing.md,
        marginBottom: spacing.md,
        gap: spacing.sm,
    },
    loadingText: {
        fontSize: fontSize.base,
        color: colors.primary,
        fontWeight: fontWeight.semibold,
    },

    // 이미지 그리드
    cardLabelRow: {
        flexDirection: 'row',
        alignItems: 'center',
        gap: spacing.sm,
        marginBottom: spacing.md,
    },
    cardLabel: {
        fontSize: fontSize.base,
        fontWeight: fontWeight.semibold,
        color: colors.text,
    },
    imageGrid: {
        flexDirection: 'row',
        flexWrap: 'wrap',
        gap: spacing.sm,
    },
    imageWrapper: {
        position: 'relative',
    },
    thumbnail: {
        width: 72,
        height: 72,
        borderRadius: borderRadius.md,
    },
    removeButton: {
        position: 'absolute',
        top: -6,
        right: -6,
        width: 22,
        height: 22,
        borderRadius: 11,
        backgroundColor: colors.danger,
        alignItems: 'center',
        justifyContent: 'center',
    },

    // 캡처 버튼
    captureButtons: {
        flexDirection: 'row',
        gap: spacing.md,
        marginBottom: spacing.lg,
    },
    captureButton: {
        flex: 1,
        backgroundColor: colors.base,
        borderRadius: borderRadius.xl,
        padding: spacing.xl,
        alignItems: 'center',
        justifyContent: 'center',
        ...shadows.dark,
    },
    captureIconCircle: {
        width: 56,
        height: 56,
        borderRadius: 28,
        backgroundColor: colors.mintLight,
        alignItems: 'center',
        justifyContent: 'center',
        marginBottom: spacing.sm,
    },
    captureText: {
        fontSize: fontSize.sm,
        color: colors.text,
        fontWeight: fontWeight.medium,
    },

    // 팁 카드
    tipCard: {
        marginBottom: spacing.lg,
    },
    tipHeader: {
        flexDirection: 'row',
        alignItems: 'center',
        gap: spacing.sm,
        marginBottom: spacing.md,
    },
    tipTitle: {
        fontSize: fontSize.base,
        fontWeight: fontWeight.semibold,
        color: colors.text,
    },
    tipText: {
        fontSize: fontSize.sm,
        color: colors.textSecondary,
        marginBottom: spacing.xs,
    },

    // 분석 버튼
    analyzeButton: {
        flexDirection: 'row',
        backgroundColor: colors.primary,
        borderRadius: borderRadius.pill,
        paddingVertical: spacing.lg,
        alignItems: 'center',
        justifyContent: 'center',
    },
    analyzeButtonText: {
        color: colors.white,
        fontSize: fontSize.base,
        fontWeight: fontWeight.bold,
    },
    buttonDisabled: {
        opacity: 0.5,
    },

    // 증상 카드
    symptomCard: {
        marginBottom: spacing.lg,
    },
    symptomHeader: {
        flexDirection: 'row',
        alignItems: 'center',
        gap: spacing.sm,
        marginBottom: spacing.sm,
    },
    symptomLabel: {
        fontSize: fontSize.sm,
        color: colors.textSecondary,
    },
    symptomInput: {
        fontSize: fontSize.lg,
        fontWeight: fontWeight.semibold,
        color: colors.primary,
        padding: spacing.sm,
        backgroundColor: colors.baseLight,
        borderRadius: borderRadius.md,
        borderBottomWidth: 1,
        borderBottomColor: 'rgba(184, 196, 206, 0.2)',
    },
    severeToggleRow: {
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'space-between',
        marginTop: spacing.md,
        paddingVertical: spacing.sm,
    },
    severeLabelContainer: {
        flexDirection: 'row',
        alignItems: 'center',
        gap: spacing.sm,
    },
    severeLabel: {
        fontSize: fontSize.base,
        color: colors.textSecondary,
        fontWeight: fontWeight.medium,
    },
    severeLabelActive: {
        color: colors.dangerDark,
        fontWeight: fontWeight.bold,
    },
    severeHelpText: {
        fontSize: fontSize.xs,
        color: colors.dangerDark,
        marginTop: spacing.xs,
        fontStyle: 'italic',
        paddingLeft: spacing.xl,
    },

    // 처방 일수
    daysSupplyCard: {
        marginBottom: spacing.lg,
    },
    daysSupplyHeader: {
        flexDirection: 'row',
        alignItems: 'center',
        gap: spacing.sm,
        marginBottom: spacing.md,
    },
    daysSupplyLabel: {
        fontSize: fontSize.base,
        fontWeight: fontWeight.semibold,
        color: colors.text,
    },
    daysSupplyInputRow: {
        flexDirection: 'row',
        alignItems: 'center',
        gap: spacing.sm,
    },
    daysSupplyInput: {
        flex: 1,
        fontSize: fontSize.xl,
        fontWeight: fontWeight.bold,
        color: '#2196F3',
        padding: spacing.md,
        backgroundColor: colors.baseLight,
        borderRadius: borderRadius.md,
        borderWidth: 1,
        borderColor: 'rgba(33, 150, 243, 0.2)',
        textAlign: 'center',
    },
    daysSupplyUnit: {
        fontSize: fontSize.lg,
        color: colors.textSecondary,
        fontWeight: fontWeight.medium,
    },
    daysSupplyHint: {
        fontSize: fontSize.sm,
        color: colors.textSecondary,
        marginTop: spacing.md,
    },
    daysSupplyPreview: {
        flexDirection: 'row',
        alignItems: 'center',
        gap: spacing.sm,
        marginTop: spacing.md,
        padding: spacing.md,
        backgroundColor: 'rgba(33, 150, 243, 0.1)',
        borderRadius: borderRadius.md,
    },
    daysSupplyPreviewText: {
        fontSize: fontSize.base,
        color: '#2196F3',
        fontWeight: fontWeight.medium,
    },

    // 약품 목록
    sectionHeader: {
        flexDirection: 'row',
        alignItems: 'center',
        gap: spacing.sm,
        marginBottom: spacing.lg,
    },
    sectionTitle: {
        fontSize: fontSize.base,
        fontWeight: fontWeight.bold,
        color: colors.text,
    },
    medicationItem: {
        backgroundColor: colors.baseLight,
        borderRadius: borderRadius.lg,
        padding: spacing.md,
        marginBottom: spacing.md,
    },
    medicationItemDuplicate: {
        opacity: 0.6,
    },
    medicationHeader: {
        flexDirection: 'row',
        justifyContent: 'space-between',
        alignItems: 'flex-start',
        marginBottom: spacing.md,
    },
    medicationName: {
        fontSize: fontSize.base,
        fontWeight: fontWeight.semibold,
        color: colors.text,
    },
    medicationDosage: {
        fontSize: fontSize.sm,
        color: colors.textSecondary,
    },
    duplicateBadge: {
        backgroundColor: colors.danger,
        paddingHorizontal: spacing.md,
        paddingVertical: spacing.xs,
        borderRadius: borderRadius.pill,
    },
    duplicateText: {
        color: colors.white,
        fontSize: fontSize.xs,
        fontWeight: fontWeight.semibold,
    },
    timeButtons: {
        flexDirection: 'row',
        flexWrap: 'wrap',
        gap: spacing.sm,
    },
    timeButton: {
        paddingHorizontal: spacing.md,
        paddingVertical: spacing.sm,
        borderRadius: borderRadius.pill,
        backgroundColor: colors.base,
    },
    timeButtonActive: {
        backgroundColor: colors.primary,
    },
    timeButtonHighlight: {
        borderWidth: 1,
        borderColor: colors.warning,
        borderStyle: 'dashed',
    },
    noScheduleWarning: {
        flexDirection: 'row',
        alignItems: 'center',
        backgroundColor: 'rgba(255, 193, 7, 0.15)',
        borderRadius: borderRadius.md,
        padding: spacing.sm,
        marginBottom: spacing.sm,
        gap: spacing.xs,
    },
    noScheduleWarningText: {
        fontSize: fontSize.xs,
        color: colors.warning,
        flex: 1,
    },
    timeButtonText: {
        fontSize: fontSize.sm,
        fontWeight: fontWeight.medium,
        color: colors.text,
    },
    timeButtonTextActive: {
        color: colors.white,
    },

    // 확인 버튼
    confirmButton: {
        flexDirection: 'row',
        backgroundColor: colors.primary,
        borderRadius: borderRadius.pill,
        paddingVertical: spacing.lg,
        alignItems: 'center',
        justifyContent: 'center',
        marginBottom: spacing.md,
    },
    confirmButtonText: {
        color: colors.white,
        fontSize: fontSize.base,
        fontWeight: fontWeight.bold,
    },

    // 리셋 버튼
    resetButton: {
        flexDirection: 'row',
        backgroundColor: colors.base,
        borderRadius: borderRadius.pill,
        paddingVertical: spacing.md,
        alignItems: 'center',
        justifyContent: 'center',
        ...shadows.dark,
    },
    resetButtonText: {
        fontSize: fontSize.sm,
        fontWeight: fontWeight.semibold,
        color: colors.textSecondary,
    },
});
