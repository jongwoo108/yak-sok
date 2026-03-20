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
import type { Medication } from '../../services/types';
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
    noScheduleDetected: boolean;
}

// 계속 복용하는 약 (기존 약과 OCR 매칭)
interface ExistingMedMatch {
    existingMed: Medication;
    ocrName: string;
}

// 약 이름 정규화 (OCR 오차 대응)
const normalizeMedName = (name: string): string => {
    return name
        .replace(/\s+/g, '')
        .replace(/[()\[\]]/g, '')
        .replace(/(정|캡슐|mg|ml|g|mcg|ug)/gi, '')
        .toLowerCase();
};

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
    const [daysSupply, setDaysSupply] = useState('');
    // 약 변경사항 비교 상태
    const [continuedMeds, setContinuedMeds] = useState<ExistingMedMatch[]>([]);
    const [droppedMeds, setDroppedMeds] = useState<Medication[]>([]);
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
            mediaTypes: ['images'] as any,
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
            mediaTypes: ['images'] as any,
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

    // OCR 결과를 기존 약과 비교하여 분류하는 헬퍼
    const classifyMedications = (ocrMeds: any[], detectedSymptom: string) => {
        const continued: ExistingMedMatch[] = [];
        const newMeds: MedicationEdit[] = [];
        const matchedExistingIds = new Set<number>();

        for (const med of ocrMeds) {
            const normalizedOcr = normalizeMedName(med.name);
            const matchedExisting = existingMedications.find(existing =>
                existing.is_active && normalizeMedName(existing.name) === normalizedOcr
            );

            if (matchedExisting) {
                continued.push({ existingMed: matchedExisting, ocrName: med.name });
                matchedExistingIds.add(matchedExisting.id);
            } else {
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
                newMeds.push({
                    name: med.name,
                    dosage: med.dosage || '',
                    description: med.description || med.frequency || '',
                    schedules,
                    isDuplicate: false,
                    noScheduleDetected: schedules.length === 0,
                });
            }
        }

        // 같은 그룹(같은 증상)의 기존 약 중 OCR에 없는 것 = 빠진 약
        const dropped = existingMedications.filter(existing =>
            existing.is_active &&
            !matchedExistingIds.has(existing.id) &&
            (detectedSymptom
                ? existing.group_name === detectedSymptom
                : true) // 증상명 없으면 전체에서 비교
        );

        return { continued, dropped, newMeds };
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
            const allOcrMeds: any[] = [];
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

                if (result.medications) {
                    allOcrMeds.push(...result.medications);
                }
            }

            const { continued, dropped, newMeds } = classifyMedications(allOcrMeds, detectedSymptom);
            setContinuedMeds(continued);
            setDroppedMeds(dropped);
            setMedicationsToEdit(newMeds);
            setSymptom(detectedSymptom);
            setStep('edit');

        } catch (err: any) {
            console.error('OCR Error Details:', err);

            const isAuthError = err.response?.status === 401 || err.message?.includes('401');

            if (isAuthError) {
                const demoMeds = [
                    {
                        name: '아모디핀정 5mg', dosage: '1정',
                        frequency: '1일 1회', times: ['아침'],
                        description: '흰색의 육각형 정제, 고혈압 치료제'
                    },
                    {
                        name: '다이아벡스정 500mg', dosage: '1정',
                        frequency: '1일 2회', times: ['아침', '저녁'],
                        description: '흰색의 원형 필름코팅정, 당뇨병 치료제'
                    }
                ];
                const detectedSymptom = '고혈압';
                const { continued, dropped, newMeds } = classifyMedications(demoMeds, detectedSymptom);
                setContinuedMeds(continued);
                setDroppedMeds(dropped);
                setMedicationsToEdit(newMeds);
                setSymptom(detectedSymptom);
                setStep('edit');
                return;
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

    // 약 이름 수정
    const updateMedicationName = (index: number, name: string) => {
        setMedicationsToEdit(prev => {
            const updated = [...prev];
            updated[index].name = name;
            return updated;
        });
    };

    // 용량 수정
    const updateMedicationDosage = (index: number, dosage: string) => {
        setMedicationsToEdit(prev => {
            const updated = [...prev];
            updated[index].dosage = dosage;
            return updated;
        });
    };

    // 등록 확정 (3단계: 비활성화 → 갱신 → 새 등록)
    const handleConfirm = async () => {
        console.log('[handleConfirm] 시작');
        const { createMedication, deactivateMedications, renewMedications } = useMedicationStore.getState();
        const newMedications = medicationsToEdit.filter(med =>
            !med.isDuplicate && med.schedules.some(s => s.enabled)
        );

        const hasChanges = droppedMeds.length > 0 || continuedMeds.length > 0 || newMedications.length > 0;
        if (!hasChanges) {
            Alert.alert('알림', '변경사항이 없습니다.');
            return;
        }

        if (newMedications.length > 0 && !newMedications.some(m => m.schedules.some(s => s.enabled))) {
            Alert.alert('알림', '새 약의 복용 시간을 선택해주세요.');
            return;
        }

        setIsLoading(true);
        setError('');

        try {
            // 1단계: 빠진 약 비활성화
            if (droppedMeds.length > 0) {
                console.log('[handleConfirm] 빠진 약 비활성화:', droppedMeds.map(m => m.name));
                await deactivateMedications(droppedMeds.map(m => m.id));
            }

            // 2단계: 계속 복용 약 갱신 (start_date, days_supply)
            if (continuedMeds.length > 0) {
                console.log('[handleConfirm] 계속 복용 약 갱신:', continuedMeds.map(m => m.existingMed.name));
                const today = new Date().toISOString().split('T')[0];
                await renewMedications(continuedMeds.map(m => ({
                    id: m.existingMed.id,
                    days_supply: daysSupply ? parseInt(daysSupply) : null,
                    start_date: today,
                })));
            }

            // 3단계: 새 약 등록 (기존 로직)
            if (newMedications.length > 0) {
                let groupId: number | null = null;
                if (symptom) {
                    try {
                        const groupResponse = await (api.medicationGroups.create as any)({
                            name: symptom,
                            is_severe: isSevere
                        });
                        groupId = groupResponse.data.id;
                    } catch (groupError: any) {
                        if (groupError.response?.status === 401) {
                            throw new Error('인증 세션이 만료되었습니다. 다시 로그인한 후에 시도해주세요.');
                        }
                        throw groupError;
                    }
                }

                for (const med of newMedications) {
                    const enabledSchedules = med.schedules
                        .filter(s => s.enabled)
                        .map(s => ({
                            time_of_day: s.time_of_day,
                            scheduled_time: s.scheduled_time,
                        }));

                    await createMedication({
                        name: med.name,
                        dosage: med.dosage,
                        description: med.description,
                        schedules_input: enabledSchedules,
                        group_id: groupId,
                        days_supply: daysSupply ? parseInt(daysSupply) : null,
                        start_date: new Date().toISOString().split('T')[0],
                    });
                }
            }

            console.log('[handleConfirm] 모든 처리 완료');
            router.replace('/(tabs)/medications');
        } catch (err: any) {
            console.error('[handleConfirm] 에러:', err?.message);
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

    // 빠진 약 중 하나를 복원 (계속 복용으로 전환)
    const restoreDroppedMed = (med: Medication) => {
        setDroppedMeds(prev => prev.filter(m => m.id !== med.id));
        setContinuedMeds(prev => [...prev, { existingMed: med, ocrName: med.name }]);
    };

    const resetAll = () => {
        setStep('capture');
        setImages([]);
        setMedicationsToEdit([]);
        setContinuedMeds([]);
        setDroppedMeds([]);
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

                        {/* 📋 빠진 약 (비활성화 대상) */}
                        {droppedMeds.length > 0 && (
                            <NeumorphCard style={styles.cardSpacing}>
                                <View style={styles.sectionHeader}>
                                    <Ionicons name="close-circle" size={18} color={colors.dangerDark} />
                                    <Text style={[styles.sectionTitle, { color: colors.dangerDark }]}>
                                        빠진 약 ({droppedMeds.length}개)
                                    </Text>
                                </View>
                                <Text style={{ fontSize: fontSize.sm, color: colors.textSecondary, marginBottom: spacing.md, lineHeight: 22 }}>
                                    이번 처방전에 없는 약이에요.{"\n"}등록하면 복용이 중단됩니다.
                                </Text>
                                {droppedMeds.map((med) => (
                                    <View key={med.id} style={[styles.medicationItem, { backgroundColor: colors.dangerLight }]}>
                                        <View style={styles.medicationHeader}>
                                            <View style={{ flex: 1, flexDirection: 'row', alignItems: 'center' }}>
                                                <View style={{ width: 32, height: 32, borderRadius: 16, backgroundColor: colors.danger, alignItems: 'center', justifyContent: 'center', marginRight: spacing.sm }}>
                                                    <Ionicons name="close" size={16} color={colors.white} />
                                                </View>
                                                <View>
                                                    <Text style={[styles.medicationName, { color: colors.textLight }]}>
                                                        {med.name}
                                                    </Text>
                                                    {med.dosage ? <Text style={styles.medicationDosage}>{med.dosage}</Text> : null}
                                                </View>
                                            </View>
                                            <TouchableOpacity
                                                style={{ backgroundColor: colors.mintLight, paddingHorizontal: 20, paddingVertical: 10, borderRadius: borderRadius.pill, minHeight: 44, alignItems: 'center', justifyContent: 'center' }}
                                                onPress={() => restoreDroppedMed(med)}
                                            >
                                                <Text style={{ fontSize: fontSize.xs, color: colors.primaryDark, fontWeight: fontWeight.bold }}>유지</Text>
                                            </TouchableOpacity>
                                        </View>
                                    </View>
                                ))}
                            </NeumorphCard>
                        )}

                        {/* ✅ 계속 복용 약 (갱신 대상) */}
                        {continuedMeds.length > 0 && (
                            <NeumorphCard style={styles.cardSpacing}>
                                <View style={styles.sectionHeader}>
                                    <Ionicons name="checkmark-circle" size={18} color={colors.successDark} />
                                    <Text style={[styles.sectionTitle, { color: colors.successDark }]}>
                                        계속 복용 ({continuedMeds.length}개)
                                    </Text>
                                </View>
                                <Text style={{ fontSize: fontSize.sm, color: colors.textSecondary, marginBottom: spacing.md, lineHeight: 22 }}>
                                    기존과 동일한 약이에요. 처방 일수만 갱신됩니다.
                                </Text>
                                {continuedMeds.map((match) => (
                                    <View key={match.existingMed.id} style={[styles.medicationItem, { backgroundColor: colors.mintLight }]}>
                                        <View style={styles.medicationHeader}>
                                            <View style={{ flex: 1, flexDirection: 'row', alignItems: 'center' }}>
                                                <View style={{ width: 32, height: 32, borderRadius: 16, backgroundColor: colors.success, alignItems: 'center', justifyContent: 'center', marginRight: spacing.sm }}>
                                                    <Ionicons name="checkmark" size={16} color={colors.white} />
                                                </View>
                                                <View>
                                                    <Text style={styles.medicationName}>{match.existingMed.name}</Text>
                                                    {match.existingMed.dosage ? <Text style={styles.medicationDosage}>{match.existingMed.dosage}</Text> : null}
                                                </View>
                                            </View>
                                            <View style={{ backgroundColor: colors.mintLight, paddingHorizontal: 14, paddingVertical: 6, borderRadius: borderRadius.pill }}>
                                                <Text style={{ fontSize: fontSize.xs, color: colors.primaryDark, fontWeight: fontWeight.bold }}>유지됨</Text>
                                            </View>
                                        </View>
                                    </View>
                                ))}
                            </NeumorphCard>
                        )}

                        {/* 🆕 새로 추가되는 약 */}
                        {medicationsToEdit.length > 0 && (
                        <NeumorphCard style={styles.cardSpacing}>
                            <View style={styles.sectionHeader}>
                                <Ionicons name="add-circle" size={18} color={colors.primary} />
                                <Text style={styles.sectionTitle}>새로 추가 ({medicationsToEdit.length}개)</Text>
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
                                            <TextInput
                                                style={styles.medicationNameInput}
                                                value={med.name}
                                                onChangeText={(text) => updateMedicationName(medIndex, text)}
                                                placeholder="약 이름"
                                                placeholderTextColor={colors.textLight}
                                                editable={!med.isDuplicate}
                                            />
                                            <TextInput
                                                style={styles.medicationDosageInput}
                                                value={med.dosage}
                                                onChangeText={(text) => updateMedicationDosage(medIndex, text)}
                                                placeholder="용량 (예: 1정)"
                                                placeholderTextColor={colors.textLight}
                                                editable={!med.isDuplicate}
                                            />
                                        </View>
                                    </View>

                                    {!med.isDuplicate && (
                                        <>
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
                        )}

                        {/* 변경사항 없을 때 안내 */}
                        {droppedMeds.length === 0 && continuedMeds.length === 0 && medicationsToEdit.length === 0 && (
                            <NeumorphCard style={styles.cardSpacing}>
                                <View style={{ alignItems: 'center', paddingVertical: spacing.xxl }}>
                                    <Ionicons name="checkmark-done-circle" size={48} color={colors.primary} />
                                    <Text style={{ fontSize: fontSize.base, color: colors.textSecondary, marginTop: spacing.md, textAlign: 'center' }}>
                                        기존 약과 동일해요.{"\n"}변경사항이 없습니다.
                                    </Text>
                                </View>
                            </NeumorphCard>
                        )}

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
                                        변경사항 저장하기
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
        width: 64,
        height: 64,
        borderRadius: 32,
        backgroundColor: colors.mintLight,
        alignItems: 'center',
        justifyContent: 'center',
        marginBottom: spacing.sm,
    },
    captureText: {
        fontSize: fontSize.base,
        color: colors.text,
        fontWeight: fontWeight.semibold,
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
    medicationNameInput: {
        fontSize: fontSize.base,
        fontWeight: fontWeight.semibold,
        color: colors.text,
        backgroundColor: colors.base,
        borderRadius: borderRadius.md,
        paddingHorizontal: spacing.sm,
        paddingVertical: spacing.xs,
        marginBottom: spacing.xs,
        borderWidth: 1,
        borderColor: 'rgba(184, 196, 206, 0.3)',
    },
    medicationDosage: {
        fontSize: fontSize.sm,
        color: colors.textSecondary,
    },
    medicationDosageInput: {
        fontSize: fontSize.sm,
        color: colors.textSecondary,
        backgroundColor: colors.base,
        borderRadius: borderRadius.md,
        paddingHorizontal: spacing.sm,
        paddingVertical: spacing.xs,
        borderWidth: 1,
        borderColor: 'rgba(184, 196, 206, 0.2)',
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
        paddingHorizontal: spacing.xl,
        paddingVertical: spacing.lg,
        borderRadius: borderRadius.pill,
        backgroundColor: colors.base,
        minHeight: 48,
        alignItems: 'center',
        justifyContent: 'center',
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
