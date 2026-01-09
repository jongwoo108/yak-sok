'use client';

import { useEffect, useState } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { useMedicationStore } from '@/services/store';
import { api } from '@/services/api';
import type { EmergencyContact } from '@/services/types';

export default function ProfilePage() {
    const router = useRouter();
    const { user, fetchUser, logout, isLoading } = useMedicationStore();
    const [emergencyContacts, setEmergencyContacts] = useState<EmergencyContact[]>([]);
    const [showAddContact, setShowAddContact] = useState(false);
    const [newContact, setNewContact] = useState({
        name: '',
        phone_number: '',
        contact_type: 'guardian' as 'guardian' | 'hospital' | 'emergency' | 'other',
    });

    useEffect(() => {
        fetchUser();
        fetchEmergencyContacts();
    }, [fetchUser]);

    const fetchEmergencyContacts = async () => {
        try {
            const response = await api.emergencyContacts.list();
            setEmergencyContacts(response.data.results || response.data);
        } catch (err) {
            // 오류 무시
        }
    };

    const handleAddContact = async () => {
        try {
            await api.emergencyContacts.create(newContact);
            setNewContact({ name: '', phone_number: '', contact_type: 'guardian' });
            setShowAddContact(false);
            fetchEmergencyContacts();
        } catch (err) {
            alert('연락처 추가에 실패했습니다.');
        }
    };

    const handleDeleteContact = async (id: number) => {
        if (!confirm('정말 삭제하시겠습니까?')) return;
        try {
            await api.emergencyContacts.delete(id);
            fetchEmergencyContacts();
        } catch (err) {
            alert('삭제에 실패했습니다.');
        }
    };

    const handleLogout = () => {
        logout();
        router.push('/login');
    };

    const contactTypeLabels = {
        guardian: '👨‍👩‍👧 보호자',
        hospital: '🏥 병원',
        emergency: '🚨 119',
        other: '📞 기타',
    };

    return (
        <div className="container min-h-screen p-6">
            {/* 헤더 */}
            <header className="flex items-center mb-6" style={{ justifyContent: 'space-between' }}>
                <Link
                    href="/"
                    style={{
                        fontSize: 'var(--font-size-xl)',
                        textDecoration: 'none',
                        color: 'var(--color-text)',
                    }}
                >
                    ←
                </Link>
                <h1 style={{ fontSize: 'var(--font-size-xl)', fontWeight: 700 }}>
                    👤 내 정보
                </h1>
                <div style={{ width: '40px' }} />
            </header>

            {isLoading ? (
                <div className="card text-center">
                    <p style={{ fontSize: 'var(--font-size-lg)' }}>로딩 중...</p>
                </div>
            ) : user ? (
                <>
                    {/* 사용자 정보 */}
                    <div className="card mb-6">
                        <div style={{
                            display: 'flex',
                            alignItems: 'center',
                            marginBottom: '1rem',
                        }}>
                            <div style={{
                                width: '80px',
                                height: '80px',
                                borderRadius: '50%',
                                background: 'var(--color-primary)',
                                color: 'white',
                                display: 'flex',
                                alignItems: 'center',
                                justifyContent: 'center',
                                fontSize: 'var(--font-size-2xl)',
                                marginRight: '1rem',
                            }}>
                                {user.role === 'senior' ? '👴' : '👨‍👩‍👧'}
                            </div>
                            <div>
                                <h2 style={{
                                    fontSize: 'var(--font-size-xl)',
                                    fontWeight: 700,
                                }}>
                                    {user.first_name || user.username}
                                </h2>
                                <p style={{
                                    fontSize: 'var(--font-size-base)',
                                    color: 'var(--color-text-light)',
                                }}>
                                    {user.role === 'senior' ? '시니어' : '보호자'}
                                </p>
                            </div>
                        </div>

                        <div style={{
                            padding: '1rem',
                            background: '#F9FAFB',
                            borderRadius: 'var(--border-radius)',
                        }}>
                            <div style={{ marginBottom: '0.5rem' }}>
                                <span style={{ color: 'var(--color-text-light)' }}>전화번호: </span>
                                <span style={{ fontWeight: 600 }}>{user.phone_number || '미등록'}</span>
                            </div>
                            <div>
                                <span style={{ color: 'var(--color-text-light)' }}>이메일: </span>
                                <span style={{ fontWeight: 600 }}>{user.email || '미등록'}</span>
                            </div>
                        </div>
                    </div>

                    {/* 비상 연락처 */}
                    <div className="card mb-6">
                        <div style={{
                            display: 'flex',
                            justifyContent: 'space-between',
                            alignItems: 'center',
                            marginBottom: '1rem',
                        }}>
                            <h3 style={{
                                fontSize: 'var(--font-size-lg)',
                                fontWeight: 700,
                            }}>
                                🚨 비상 연락처
                            </h3>
                            <button
                                onClick={() => setShowAddContact(!showAddContact)}
                                style={{
                                    padding: '0.5rem 1rem',
                                    background: 'var(--color-primary)',
                                    color: 'white',
                                    border: 'none',
                                    borderRadius: '8px',
                                    fontSize: 'var(--font-size-base)',
                                    cursor: 'pointer',
                                }}
                            >
                                + 추가
                            </button>
                        </div>

                        {showAddContact && (
                            <div style={{
                                padding: '1rem',
                                marginBottom: '1rem',
                                background: '#EEF2FF',
                                borderRadius: 'var(--border-radius)',
                            }}>
                                <input
                                    type="text"
                                    className="input"
                                    placeholder="이름"
                                    value={newContact.name}
                                    onChange={(e) => setNewContact({ ...newContact, name: e.target.value })}
                                    style={{ marginBottom: '0.5rem' }}
                                />
                                <input
                                    type="tel"
                                    className="input"
                                    placeholder="전화번호"
                                    value={newContact.phone_number}
                                    onChange={(e) => setNewContact({ ...newContact, phone_number: e.target.value })}
                                    style={{ marginBottom: '0.5rem' }}
                                />
                                <select
                                    className="input"
                                    value={newContact.contact_type}
                                    onChange={(e) => setNewContact({ ...newContact, contact_type: e.target.value as any })}
                                    style={{ marginBottom: '0.5rem' }}
                                >
                                    <option value="guardian">보호자</option>
                                    <option value="hospital">병원</option>
                                    <option value="emergency">119</option>
                                    <option value="other">기타</option>
                                </select>
                                <button
                                    onClick={handleAddContact}
                                    className="btn btn-primary w-full"
                                >
                                    저장
                                </button>
                            </div>
                        )}

                        {emergencyContacts.length === 0 ? (
                            <p style={{
                                fontSize: 'var(--font-size-base)',
                                color: 'var(--color-text-light)',
                                textAlign: 'center',
                                padding: '1rem',
                            }}>
                                등록된 비상 연락처가 없습니다.
                            </p>
                        ) : (
                            emergencyContacts.map((contact) => (
                                <div
                                    key={contact.id}
                                    style={{
                                        display: 'flex',
                                        justifyContent: 'space-between',
                                        alignItems: 'center',
                                        padding: '1rem',
                                        marginBottom: '0.5rem',
                                        background: '#F9FAFB',
                                        borderRadius: 'var(--border-radius)',
                                    }}
                                >
                                    <div>
                                        <p style={{
                                            fontSize: 'var(--font-size-lg)',
                                            fontWeight: 600,
                                        }}>
                                            {contact.name}
                                        </p>
                                        <p style={{
                                            fontSize: 'var(--font-size-base)',
                                            color: 'var(--color-text-light)',
                                        }}>
                                            {contact.phone_number}
                                        </p>
                                        <span style={{
                                            fontSize: 'var(--font-size-sm)',
                                            color: 'var(--color-primary)',
                                        }}>
                                            {contactTypeLabels[contact.contact_type]}
                                        </span>
                                    </div>
                                    <button
                                        onClick={() => handleDeleteContact(contact.id)}
                                        style={{
                                            padding: '0.5rem',
                                            background: '#FEE2E2',
                                            color: 'var(--color-danger)',
                                            border: 'none',
                                            borderRadius: '8px',
                                            cursor: 'pointer',
                                        }}
                                    >
                                        삭제
                                    </button>
                                </div>
                            ))
                        )}
                    </div>

                    {/* 로그아웃 */}
                    <button
                        onClick={handleLogout}
                        className="btn w-full"
                        style={{
                            background: '#FEE2E2',
                            color: 'var(--color-danger)',
                            border: 'none',
                        }}
                    >
                        로그아웃
                    </button>
                </>
            ) : (
                <div className="card text-center">
                    <p style={{ fontSize: 'var(--font-size-lg)', marginBottom: '1rem' }}>
                        로그인이 필요합니다.
                    </p>
                    <Link href="/login" className="btn btn-primary w-full">
                        로그인하기
                    </Link>
                </div>
            )}
        </div>
    );
}
