import { useState, useEffect } from 'react';
import { View, Text, StyleSheet, TextInput, Alert, TouchableOpacity, ScrollView, Linking, Modal, KeyboardAvoidingView, Platform } from 'react-native';
import { useRouter } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import { useMedicationStore } from '../../services/store';
import { api } from '../../services/api';
import { GuardianRelation, EmergencyContact } from '../../services/types';
import { colors, spacing, borderRadius, fontSize, fontWeight, shadows } from '../../components/theme';
import { GradientBackground } from '../../components/GradientBackground';
import { NeumorphCard } from '../../components';

export default function EmergencyContactScreen() {
    const router = useRouter();
    const { user, setUser } = useMedicationStore();

    // Multiple emergency contacts list
    const [contacts, setContacts] = useState<EmergencyContact[]>([]);
    const [loadingContacts, setLoadingContacts] = useState(true);

    // Modal state for add/edit contact
    const [modalVisible, setModalVisible] = useState(false);
    const [editingContact, setEditingContact] = useState<EmergencyContact | null>(null);
    const [formName, setFormName] = useState('');
    const [formRelation, setFormRelation] = useState('');
    const [formPhone, setFormPhone] = useState('');
    const [formEmail, setFormEmail] = useState('');
    const [saving, setSaving] = useState(false);

    // Guardian relations (App Users)
    const [guardians, setGuardians] = useState<GuardianRelation[]>([]);
    const [loadingGuardians, setLoadingGuardians] = useState(true);

    useEffect(() => {
        fetchContacts();
        fetchGuardians();
    }, []);

    const fetchContacts = async () => {
        try {
            const res = await api.emergencyContacts.list();
            if (res.data.results) {
                setContacts(res.data.results);
            }
        } catch (error) {
            console.error('Fetch contacts error:', error);
        } finally {
            setLoadingContacts(false);
        }
    };

    const fetchGuardians = async () => {
        try {
            const res = await api.guardians.list();
            if (res.data.results) {
                setGuardians(res.data.results);
            }
        } catch (error) {
            console.error('Fetch guardians error:', error);
        } finally {
            setLoadingGuardians(false);
        }
    };

    const openAddModal = () => {
        setEditingContact(null);
        setFormName('');
        setFormRelation('');
        setFormPhone('');
        setFormEmail('');
        setModalVisible(true);
    };

    const openEditModal = (contact: EmergencyContact) => {
        setEditingContact(contact);
        setFormName(contact.name);
        setFormRelation(contact.relation);
        setFormPhone(contact.phone_number);
        setFormEmail(contact.email || '');
        setModalVisible(true);
    };

    const handleSaveContact = async () => {
        if (!formName || !formRelation || !formPhone) {
            Alert.alert('알림', '이름, 관계, 전화번호는 필수입니다.');
            return;
        }

        setSaving(true);
        try {
            const data = {
                name: formName,
                relation: formRelation,
                phone_number: formPhone,
                email: formEmail,
            };

            if (editingContact) {
                // Update existing
                await api.emergencyContacts.update(editingContact.id, data);
                Alert.alert('성공', '연락처가 수정되었습니다.');
            } else {
                // Create new
                await api.emergencyContacts.create(data);
                Alert.alert('성공', '연락처가 추가되었습니다.');
            }

            setModalVisible(false);
            fetchContacts();
        } catch (error: any) {
            console.error('Save contact error:', error);
            Alert.alert('실패', '저장 중 오류가 발생했습니다.');
        } finally {
            setSaving(false);
        }
    };

    const handleDeleteContact = (contact: EmergencyContact) => {
        Alert.alert(
            '연락처 삭제',
            `${contact.name}님을 삭제하시겠습니까?`,
            [
                { text: '취소', style: 'cancel' },
                {
                    text: '삭제',
                    style: 'destructive',
                    onPress: async () => {
                        try {
                            await api.emergencyContacts.delete(contact.id);
                            fetchContacts();
                            Alert.alert('삭제됨', '연락처가 삭제되었습니다.');
                        } catch (error) {
                            Alert.alert('실패', '삭제 중 오류가 발생했습니다.');
                        }
                    },
                },
            ]
        );
    };

    const handleCall = (phoneNumber: string) => {
        if (!phoneNumber) {
            Alert.alert('알림', '전화번호 정보가 없습니다.');
            return;
        }
        Linking.openURL(`tel:${phoneNumber}`);
    };

    return (
        <GradientBackground variant="ocean" style={styles.container}>
            {/* Header */}
            <View style={styles.header}>
                <TouchableOpacity onPress={() => router.back()} style={styles.backButton}>
                    <Ionicons name="arrow-back" size={24} color={colors.text} />
                </TouchableOpacity>
                <Text style={styles.headerTitle}>비상 연락처 관리</Text>
                <TouchableOpacity onPress={openAddModal} style={styles.addButton}>
                    <Ionicons name="add" size={24} color={colors.primary} />
                </TouchableOpacity>
            </View>

            <ScrollView contentContainerStyle={styles.content}>

                {/* 섹션 1: 비상 연락처 목록 */}
                <Text style={styles.sectionHeader}>등록된 비상 연락처</Text>
                <Text style={styles.sectionDesc}>위급 시 연결될 연락처 목록입니다.</Text>

                {loadingContacts ? (
                    <Text style={styles.loadingText}>목록을 불러오는 중...</Text>
                ) : contacts.length === 0 ? (
                    <NeumorphCard style={styles.emptyCard}>
                        <Ionicons name="call-outline" size={48} color={colors.textLight} />
                        <Text style={styles.emptyText}>등록된 비상 연락처가 없습니다.</Text>
                        <TouchableOpacity style={styles.addFirstButton} onPress={openAddModal}>
                            <Ionicons name="add-circle" size={20} color={colors.white} />
                            <Text style={styles.addFirstButtonText}>연락처 추가하기</Text>
                        </TouchableOpacity>
                    </NeumorphCard>
                ) : (
                    contacts.map((contact) => (
                        <NeumorphCard key={contact.id} style={styles.contactCard}>
                            <View style={styles.contactHeader}>
                                <View style={styles.avatar}>
                                    <Text style={styles.avatarText}>{contact.name?.[0] || '?'}</Text>
                                </View>
                                <View style={{ flex: 1, marginLeft: spacing.md }}>
                                    <View style={{ flexDirection: 'row', alignItems: 'center' }}>
                                        <Text style={styles.contactName}>{contact.name}</Text>
                                        {contact.is_primary && (
                                            <View style={styles.primaryBadge}>
                                                <Text style={styles.primaryBadgeText}>주 연락처</Text>
                                            </View>
                                        )}
                                    </View>
                                    <View style={styles.relationBadge}>
                                        <Text style={styles.relationText}>{contact.relation}</Text>
                                    </View>
                                    <Text style={styles.contactPhone}>{contact.phone_number}</Text>
                                </View>
                                <TouchableOpacity onPress={() => openEditModal(contact)} style={styles.editBtn}>
                                    <Ionicons name="pencil" size={18} color={colors.textSecondary} />
                                </TouchableOpacity>
                            </View>

                            <View style={styles.contactActions}>
                                <TouchableOpacity
                                    style={styles.callButton}
                                    onPress={() => handleCall(contact.phone_number)}
                                >
                                    <Ionicons name="call" size={18} color={colors.white} />
                                    <Text style={styles.callButtonText}>전화</Text>
                                </TouchableOpacity>
                                <TouchableOpacity
                                    style={styles.deleteButton}
                                    onPress={() => handleDeleteContact(contact)}
                                >
                                    <Ionicons name="trash-outline" size={18} color={colors.dangerDark} />
                                </TouchableOpacity>
                            </View>
                        </NeumorphCard>
                    ))
                )}

                {/* Floating Add Button when list is not empty */}
                {contacts.length > 0 && (
                    <TouchableOpacity style={styles.floatingAddButton} onPress={openAddModal}>
                        <Ionicons name="add" size={22} color={colors.white} />
                        <Text style={styles.floatingAddText}>연락처 추가</Text>
                    </TouchableOpacity>
                )}


                {/* 섹션 2: 앱에 연결된 보호자 계정 */}
                <Text style={[styles.sectionHeader, { marginTop: spacing.xxl }]}>앱에 연결된 보호자</Text>
                <Text style={styles.sectionDesc}>Yak-Sok 앱을 사용하는 보호자 목록입니다.</Text>

                {loadingGuardians ? (
                    <Text style={styles.loadingText}>목록을 불러오는 중...</Text>
                ) : guardians.length === 0 ? (
                    <NeumorphCard style={styles.emptyCard}>
                        <Ionicons name="people-outline" size={48} color={colors.textLight} />
                        <Text style={styles.emptyText}>연결된 보호자 계정이 없습니다.</Text>
                    </NeumorphCard>
                ) : (
                    guardians.map((relation) => (
                        <NeumorphCard key={relation.id} style={styles.guardianCard}>
                            <View style={styles.guardianInfo}>
                                <View style={styles.avatarSmall}>
                                    <Text style={styles.avatarTextSmall}>
                                        {relation.guardian_name?.[0] || 'G'}
                                    </Text>
                                </View>
                                <View>
                                    <Text style={styles.guardianName}>
                                        {relation.guardian_name || '알 수 없음'}
                                        {relation.is_primary && <Text style={styles.guardianPrimaryBadge}> (주 보호자)</Text>}
                                    </Text>
                                    <Text style={styles.guardianRole}>앱 사용자</Text>
                                </View>
                            </View>
                        </NeumorphCard>
                    ))
                )}

                <View style={{ height: 100 }} />
            </ScrollView>

            {/* Add/Edit Modal */}
            <Modal
                visible={modalVisible}
                animationType="slide"
                transparent={true}
                onRequestClose={() => setModalVisible(false)}
            >
                <KeyboardAvoidingView
                    behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
                    style={styles.modalOverlay}
                >
                    <View style={styles.modalContent}>
                        <View style={styles.modalHeader}>
                            <Text style={styles.modalTitle}>
                                {editingContact ? '연락처 수정' : '연락처 추가'}
                            </Text>
                            <TouchableOpacity onPress={() => setModalVisible(false)}>
                                <Ionicons name="close" size={24} color={colors.textSecondary} />
                            </TouchableOpacity>
                        </View>

                        <ScrollView
                            showsVerticalScrollIndicator={false}
                            keyboardShouldPersistTaps="handled"
                        >
                            <View style={styles.inputGroup}>
                                <Text style={styles.label}>이름 *</Text>
                                <TextInput
                                    style={styles.input}
                                    value={formName}
                                    onChangeText={setFormName}
                                    placeholder="이름을 입력하세요"
                                    placeholderTextColor={colors.textLight}
                                />
                            </View>
                            <View style={styles.inputGroup}>
                                <Text style={styles.label}>관계 * (예: 아들, 센터장님)</Text>
                                <TextInput
                                    style={styles.input}
                                    value={formRelation}
                                    onChangeText={setFormRelation}
                                    placeholder="관계를 입력하세요"
                                    placeholderTextColor={colors.textLight}
                                />
                            </View>
                            <View style={styles.inputGroup}>
                                <Text style={styles.label}>전화번호 *</Text>
                                <TextInput
                                    style={styles.input}
                                    value={formPhone}
                                    onChangeText={setFormPhone}
                                    placeholder="010-0000-0000"
                                    placeholderTextColor={colors.textLight}
                                    keyboardType="phone-pad"
                                />
                            </View>
                            <View style={styles.inputGroup}>
                                <Text style={styles.label}>이메일 (선택)</Text>
                                <TextInput
                                    style={styles.input}
                                    value={formEmail}
                                    onChangeText={setFormEmail}
                                    placeholder="example@email.com"
                                    placeholderTextColor={colors.textLight}
                                    keyboardType="email-address"
                                    autoCapitalize="none"
                                />
                            </View>

                            <View style={styles.modalButtons}>
                                <TouchableOpacity
                                    style={styles.cancelBtn}
                                    onPress={() => setModalVisible(false)}
                                >
                                    <Text style={styles.cancelBtnText}>취소</Text>
                                </TouchableOpacity>
                                <TouchableOpacity
                                    style={styles.saveBtn}
                                    onPress={handleSaveContact}
                                    disabled={saving}
                                >
                                    <Text style={styles.saveBtnText}>
                                        {saving ? '저장 중...' : '저장'}
                                    </Text>
                                </TouchableOpacity>
                            </View>
                        </ScrollView>
                    </View>
                </KeyboardAvoidingView>
            </Modal>
        </GradientBackground>
    );
}

const styles = StyleSheet.create({
    container: { flex: 1 },
    header: {
        flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between',
        paddingHorizontal: spacing.lg, paddingTop: 60, paddingBottom: spacing.lg,
    },
    backButton: { padding: spacing.xs },
    headerTitle: { fontSize: fontSize.xl, fontWeight: fontWeight.bold, color: colors.text },
    addButton: { padding: spacing.xs },
    content: { padding: spacing.xl },

    sectionHeader: { fontSize: fontSize.lg, fontWeight: fontWeight.bold, color: colors.text, marginBottom: spacing.xs },
    sectionDesc: { fontSize: fontSize.sm, color: colors.textSecondary, marginBottom: spacing.md },

    // Contact Card
    contactCard: { padding: spacing.lg, marginBottom: spacing.md },
    contactHeader: { flexDirection: 'row', alignItems: 'flex-start', marginBottom: spacing.md },
    avatar: { width: 50, height: 50, borderRadius: 25, backgroundColor: colors.lavender, alignItems: 'center', justifyContent: 'center' },
    avatarText: { color: colors.primaryDark, fontWeight: fontWeight.bold, fontSize: fontSize.xl },

    contactName: { fontSize: fontSize.lg, fontWeight: fontWeight.bold, color: colors.text },
    primaryBadge: { backgroundColor: colors.primary, paddingHorizontal: spacing.sm, paddingVertical: 2, borderRadius: borderRadius.round, marginLeft: spacing.sm },
    primaryBadgeText: { color: colors.white, fontWeight: fontWeight.bold, fontSize: fontSize.xs },
    relationBadge: { backgroundColor: colors.primaryLight, paddingHorizontal: spacing.sm, paddingVertical: 2, borderRadius: borderRadius.round, alignSelf: 'flex-start', marginTop: spacing.xs },
    relationText: { color: colors.primary, fontWeight: fontWeight.bold, fontSize: fontSize.xs },
    contactPhone: { fontSize: fontSize.base, color: colors.textSecondary, marginTop: spacing.xs },
    editBtn: { padding: spacing.sm },

    contactActions: { flexDirection: 'row', alignItems: 'center', gap: spacing.md },
    callButton: { flex: 1, flexDirection: 'row', backgroundColor: colors.primary, borderRadius: borderRadius.lg, paddingVertical: spacing.sm, justifyContent: 'center', alignItems: 'center', gap: spacing.xs, ...shadows.mint },
    callButtonText: { color: colors.white, fontWeight: fontWeight.bold, fontSize: fontSize.sm },
    deleteButton: { padding: spacing.sm, borderWidth: 1, borderColor: colors.danger, borderRadius: borderRadius.lg },

    // Empty State
    emptyCard: { padding: spacing.xl, alignItems: 'center', justifyContent: 'center', gap: spacing.md },
    emptyText: { color: colors.textSecondary, textAlign: 'center' },
    addFirstButton: { flexDirection: 'row', backgroundColor: colors.primary, paddingHorizontal: spacing.lg, paddingVertical: spacing.md, borderRadius: borderRadius.lg, alignItems: 'center', gap: spacing.sm, marginTop: spacing.md, ...shadows.mint },
    addFirstButtonText: { color: colors.white, fontWeight: fontWeight.bold },

    // Floating Add Button
    floatingAddButton: { flexDirection: 'row', backgroundColor: colors.primary, paddingHorizontal: spacing.lg, paddingVertical: spacing.md, borderRadius: borderRadius.lg, alignItems: 'center', justifyContent: 'center', gap: spacing.sm, marginTop: spacing.md, ...shadows.mint },
    floatingAddText: { color: colors.white, fontWeight: fontWeight.bold, fontSize: fontSize.base },

    // Guardian List
    loadingText: { textAlign: 'center', color: colors.textSecondary, marginTop: spacing.lg },
    guardianCard: { padding: spacing.md, marginBottom: spacing.md },
    guardianInfo: { flexDirection: 'row', alignItems: 'center' },
    avatarSmall: { width: 40, height: 40, borderRadius: 20, backgroundColor: colors.lavender, alignItems: 'center', justifyContent: 'center', marginRight: spacing.md },
    avatarTextSmall: { color: colors.primaryDark, fontWeight: fontWeight.bold, fontSize: fontSize.base },
    guardianName: { fontSize: fontSize.base, fontWeight: fontWeight.bold, color: colors.text },
    guardianPrimaryBadge: { color: colors.primary, fontSize: fontSize.sm },
    guardianRole: { fontSize: fontSize.xs, color: colors.textSecondary },

    // Modal
    modalOverlay: { flex: 1, backgroundColor: 'rgba(0,0,0,0.5)', justifyContent: 'flex-end' },
    modalContent: { backgroundColor: colors.white, borderTopLeftRadius: borderRadius.xl, borderTopRightRadius: borderRadius.xl, padding: spacing.xl, paddingBottom: 40 },
    modalHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: spacing.xl },
    modalTitle: { fontSize: fontSize.xl, fontWeight: fontWeight.bold, color: colors.text },

    inputGroup: { marginBottom: spacing.md },
    label: { fontSize: fontSize.sm, color: colors.textSecondary, marginBottom: spacing.xs, fontWeight: fontWeight.medium },
    input: { backgroundColor: colors.base, borderRadius: borderRadius.md, padding: spacing.md, fontSize: fontSize.base, color: colors.text, borderWidth: 1, borderColor: 'rgba(0,0,0,0.05)' },

    modalButtons: { flexDirection: 'row', gap: spacing.md, marginTop: spacing.lg },
    cancelBtn: { flex: 1, paddingVertical: spacing.md, borderRadius: borderRadius.lg, alignItems: 'center', borderWidth: 1, borderColor: colors.textLight },
    cancelBtnText: { color: colors.textSecondary, fontWeight: fontWeight.bold },
    saveBtn: { flex: 2, backgroundColor: colors.primary, paddingVertical: spacing.md, borderRadius: borderRadius.lg, alignItems: 'center', ...shadows.mint },
    saveBtnText: { color: colors.white, fontWeight: fontWeight.bold },
});
