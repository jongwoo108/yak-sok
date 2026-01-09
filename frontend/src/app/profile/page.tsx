'use client';

import { useEffect, useState } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { ArrowLeft, User, Users, Phone, Building2, AlertCircle, Plus, Trash2, LogOut, Loader2 } from 'lucide-react';
import { useMedicationStore } from '@/services/store';
import { api } from '@/services/api';
import type { EmergencyContact } from '@/services/types';

export default function ProfilePage() {
    const router = useRouter();
    const { user, fetchUser, isLoading, setUser } = useMedicationStore();
    const [contacts, setContacts] = useState<EmergencyContact[]>([]);
    const [loadingContacts, setLoadingContacts] = useState(true);
    const [showAddForm, setShowAddForm] = useState(false);
    const [newContact, setNewContact] = useState({
        name: '',
        phone_number: '',
        relationship: '',
        contact_type: 'guardian' as 'guardian' | 'hospital' | 'emergency' | 'other',
    });

    useEffect(() => {
        fetchUser();
        fetchContacts();
    }, [fetchUser]);

    const fetchContacts = async () => {
        try {
            const response = await api.emergencyContacts.list();
            // Ensure we always set an array
            setContacts(Array.isArray(response.data) ? response.data : response.data?.results || []);
        } catch (err) {
            console.error(err);
            setContacts([]);
        } finally {
            setLoadingContacts(false);
        }
    };


    const handleAddContact = async () => {
        try {
            await api.emergencyContacts.create(newContact);
            setNewContact({
                name: '',
                phone_number: '',
                relationship: '',
                contact_type: 'guardian',
            });
            setShowAddForm(false);
            fetchContacts();
        } catch (err) {
            console.error(err);
        }
    };

    const handleDeleteContact = async (id: number) => {
        try {
            await api.emergencyContacts.delete(id);
            fetchContacts();
        } catch (err) {
            console.error(err);
        }
    };

    const handleLogout = () => {
        localStorage.removeItem('access_token');
        localStorage.removeItem('refresh_token');
        setUser(null);
        router.push('/login');
    };

    const contactTypeIcons = {
        guardian: <Users size={18} />,
        hospital: <Building2 size={18} />,
        emergency: <AlertCircle size={18} />,
        other: <Phone size={18} />,
    };

    const contactTypeLabels = {
        guardian: '보호자',
        hospital: '병원',
        emergency: '119',
        other: '기타',
    };

    return (
        <>
            <div className="organic-bg" />
            <div className="page-wrapper">
                <div className="page-content">
                    {/* 헤더 */}
                    <header className="flex items-center" style={{ justifyContent: 'space-between' }}>
                        <Link
                            href="/"
                            className="status-icon"
                            style={{
                                width: '44px',
                                height: '44px',
                                background: 'var(--color-cream)',
                            }}
                        >
                            <ArrowLeft size={22} color="var(--color-text)" />
                        </Link>
                        <h1 style={{ fontSize: 'var(--font-size-xl)', fontWeight: 700, display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                            <User size={24} color="var(--color-mint-dark)" />
                            내 정보
                        </h1>
                        <div style={{ width: '44px' }} />
                    </header>

                    {isLoading ? (
                        <div className="card text-center">
                            <div className="status-icon status-icon-pending" style={{ margin: '0 auto 1rem' }}>
                                <Loader2 size={28} style={{ color: 'var(--color-text-light)' }} />
                            </div>
                            <p style={{ fontSize: 'var(--font-size-lg)' }}>로딩 중...</p>
                        </div>
                    ) : user ? (
                        <>
                            {/* 사용자 정보 */}
                            <div className="card">
                                <div style={{
                                    display: 'flex',
                                    alignItems: 'center',
                                    marginBottom: '1rem',
                                }}>
                                    <div className="status-icon status-icon-success" style={{
                                        width: '60px',
                                        height: '60px',
                                        marginRight: '1rem',
                                    }}>
                                        <User size={28} color="white" />
                                    </div>
                                    <div>
                                        <h2 style={{ fontSize: 'var(--font-size-xl)', fontWeight: 700 }}>
                                            {user.first_name || user.username}
                                        </h2>
                                        <span style={{
                                            padding: '0.25rem 0.75rem',
                                            borderRadius: 'var(--border-radius-pill)',
                                            background: user.role === 'senior'
                                                ? 'var(--color-mint-light)'
                                                : 'var(--color-blue-light)',
                                            color: user.role === 'senior'
                                                ? 'var(--color-mint-dark)'
                                                : 'var(--color-blue-dark)',
                                            fontSize: 'var(--font-size-sm)',
                                            fontWeight: 600,
                                        }}>
                                            {user.role === 'senior' ? '시니어' : '보호자'}
                                        </span>
                                    </div>
                                </div>
                                {user.phone_number && (
                                    <p style={{
                                        fontSize: 'var(--font-size-base)',
                                        color: 'var(--color-text-light)',
                                        display: 'flex',
                                        alignItems: 'center',
                                        gap: '0.5rem',
                                    }}>
                                        <Phone size={16} />
                                        {user.phone_number}
                                    </p>
                                )}
                            </div>

                            {/* 비상 연락처 */}
                            <div className="card">
                                <div className="flex justify-between items-center" style={{ marginBottom: '1rem' }}>
                                    <h3 style={{
                                        fontSize: 'var(--font-size-lg)',
                                        fontWeight: 600,
                                        display: 'flex',
                                        alignItems: 'center',
                                        gap: '0.5rem',
                                    }}>
                                        <AlertCircle size={20} color="var(--color-danger)" />
                                        비상 연락처
                                    </h3>
                                    <button
                                        onClick={() => setShowAddForm(!showAddForm)}
                                        className="status-icon"
                                        style={{
                                            width: '40px',
                                            height: '40px',
                                            background: 'var(--color-mint-light)',
                                        }}
                                    >
                                        <Plus size={20} color="var(--color-mint-dark)" />
                                    </button>
                                </div>

                                {showAddForm && (
                                    <div style={{
                                        padding: '1rem',
                                        background: 'var(--color-cream-light)',
                                        borderRadius: 'var(--border-radius)',
                                        marginBottom: '1rem',
                                    }}>
                                        <input
                                            type="text"
                                            placeholder="이름"
                                            value={newContact.name}
                                            onChange={(e) => setNewContact({ ...newContact, name: e.target.value })}
                                            className="input"
                                            style={{ marginBottom: '0.5rem' }}
                                        />
                                        <input
                                            type="tel"
                                            placeholder="전화번호"
                                            value={newContact.phone_number}
                                            onChange={(e) => setNewContact({ ...newContact, phone_number: e.target.value })}
                                            className="input"
                                            style={{ marginBottom: '0.5rem' }}
                                        />
                                        <button
                                            onClick={handleAddContact}
                                            className="btn btn-primary w-full"
                                        >
                                            추가하기
                                        </button>
                                    </div>
                                )}

                                {loadingContacts ? (
                                    <p style={{ textAlign: 'center', color: 'var(--color-text-light)' }}>
                                        로딩 중...
                                    </p>
                                ) : contacts.length === 0 ? (
                                    <p style={{ textAlign: 'center', color: 'var(--color-text-light)' }}>
                                        등록된 비상 연락처가 없습니다.
                                    </p>
                                ) : (
                                    contacts.map((contact) => (
                                        <div
                                            key={contact.id}
                                            style={{
                                                display: 'flex',
                                                justifyContent: 'space-between',
                                                alignItems: 'center',
                                                padding: '0.75rem',
                                                marginBottom: '0.5rem',
                                                background: 'var(--color-cream-light)',
                                                borderRadius: 'var(--border-radius)',
                                            }}
                                        >
                                            <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem' }}>
                                                <span style={{ color: 'var(--color-text-light)' }}>
                                                    {contactTypeIcons[contact.contact_type as keyof typeof contactTypeIcons]}
                                                </span>
                                                <div>
                                                    <p style={{ fontSize: 'var(--font-size-base)', fontWeight: 600 }}>
                                                        {contact.name}
                                                    </p>
                                                    <p style={{ fontSize: 'var(--font-size-sm)', color: 'var(--color-text-light)' }}>
                                                        {contact.phone_number}
                                                    </p>
                                                </div>
                                            </div>
                                            <button
                                                onClick={() => handleDeleteContact(contact.id)}
                                                style={{
                                                    background: 'none',
                                                    border: 'none',
                                                    cursor: 'pointer',
                                                    color: 'var(--color-danger)',
                                                }}
                                            >
                                                <Trash2 size={20} />
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
                                    background: 'var(--color-pink-light)',
                                    color: 'var(--color-danger)',
                                    border: 'none',
                                }}
                            >
                                <LogOut size={20} />
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
            </div>
        </>
    );
}
