/**
 * MedicationsScreen - 뉴모피즘 + 파스텔 약 목록 화면
 * Neumorphism + Pastel Design
 */

import { useEffect, useState } from 'react';
import {
    View,
    Text,
    StyleSheet,
    ScrollView,
    TouchableOpacity,
    ActivityIndicator,
    RefreshControl,
    Platform,
    Alert,
    Modal,
    TextInput,
    KeyboardAvoidingView,
} from 'react-native';
import DateTimePicker from '@react-native-community/datetimepicker';
import { useRouter } from 'expo-router';
import { Ionicons, Feather } from '@expo/vector-icons';
import { useMedicationStore } from '../../services/store';
import { api } from '../../services/api';
import { colors, spacing, borderRadius, fontSize, fontWeight, shadows } from '../../components/theme';
import { GradientBackground } from '../../components/GradientBackground';
import { NeumorphCard, NeumorphIconButton } from '../../components';
import type { Medication, MedicationSchedule } from '../../services/types';

// 기본 복용 시간 매핑
const TIME_PRESETS: { [key: string]: { time_of_day: string; scheduled_time: string; label: string } } = {
    morning: { time_of_day: 'morning', scheduled_time: '08:00', label: '아침' },
    noon: { time_of_day: 'noon', scheduled_time: '12:00', label: '점심' },
    evening: { time_of_day: 'evening', scheduled_time: '18:00', label: '저녁' },
    night: { time_of_day: 'night', scheduled_time: '22:00', label: '취침 전' },
};

interface EditingMedication {
    id: number;
    name: string;
    dosage: string;
    schedules: MedicationSchedule[];
}

export default function MedicationsScreen() {
    const router = useRouter();
    const { medications, fetchMedications, deleteMedication, deleteMedicationGroup, updateMedication, isLoading } = useMedicationStore();
    const [refreshing, setRefreshing] = useState(false);
    const [isEditMode, setIsEditMode] = useState(false);
    const [selectedIds, setSelectedIds] = useState<Set<number>>(new Set());

    // 기간 연장 모달 상태
    const [renewModalVisible, setRenewModalVisible] = useState(false);
    const [renewStartDate, setRenewStartDate] = useState(new Date().toISOString().split('T')[0]);
    const [renewDaysSupply, setRenewDaysSupply] = useState('30');
    const [isRenewing, setIsRenewing] = useState(false);
    const [showRenewDatePicker, setShowRenewDatePicker] = useState(false);
    const [renewPickerDate, setRenewPickerDate] = useState(new Date());

    // 편집 모달 상태
    const [editModalVisible, setEditModalVisible] = useState(false);
    const [editingMed, setEditingMed] = useState<EditingMedication | null>(null);
    const [editName, setEditName] = useState('');
    const [editDosage, setEditDosage] = useState('');
    const [editSchedules, setEditSchedules] = useState<{ [key: string]: boolean }>({
        morning: false,
        noon: false,
        evening: false,
        night: false,
    });
    const [isSaving, setIsSaving] = useState(false);

    useEffect(() => {
        fetchMedications();
    }, []);

    // Edit Mode Toggle: Clear selection when exiting
    useEffect(() => {
        if (!isEditMode) {
            setSelectedIds(new Set());
        }
    }, [isEditMode]);

    const toggleSelection = (id: number) => {
        const newSelected = new Set(selectedIds);
        if (newSelected.has(id)) {
            newSelected.delete(id);
        } else {
            newSelected.add(id);
        }
        setSelectedIds(newSelected);
    };

    const handleSelectAll = () => {
        if (selectedIds.size === medications.length) {
            setSelectedIds(new Set()); // Deselect All
        } else {
            const allIds = new Set(medications.map(m => m.id));
            setSelectedIds(allIds);
        }
    };

    // 그룹 단위 선택/해제
    const toggleGroupSelection = (meds: Medication[]) => {
        const groupIds = meds.map(m => m.id);
        const allSelected = groupIds.every(id => selectedIds.has(id));
        const newSelected = new Set(selectedIds);
        if (allSelected) {
            groupIds.forEach(id => newSelected.delete(id));
        } else {
            groupIds.forEach(id => newSelected.add(id));
        }
        setSelectedIds(newSelected);
    };

    // 그룹 선택 상태 확인
    const getGroupSelectionState = (meds: Medication[]): 'all' | 'some' | 'none' => {
        const groupIds = meds.map(m => m.id);
        const selectedCount = groupIds.filter(id => selectedIds.has(id)).length;
        if (selectedCount === 0) return 'none';
        if (selectedCount === groupIds.length) return 'all';
        return 'some';
    };

    const handleDeleteSelected = () => {
        if (selectedIds.size === 0) return;

        Alert.alert(
            '선택 삭제',
            `선택한 ${selectedIds.size}개의 약을 삭제하시겠습니까?`,
            [
                { text: '취소', style: 'cancel' },
                {
                    text: '삭제',
                    style: 'destructive',
                    onPress: async () => {
                        for (const id of selectedIds) {
                            await deleteMedication(id);
                        }
                        setIsEditMode(false);
                    }
                }
            ]
        );
    };

    const openRenewModal = () => {
        if (selectedIds.size === 0) return;
        setRenewStartDate(new Date().toISOString().split('T')[0]);
        setRenewPickerDate(new Date());
        setRenewDaysSupply('30');
        setRenewModalVisible(true);
    };

    const handleRenewDateChange = (event: any, selected?: Date) => {
        if (Platform.OS === 'android') setShowRenewDatePicker(false);
        if (!selected || event.type === 'dismissed') return;
        setRenewPickerDate(selected);
        setRenewStartDate(selected.toISOString().split('T')[0]);
    };

    const handleRenew = async () => {
        const days = parseInt(renewDaysSupply);
        if (!days || days <= 0) {
            Alert.alert('오류', '올바른 처방 일수를 입력해주세요.');
            return;
        }
        setIsRenewing(true);
        try {
            const medsToRenew = [...selectedIds].map(id => ({
                id,
                start_date: renewStartDate,
                days_supply: days,
            }));
            await api.medications.batchRenew(medsToRenew);
            setRenewModalVisible(false);
            setIsEditMode(false);
            await fetchMedications();
            Alert.alert('완료', `${selectedIds.size}개 약의 복약 기간이 연장되었습니다.`);
        } catch {
            Alert.alert('오류', '기간 연장에 실패했습니다.');
        } finally {
            setIsRenewing(false);
        }
    };

    const getRenewEndDate = () => {
        const days = parseInt(renewDaysSupply);
        if (!renewStartDate || !days || days <= 0) return null;
        const d = new Date(renewStartDate + 'T00:00:00');
        d.setDate(d.getDate() + days);
        return d.toLocaleDateString('ko-KR', { month: 'long', day: 'numeric' });
    };

    const onRefresh = async () => {
        setRefreshing(true);
        await fetchMedications();
        setRefreshing(false);
    };

    const handleDelete = (id: number, name: string) => {
        Alert.alert(
            '약 삭제',
            `'${name}'을(를) 삭제하시겠습니까?`,
            [
                { text: '취소', style: 'cancel' },
                {
                    text: '삭제',
                    style: 'destructive',
                    onPress: async () => {
                        await deleteMedication(id);
                    }
                }
            ]
        );
    };

    const handleDeleteGroup = (groupId: number, groupName: string) => {
        Alert.alert(
            '그룹 삭제',
            `'${groupName}' 그룹과 포함된 약을 모두 삭제하시겠습니까?`,
            [
                { text: '취소', style: 'cancel' },
                {
                    text: '그룹 삭제',
                    style: 'destructive',
                    onPress: async () => {
                        await deleteMedicationGroup(groupId);
                    }
                }
            ]
        );
    };

    // 편집 모달 열기
    const openEditModal = (med: Medication) => {
        if (isEditMode) return; // 편집 모드(다중 선택)에서는 탭으로 편집 불가

        setEditingMed({
            id: med.id,
            name: med.name,
            dosage: med.dosage || '',
            schedules: med.schedules || [],
        });
        setEditName(med.name);
        setEditDosage(med.dosage || '');

        // 현재 스케줄 상태 초기화
        const scheduleState: { [key: string]: boolean } = {
            morning: false,
            noon: false,
            evening: false,
            night: false,
        };
        med.schedules?.forEach((s) => {
            if (s.time_of_day && scheduleState.hasOwnProperty(s.time_of_day)) {
                scheduleState[s.time_of_day] = true;
            }
        });
        setEditSchedules(scheduleState);
        setEditModalVisible(true);
    };

    // 스케줄 토글
    const toggleEditSchedule = (timeOfDay: string) => {
        setEditSchedules((prev) => ({
            ...prev,
            [timeOfDay]: !prev[timeOfDay],
        }));
    };

    // 편집 저장
    const handleSaveEdit = async () => {
        if (!editingMed) return;
        if (!editName.trim()) {
            Alert.alert('오류', '약 이름을 입력해주세요.');
            return;
        }

        // 최소 하나의 스케줄 필요
        const hasSchedule = Object.values(editSchedules).some((v) => v);
        if (!hasSchedule) {
            Alert.alert('오류', '최소 하나의 복용 시간을 선택해주세요.');
            return;
        }

        setIsSaving(true);
        try {
            // 스케줄 변경사항 계산
            const currentScheduleTimes = editingMed.schedules.map((s) => s.time_of_day);
            const schedulesToRemove = editingMed.schedules
                .filter((s) => !editSchedules[s.time_of_day])
                .map((s) => s.id);
            const schedulesToAdd = Object.entries(editSchedules)
                .filter(([timeOfDay, enabled]) => enabled && !currentScheduleTimes.includes(timeOfDay))
                .map(([timeOfDay]) => ({
                    time_of_day: timeOfDay,
                    scheduled_time: TIME_PRESETS[timeOfDay].scheduled_time,
                }));

            await updateMedication(
                editingMed.id,
                { name: editName.trim(), dosage: editDosage.trim() },
                { add: schedulesToAdd, remove: schedulesToRemove }
            );

            setEditModalVisible(false);
            setEditingMed(null);
        } catch (error) {
            Alert.alert('오류', '약 수정에 실패했습니다.');
        } finally {
            setIsSaving(false);
        }
    };

    // ... (groupedMedications logic unchanged) ...
    const groupedMedications = medications.reduce((acc, med) => {
        const groupName = med.group_name || '기타';
        if (!acc[groupName]) {
            acc[groupName] = [];
        }
        acc[groupName].push(med);
        return acc;
    }, {} as Record<string, typeof medications>);

    return (
        <GradientBackground variant="ocean" style={styles.container}>
            <ScrollView
                style={styles.scrollView}
                contentContainerStyle={styles.content}
                showsVerticalScrollIndicator={false}
                refreshControl={
                    <RefreshControl
                        refreshing={refreshing}
                        onRefresh={onRefresh}
                        tintColor={colors.primary}
                        colors={[colors.primary]}
                    />
                }
            >
                {/* 중앙 헤더 (buttons moved to absolute view) */}
                <View style={styles.header}>
                    <NeumorphIconButton style={styles.headerIconBtn}>
                        <Ionicons name="medical" size={32} color={colors.primary} />
                    </NeumorphIconButton>
                    <Text style={styles.headerTitle}>내 약 목록</Text>
                </View>

                {/* 약 목록 */}
                {isLoading && !refreshing ? (
                    <NeumorphCard style={styles.loadingCard}>
                        <View style={styles.loadingContainer}>
                            <ActivityIndicator size="large" color={colors.primary} />
                            <Text style={styles.loadingText}>로딩 중...</Text>
                        </View>
                    </NeumorphCard>
                ) : medications.length === 0 ? (
                    <NeumorphCard style={styles.emptyCard}>
                        <View style={styles.emptyIconCircle}>
                            <Ionicons name="document-text-outline" size={32} color={colors.primary} />
                        </View>
                        <Text style={styles.emptyText}>등록된 약이 없습니다</Text>
                        <Text style={styles.emptySubtext}>
                            아래 버튼을 눌러 약을 추가해보세요
                        </Text>
                    </NeumorphCard>
                ) : (
                    Object.entries(groupedMedications).map(([groupName, meds]) => {
                        const groupState = getGroupSelectionState(meds);
                        return (
                        <View key={groupName} style={styles.groupSection}>
                            {/* 그룹 헤더 */}
                            <View style={styles.groupHeader}>
                                    <View style={styles.groupTitleRow}>
                                        <View style={styles.groupIconCircle}>
                                            <Feather name="folder" size={14} color={colors.primary} />
                                        </View>
                                        <Text style={styles.groupName}>{groupName}</Text>
                                        <View style={styles.countBadge}>
                                            <Text style={styles.countBadgeText}>{meds.length}</Text>
                                        </View>
                                    </View>

                                {/* Group Delete Button (Edit Mode) */}
                                {isEditMode && meds[0]?.group_id && (
                                    <TouchableOpacity
                                        style={styles.groupDeleteButton}
                                        onPress={() => handleDeleteGroup(meds[0].group_id!, groupName)}
                                    >
                                        <Text style={styles.groupDeleteText}>그룹 삭제</Text>
                                        <Ionicons name="trash-outline" size={14} color={colors.dangerDark} />
                                    </TouchableOpacity>
                                )}
                            </View>

                            {/* 약품 카드들 */}
                            {meds.map((med) => {
                                const isSelected = selectedIds.has(med.id);
                                return (
                                <View key={med.id}>
                                    <TouchableOpacity
                                        activeOpacity={0.8}
                                        onPress={() => isEditMode ? toggleSelection(med.id) : openEditModal(med)}
                                    >
                                        <NeumorphCard style={styles.medicationCard}>
                                            <View style={styles.cardHeader}>
                                                {isEditMode && (
                                                    <View style={[styles.checkbox, isSelected && styles.checkboxSelected]}>
                                                        {isSelected && <Ionicons name="checkmark" size={16} color="white" />}
                                                    </View>
                                                )}
                                                <Text style={styles.medicationName}>{med.name}</Text>
                                                {!isEditMode && (
                                                    <View style={[
                                                        styles.statusBadge,
                                                        med.is_active ? styles.statusActive : styles.statusInactive
                                                    ]}>
                                                        <Text style={[
                                                            styles.statusText,
                                                            med.is_active ? styles.statusTextActive : styles.statusTextInactive
                                                        ]}>
                                                            {med.is_active ? '복용 중' : '중단'}
                                                        </Text>
                                                    </View>
                                                )}
                                            </View>

                                            {med.dosage && (
                                                <Text style={styles.dosage}>{med.dosage}</Text>
                                            )}

                                            {/* 복용 시간 태그 */}
                                            {med.schedules && med.schedules.length > 0 && (
                                                <View style={styles.scheduleRow}>
                                                    {med.schedules.map((schedule) => (
                                                        <View key={schedule.id} style={styles.scheduleTag}>
                                                            <Ionicons name="time-outline" size={12} color={colors.primary} />
                                                            <Text style={styles.scheduleTagText}>
                                                                {schedule.time_of_day_display} {schedule.scheduled_time?.slice(0, 5)}
                                                            </Text>
                                                        </View>
                                                    ))}
                                                </View>
                                            )}

                                            {/* 편집 힌트 */}
                                            {!isEditMode && (
                                                <View style={styles.editHint}>
                                                    <Ionicons name="create-outline" size={14} color={colors.textLight} />
                                                    <Text style={styles.editHintText}>탭하여 편집</Text>
                                                </View>
                                            )}
                                        </NeumorphCard>
                                    </TouchableOpacity>
                                </View>
                            );})}
                        </View>
                    );})
                )}

                {/* 하단 여백 */}
                <View style={{ height: 140 }} />
            </ScrollView>

            <View style={styles.absoluteTopBar} pointerEvents="box-none">
                <TouchableOpacity
                    style={styles.backButton}
                    onPress={() => router.back()}
                    activeOpacity={0.8}
                >
                    <View style={styles.backButtonInner}>
                        <Ionicons name="chevron-back" size={22} color={colors.text} />
                    </View>
                </TouchableOpacity>

                <TouchableOpacity
                    style={[styles.editButton, isEditMode && styles.editButtonActive]}
                    onPress={() => setIsEditMode(!isEditMode)}
                    activeOpacity={0.8}
                >
                    <Text style={[styles.editButtonText, isEditMode && styles.editButtonTextActive]}>
                        {isEditMode ? '완료' : '편집'}
                    </Text>
                </TouchableOpacity>
            </View>

            {isEditMode ? (
                /* 편집 모드 액션 바 */
                <View style={styles.actionBar}>
                    <Text style={styles.actionBarCount}>
                        {selectedIds.size > 0 ? `${selectedIds.size}개 선택됨` : '약을 선택하세요'}
                    </Text>
                    <View style={styles.actionBarButtons}>
                        <TouchableOpacity
                            style={[styles.actionBarBtn, selectedIds.size === 0 && styles.actionBarBtnDisabled]}
                            onPress={handleDeleteSelected}
                            disabled={selectedIds.size === 0}
                            activeOpacity={0.8}
                        >
                            <Ionicons name="trash-outline" size={16} color={selectedIds.size > 0 ? colors.dangerDark : colors.textLight} />
                            <Text style={[styles.actionBarBtnText, { color: selectedIds.size > 0 ? colors.dangerDark : colors.textLight }]}>삭제</Text>
                        </TouchableOpacity>
                        <TouchableOpacity
                            style={[styles.actionBarBtn, styles.actionBarBtnPrimary, selectedIds.size === 0 && styles.actionBarBtnDisabled]}
                            onPress={openRenewModal}
                            disabled={selectedIds.size === 0}
                            activeOpacity={0.8}
                        >
                            <Ionicons name="refresh" size={16} color={selectedIds.size > 0 ? colors.primary : colors.textLight} />
                            <Text style={[styles.actionBarBtnText, { color: selectedIds.size > 0 ? colors.primary : colors.textLight }]}>기간 연장</Text>
                        </TouchableOpacity>
                    </View>
                </View>
            ) : (
                /* 약 추가 FAB 버튼들 */
                <View style={styles.fabRow}>
                    <TouchableOpacity onPress={() => router.push('/medications/scan' as any)} style={{ flex: 1 }} activeOpacity={0.8}>
                        <View style={styles.fabContainer}>
                            <View style={[styles.fabShadow, { shadowColor: colors.primary }]} />
                            <View style={styles.fabShadowLight} />
                            <View style={[styles.fabSurface, { backgroundColor: colors.primary }]}>
                                <Ionicons name="camera" size={20} color={colors.white} />
                                <Text style={styles.fabText}>처방전 스캔</Text>
                            </View>
                        </View>
                    </TouchableOpacity>
                    <TouchableOpacity onPress={() => router.push('/medications/add')} style={{ flex: 1 }} activeOpacity={0.8}>
                        <View style={styles.fabContainer}>
                            <View style={styles.fabShadow} />
                            <View style={styles.fabShadowLight} />
                            <View style={[styles.fabSurface, { backgroundColor: colors.base }]}>
                                <Ionicons name="add" size={20} color={colors.primary} />
                                <Text style={[styles.fabText, { color: colors.primary }]}>직접 추가</Text>
                            </View>
                        </View>
                    </TouchableOpacity>
                </View>
            )}

            {/* 편집 모달 */}
            <Modal
                visible={editModalVisible}
                animationType="slide"
                transparent={true}
                onRequestClose={() => setEditModalVisible(false)}
            >
                <View style={styles.modalOverlay}>
                    <View style={styles.modalContent}>
                        <View style={styles.modalHeader}>
                            <Text style={styles.modalTitle}>약 정보 편집</Text>
                            <TouchableOpacity onPress={() => setEditModalVisible(false)}>
                                <Ionicons name="close" size={24} color={colors.text} />
                            </TouchableOpacity>
                        </View>

                        {/* 약 이름 */}
                        <Text style={styles.inputLabel}>약 이름</Text>
                        <TextInput
                            style={styles.textInput}
                            value={editName}
                            onChangeText={setEditName}
                            placeholder="약 이름을 입력하세요"
                            placeholderTextColor={colors.textLight}
                        />

                        {/* 용량 */}
                        <Text style={styles.inputLabel}>용량</Text>
                        <TextInput
                            style={styles.textInput}
                            value={editDosage}
                            onChangeText={setEditDosage}
                            placeholder="예: 1정, 2알"
                            placeholderTextColor={colors.textLight}
                        />

                        {/* 복용 시간 */}
                        <Text style={styles.inputLabel}>복용 시간</Text>
                        <View style={styles.scheduleButtons}>
                            {Object.entries(TIME_PRESETS).map(([key, preset]) => (
                                <TouchableOpacity
                                    key={key}
                                    style={[
                                        styles.scheduleButton,
                                        editSchedules[key] && styles.scheduleButtonActive
                                    ]}
                                    onPress={() => toggleEditSchedule(key)}
                                >
                                    <Text style={[
                                        styles.scheduleButtonText,
                                        editSchedules[key] && styles.scheduleButtonTextActive
                                    ]}>
                                        {preset.label}
                                    </Text>
                                </TouchableOpacity>
                            ))}
                        </View>

                        {/* 저장 버튼 */}
                        <TouchableOpacity
                            style={[styles.saveButton, isSaving && styles.saveButtonDisabled]}
                            onPress={handleSaveEdit}
                            disabled={isSaving}
                        >
                            {isSaving ? (
                                <ActivityIndicator color="white" />
                            ) : (
                                <Text style={styles.saveButtonText}>저장</Text>
                            )}
                        </TouchableOpacity>
                    </View>
                </View>
            </Modal>
            {/* 기간 연장 모달 */}
            <Modal
                visible={renewModalVisible}
                animationType="slide"
                transparent
                onRequestClose={() => setRenewModalVisible(false)}
            >
                <KeyboardAvoidingView behavior={Platform.OS === 'ios' ? 'padding' : 'height'} style={{ flex: 1 }}>
                    <View style={styles.modalOverlay}>
                        <View style={styles.renewModalContent}>
                            <View style={styles.modalHeader}>
                                <Text style={styles.modalTitle}>복약 기간 연장</Text>
                                <TouchableOpacity onPress={() => setRenewModalVisible(false)}>
                                    <Ionicons name="close" size={24} color={colors.text} />
                                </TouchableOpacity>
                            </View>

                            <Text style={styles.renewSubtitle}>
                                {selectedIds.size}개 약의 새 복약 기간을 설정합니다
                            </Text>

                            <Text style={styles.inputLabel}>복용 시작일</Text>
                            <TouchableOpacity
                                style={styles.datePickerButton}
                                onPress={() => setShowRenewDatePicker(true)}
                                activeOpacity={0.7}
                            >
                                <Ionicons name="calendar-outline" size={18} color={colors.primary} />
                                <Text style={styles.datePickerButtonText}>
                                    {new Date(renewStartDate + 'T00:00:00').toLocaleDateString('ko-KR', {
                                        year: 'numeric', month: 'long', day: 'numeric'
                                    })}
                                </Text>
                                <Ionicons name="chevron-forward" size={16} color={colors.textLight} />
                            </TouchableOpacity>

                            <Text style={styles.inputLabel}>처방 일수</Text>
                            <View style={styles.daysInputRow}>
                                <TextInput
                                    style={styles.daysInput}
                                    value={renewDaysSupply}
                                    onChangeText={(t) => setRenewDaysSupply(t.replace(/[^0-9]/g, ''))}
                                    keyboardType="number-pad"
                                    maxLength={3}
                                />
                                <Text style={styles.daysUnit}>일</Text>
                            </View>

                            {getRenewEndDate() && (
                                <View style={styles.endDateDisplay}>
                                    <Ionicons name="calendar" size={16} color={colors.primary} />
                                    <Text style={styles.endDateText}>
                                        다음 병원 방문 예정일: {getRenewEndDate()}
                                    </Text>
                                </View>
                            )}

                            <TouchableOpacity
                                style={[styles.saveButton, isRenewing && styles.saveButtonDisabled]}
                                onPress={handleRenew}
                                disabled={isRenewing}
                            >
                                {isRenewing ? (
                                    <ActivityIndicator color="white" />
                                ) : (
                                    <Text style={styles.saveButtonText}>연장 적용</Text>
                                )}
                            </TouchableOpacity>
                        </View>
                    </View>
                </KeyboardAvoidingView>
            </Modal>

            {/* iOS 날짜 피커 */}
            {Platform.OS === 'ios' && showRenewDatePicker && (
                <Modal visible transparent animationType="slide">
                    <View style={styles.iosPickerModal}>
                        <View style={styles.iosPickerContainer}>
                            <View style={styles.iosPickerHeader}>
                                <TouchableOpacity onPress={() => setShowRenewDatePicker(false)}>
                                    <Text style={styles.iosPickerCancel}>취소</Text>
                                </TouchableOpacity>
                                <TouchableOpacity onPress={() => {
                                    setRenewStartDate(renewPickerDate.toISOString().split('T')[0]);
                                    setShowRenewDatePicker(false);
                                }}>
                                    <Text style={styles.iosPickerDone}>확인</Text>
                                </TouchableOpacity>
                            </View>
                            <DateTimePicker
                                value={renewPickerDate}
                                mode="date"
                                display="spinner"
                                onChange={(e, d) => { if (d) setRenewPickerDate(d); }}
                                style={{ height: 200 }}
                                textColor={colors.text}
                            />
                        </View>
                    </View>
                </Modal>
            )}
            {Platform.OS === 'android' && showRenewDatePicker && (
                <DateTimePicker
                    value={renewPickerDate}
                    mode="date"
                    display="default"
                    onChange={handleRenewDateChange}
                />
            )}
        </GradientBackground>
    );
}

const styles = StyleSheet.create({
    // ... existing styles ...
    container: {
        flex: 1,
        backgroundColor: colors.base,
    },
    scrollView: {
        flex: 1,
    },
    content: {
        padding: spacing.xl,
        paddingTop: Platform.OS === 'ios' ? 60 : 50,
    },

    topBar: {
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'space-between',
        marginBottom: spacing.md,
    },
    // 상단 절대 위치 바
    absoluteTopBar: {
        position: 'absolute',
        top: Platform.OS === 'ios' ? 60 : 50,
        left: spacing.xl,
        right: spacing.xl,
        flexDirection: 'row',
        justifyContent: 'space-between',
        alignItems: 'center',
        zIndex: 10,
    },
    header: {
        alignItems: 'center',
        marginBottom: spacing.xxl,
    },
    headerIconBtn: {
        marginBottom: spacing.lg,
    },
    // ... (rest of styles, need to ensure I don't break them)
    backButton: {
        position: 'relative',
    },
    backButtonInner: {
        width: 44,
        height: 44,
        borderRadius: 22,
        backgroundColor: colors.base,
        alignItems: 'center',
        justifyContent: 'center',
        ...shadows.soft,
    },
    headerTitle: {
        fontSize: fontSize.xxl,
        fontWeight: fontWeight.bold,
        color: colors.text,
    },
    editButton: {
        paddingHorizontal: spacing.lg,
        paddingVertical: spacing.sm,
        borderRadius: borderRadius.pill,
        backgroundColor: colors.base,
        ...shadows.soft,
    },
    editButtonActive: {
        backgroundColor: colors.primary,
    },
    editButtonText: {
        fontSize: fontSize.sm,
        color: colors.primary,
        fontWeight: fontWeight.semibold,
    },
    editButtonTextActive: {
        color: 'white',
    },


    // 로딩
    loadingCard: {
        paddingVertical: spacing.xxxl,
    },
    loadingContainer: {
        alignItems: 'center',
    },
    loadingText: {
        marginTop: spacing.md,
        fontSize: fontSize.base,
        color: colors.textSecondary,
    },

    // 빈 상태
    emptyCard: {
        alignItems: 'center',
        paddingVertical: spacing.xxxxl,
    },
    emptyIconCircle: {
        width: 80,
        height: 80,
        borderRadius: 40,
        backgroundColor: colors.mintLight,  // 민트 테마와 통일
        alignItems: 'center',
        justifyContent: 'center',
        marginBottom: spacing.lg,
    },
    emptyEmoji: {
        fontSize: 36,
    },
    emptyText: {
        fontSize: fontSize.lg,
        color: colors.text,
        fontWeight: fontWeight.semibold,
        marginBottom: spacing.xs,
    },
    emptySubtext: {
        fontSize: fontSize.sm,
        color: colors.textLight,
    },

    // 그룹 섹션
    groupSection: {
        marginBottom: spacing.xl,
    },
    groupHeader: {
        marginBottom: spacing.md,
    },
    groupTitleRow: {
        flexDirection: 'row',
        alignItems: 'center',
    },
    groupIconCircle: {
        width: 32,
        height: 32,
        borderRadius: 16,
        backgroundColor: colors.mintLight,
        alignItems: 'center',
        justifyContent: 'center',
        marginRight: spacing.sm,
    },
    groupCheckbox: {
        width: 24,
        height: 24,
        borderRadius: 12,
        borderWidth: 2,
        borderColor: colors.textLight,
        backgroundColor: colors.white,
        alignItems: 'center',
        justifyContent: 'center',
        marginRight: spacing.sm,
    },
    groupCheckboxSelected: {
        backgroundColor: colors.primary,
        borderColor: colors.primary,
    },
    groupCheckboxPartial: {
        backgroundColor: colors.primaryLight,
        borderColor: colors.primary,
    },
    groupName: {
        fontSize: fontSize.lg,
        fontWeight: fontWeight.bold,
        color: colors.text,
        flex: 1,
    },
    countBadge: {
        width: 28,
        height: 28,
        borderRadius: 14,
        backgroundColor: colors.mintLight,
        alignItems: 'center',
        justifyContent: 'center',
    },
    countBadgeText: {
        fontSize: fontSize.xs,
        fontWeight: fontWeight.bold,
        color: colors.primary,
    },

    // 약품 카드
    medicationCard: {
        marginBottom: spacing.md,
    },
    cardHeader: {
        flexDirection: 'row',
        justifyContent: 'space-between',
        alignItems: 'center',
        marginBottom: spacing.xs,
    },
    medicationName: {
        fontSize: fontSize.base,
        fontWeight: fontWeight.bold,
        color: colors.text,
        flex: 1,
    },
    statusBadge: {
        paddingHorizontal: spacing.md,
        paddingVertical: spacing.xs,
        borderRadius: borderRadius.pill,
    },
    statusActive: {
        backgroundColor: colors.mintLight,
    },
    statusInactive: {
        backgroundColor: colors.peachLight,
    },
    statusText: {
        fontSize: fontSize.xs,
        fontWeight: fontWeight.semibold,
    },
    statusTextActive: {
        color: colors.primaryDark,
    },
    statusTextInactive: {
        color: colors.peachDark,
    },
    dosage: {
        fontSize: fontSize.sm,
        color: colors.textSecondary,
        marginBottom: spacing.sm,
    },

    // 스케줄 태그
    scheduleRow: {
        flexDirection: 'row',
        flexWrap: 'wrap',
        gap: spacing.sm,
        marginTop: spacing.sm,
    },
    scheduleTag: {
        flexDirection: 'row',
        alignItems: 'center',
        backgroundColor: colors.blueLight,
        paddingHorizontal: spacing.md,
        paddingVertical: spacing.xs,
        borderRadius: borderRadius.pill,
        gap: spacing.xs,
    },
    scheduleTagText: {
        fontSize: fontSize.xs,
        color: colors.blueDark,
        fontWeight: fontWeight.medium,
    },

    // 삭제 버튼 배지
    deleteButtonBadge: {
        position: 'absolute',
        top: -8,
        right: -4,
        width: 28,
        height: 28,
        borderRadius: 14,
        backgroundColor: '#FF5252',
        alignItems: 'center',
        justifyContent: 'center',
        zIndex: 10,
        elevation: 6,
        shadowColor: '#FF5252',
        shadowOffset: { width: 0, height: 2 },
        shadowOpacity: 0.3,
        shadowRadius: 4,
    },

    // FAB 버튼
    fabRow: {
        position: 'absolute',
        bottom: Platform.OS === 'ios' ? 100 : 90,
        left: spacing.xl,
        right: spacing.xl,
        flexDirection: 'row',
        gap: spacing.md,
    },
    fabContainer: {
        position: 'relative',
        borderRadius: borderRadius.pill,
        overflow: 'visible',
    },

    // 선택 모드 UI
    selectionOverlay: {
        position: 'absolute',
        top: -8,
        right: -4,
        zIndex: 10,
    },
    // 카드 내 삭제 버튼
    cardDeleteButton: {
        width: 44,
        height: 44,
        borderRadius: 22,
        backgroundColor: colors.dangerLight,
        alignItems: 'center' as const,
        justifyContent: 'center' as const,
    },
    // 그룹 삭제 버튼
    groupDeleteButton: {
        flexDirection: 'row',
        alignItems: 'center',
        backgroundColor: colors.danger + '20', // Opacity 20%
        paddingHorizontal: spacing.md,
        paddingVertical: 4,
        borderRadius: borderRadius.md,
        gap: 4,
    },
    groupDeleteText: {
        fontSize: fontSize.xs,
        color: colors.dangerDark,
        fontWeight: fontWeight.bold,
    },
    checkbox: {
        width: 28,
        height: 28,
        borderRadius: 14,
        backgroundColor: colors.white,
        borderWidth: 2,
        borderColor: colors.textLight,
        alignItems: 'center',
        justifyContent: 'center',
        marginRight: spacing.md,
        ...shadows.soft,
    },
    checkboxSelected: {
        backgroundColor: colors.primary,
        borderColor: colors.primary,
    },
    selectAllButton: {
        paddingVertical: spacing.sm,
        paddingHorizontal: spacing.md,
    },
    selectAllText: {
        fontSize: fontSize.base,
        fontWeight: fontWeight.bold,
        color: colors.primary,
    },
    fabShadow: {
        ...StyleSheet.absoluteFillObject,
        backgroundColor: colors.base,
        borderRadius: borderRadius.pill,
        shadowColor: '#B8C4CE',
        shadowOffset: { width: 6, height: 6 },
        shadowOpacity: 0.6,
        shadowRadius: 10,
        elevation: 8,
    },
    fabShadowLight: {
        ...StyleSheet.absoluteFillObject,
        backgroundColor: colors.base,
        borderRadius: borderRadius.pill,
        shadowColor: '#FFFFFF',
        shadowOffset: { width: -4, height: -4 },
        shadowOpacity: 1,
        shadowRadius: 6,
        elevation: 0,
    },
    fabSurface: {
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'center',
        paddingVertical: spacing.lg,
        paddingHorizontal: spacing.xl,
        borderRadius: borderRadius.pill,
        gap: spacing.sm,
    },
    fabText: {
        fontSize: fontSize.sm,
        fontWeight: fontWeight.bold,
        color: colors.white,
    },

    // 편집 힌트
    editHint: {
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'flex-end',
        marginTop: spacing.sm,
        gap: spacing.xs,
    },
    editHintText: {
        fontSize: fontSize.xs,
        color: colors.textLight,
    },


    // 편집 모드 액션 바
    actionBar: {
        position: 'absolute',
        bottom: Platform.OS === 'ios' ? 100 : 90,
        left: spacing.xl,
        right: spacing.xl,
        backgroundColor: colors.base,
        borderRadius: borderRadius.xxl,
        paddingVertical: spacing.md,
        paddingHorizontal: spacing.xl,
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'space-between',
        ...shadows.dark,
    },
    actionBarCount: {
        fontSize: fontSize.sm,
        fontWeight: fontWeight.semibold,
        color: colors.textSecondary,
        flex: 1,
    },
    actionBarButtons: {
        flexDirection: 'row',
        gap: spacing.sm,
    },
    actionBarBtn: {
        flexDirection: 'row',
        alignItems: 'center',
        gap: spacing.xs,
        paddingVertical: spacing.sm,
        paddingHorizontal: spacing.md,
        borderRadius: borderRadius.pill,
        backgroundColor: colors.baseLight,
        borderWidth: 1,
        borderColor: colors.baseDark,
    },
    actionBarBtnPrimary: {
        borderColor: colors.primary + '50',
        backgroundColor: colors.mintLight,
    },
    actionBarBtnDisabled: {
        opacity: 0.4,
    },
    actionBarBtnText: {
        fontSize: fontSize.sm,
        fontWeight: fontWeight.semibold,
    },

    // 기간 연장 모달
    renewModalContent: {
        backgroundColor: colors.base,
        borderTopLeftRadius: borderRadius.xxl,
        borderTopRightRadius: borderRadius.xxl,
        padding: spacing.xl,
        paddingBottom: Platform.OS === 'ios' ? 40 : spacing.xl,
    },
    renewSubtitle: {
        fontSize: fontSize.sm,
        color: colors.textSecondary,
        marginBottom: spacing.lg,
    },
    datePickerButton: {
        flexDirection: 'row',
        alignItems: 'center',
        gap: spacing.sm,
        padding: spacing.md,
        backgroundColor: colors.baseLight,
        borderRadius: borderRadius.md,
        borderWidth: 1,
        borderColor: colors.baseDark,
        marginBottom: spacing.sm,
    },
    datePickerButtonText: {
        flex: 1,
        fontSize: fontSize.base,
        color: colors.text,
    },
    daysInputRow: {
        flexDirection: 'row',
        alignItems: 'center',
        gap: spacing.sm,
        marginBottom: spacing.sm,
    },
    daysInput: {
        flex: 1,
        fontSize: fontSize.xl,
        fontWeight: fontWeight.bold,
        color: colors.primary,
        padding: spacing.md,
        backgroundColor: colors.baseLight,
        borderRadius: borderRadius.md,
        borderWidth: 1,
        borderColor: colors.primary + '40',
        textAlign: 'center',
    },
    daysUnit: {
        fontSize: fontSize.lg,
        color: colors.textSecondary,
        width: 28,
    },
    endDateDisplay: {
        flexDirection: 'row',
        alignItems: 'center',
        gap: spacing.sm,
        backgroundColor: colors.mintLight,
        padding: spacing.md,
        borderRadius: borderRadius.md,
        marginBottom: spacing.md,
    },
    endDateText: {
        fontSize: fontSize.sm,
        color: colors.primaryDark,
        fontWeight: fontWeight.medium,
    },

    // iOS 날짜 피커 모달
    iosPickerModal: {
        flex: 1,
        justifyContent: 'flex-end',
        backgroundColor: 'rgba(0,0,0,0.4)',
    },
    iosPickerContainer: {
        backgroundColor: colors.base,
        borderTopLeftRadius: borderRadius.xl,
        borderTopRightRadius: borderRadius.xl,
        paddingBottom: 30,
    },
    iosPickerHeader: {
        flexDirection: 'row',
        justifyContent: 'space-between',
        alignItems: 'center',
        padding: spacing.lg,
        borderBottomWidth: 1,
        borderBottomColor: 'rgba(0,0,0,0.08)',
    },
    iosPickerCancel: {
        fontSize: fontSize.base,
        color: colors.textSecondary,
    },
    iosPickerDone: {
        fontSize: fontSize.base,
        color: colors.primary,
        fontWeight: fontWeight.bold,
    },

    // 편집 모달
    modalOverlay: {
        flex: 1,
        backgroundColor: 'rgba(0, 0, 0, 0.5)',
        justifyContent: 'flex-end',
    },
    modalContent: {
        backgroundColor: colors.base,
        borderTopLeftRadius: borderRadius.xxl,
        borderTopRightRadius: borderRadius.xxl,
        padding: spacing.xl,
        paddingBottom: Platform.OS === 'ios' ? 40 : spacing.xl,
    },
    modalHeader: {
        flexDirection: 'row',
        justifyContent: 'space-between',
        alignItems: 'center',
        marginBottom: spacing.xl,
    },
    modalTitle: {
        fontSize: fontSize.xl,
        fontWeight: fontWeight.bold,
        color: colors.text,
    },
    inputLabel: {
        fontSize: fontSize.sm,
        fontWeight: fontWeight.semibold,
        color: colors.textSecondary,
        marginBottom: spacing.xs,
        marginTop: spacing.md,
    },
    textInput: {
        backgroundColor: colors.baseLight,
        borderRadius: borderRadius.md,
        padding: spacing.md,
        fontSize: fontSize.base,
        color: colors.text,
        borderWidth: 1,
        borderColor: colors.baseDark,
    },
    scheduleButtons: {
        flexDirection: 'row',
        flexWrap: 'wrap',
        gap: spacing.sm,
        marginTop: spacing.sm,
    },
    scheduleButton: {
        paddingHorizontal: spacing.lg,
        paddingVertical: spacing.md,
        borderRadius: borderRadius.pill,
        backgroundColor: colors.baseLight,
        borderWidth: 1,
        borderColor: colors.baseDark,
    },
    scheduleButtonActive: {
        backgroundColor: colors.primary,
        borderColor: colors.primary,
    },
    scheduleButtonText: {
        fontSize: fontSize.sm,
        fontWeight: fontWeight.medium,
        color: colors.text,
    },
    scheduleButtonTextActive: {
        color: colors.white,
    },
    saveButton: {
        backgroundColor: colors.primary,
        borderRadius: borderRadius.pill,
        paddingVertical: spacing.lg,
        alignItems: 'center',
        justifyContent: 'center',
        marginTop: spacing.xl,
    },
    saveButtonDisabled: {
        opacity: 0.5,
    },
    saveButtonText: {
        fontSize: fontSize.base,
        fontWeight: fontWeight.bold,
        color: colors.white,
    },
});
