'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { api } from '@/services/api';
import { useMedicationStore } from '@/services/store';

export default function LoginPage() {
    const router = useRouter();
    const { setUser } = useMedicationStore();
    const [isLogin, setIsLogin] = useState(true);
    const [isLoading, setIsLoading] = useState(false);
    const [error, setError] = useState('');

    const [formData, setFormData] = useState({
        username: '',
        password: '',
        password_confirm: '',
        first_name: '',
        phone_number: '',
        role: 'senior' as 'senior' | 'guardian',
    });

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        setError('');
        setIsLoading(true);

        try {
            if (isLogin) {
                // 로그인
                const response = await api.auth.login(formData.username, formData.password);
                localStorage.setItem('access_token', response.data.access);
                localStorage.setItem('refresh_token', response.data.refresh);

                // 사용자 정보 가져오기
                const userResponse = await api.auth.me();
                setUser(userResponse.data);

                router.push('/');
            } else {
                // 회원가입
                if (formData.password !== formData.password_confirm) {
                    setError('비밀번호가 일치하지 않습니다.');
                    return;
                }

                await api.auth.register(formData);

                // 자동 로그인
                const response = await api.auth.login(formData.username, formData.password);
                localStorage.setItem('access_token', response.data.access);
                localStorage.setItem('refresh_token', response.data.refresh);

                router.push('/');
            }
        } catch (err: any) {
            setError(err.response?.data?.detail || '오류가 발생했습니다. 다시 시도해주세요.');
        } finally {
            setIsLoading(false);
        }
    };

    return (
        <div className="container min-h-screen flex flex-col justify-center p-6">
            {/* 로고 */}
            <div className="text-center mb-6">
                <h1 style={{ fontSize: 'var(--font-size-2xl)', fontWeight: 700 }}>
                    💊 약속
                </h1>
                <p style={{ fontSize: 'var(--font-size-lg)', color: 'var(--color-text-light)', marginTop: '0.5rem' }}>
                    가장 확실한 안부 인사
                </p>
            </div>

            {/* 탭 전환 */}
            <div className="flex gap-4 mb-6">
                <button
                    onClick={() => setIsLogin(true)}
                    className="btn w-full"
                    style={{
                        background: isLogin ? 'var(--color-primary)' : 'var(--color-surface)',
                        color: isLogin ? 'white' : 'var(--color-text)',
                        border: isLogin ? 'none' : '2px solid var(--color-primary)',
                    }}
                >
                    로그인
                </button>
                <button
                    onClick={() => setIsLogin(false)}
                    className="btn w-full"
                    style={{
                        background: !isLogin ? 'var(--color-primary)' : 'var(--color-surface)',
                        color: !isLogin ? 'white' : 'var(--color-text)',
                        border: !isLogin ? 'none' : '2px solid var(--color-primary)',
                    }}
                >
                    회원가입
                </button>
            </div>

            {/* 폼 */}
            <form onSubmit={handleSubmit} className="card">
                {error && (
                    <div style={{
                        padding: '1rem',
                        marginBottom: '1rem',
                        background: '#FEE2E2',
                        color: 'var(--color-danger)',
                        borderRadius: 'var(--border-radius)',
                        fontSize: 'var(--font-size-base)',
                    }}>
                        {error}
                    </div>
                )}

                <div style={{ marginBottom: 'var(--spacing-lg)' }}>
                    <label style={{
                        display: 'block',
                        marginBottom: '0.5rem',
                        fontSize: 'var(--font-size-base)',
                        fontWeight: 600,
                    }}>
                        아이디
                    </label>
                    <input
                        type="text"
                        className="input"
                        value={formData.username}
                        onChange={(e) => setFormData({ ...formData, username: e.target.value })}
                        placeholder="아이디를 입력하세요"
                        required
                    />
                </div>

                {!isLogin && (
                    <div style={{ marginBottom: 'var(--spacing-lg)' }}>
                        <label style={{
                            display: 'block',
                            marginBottom: '0.5rem',
                            fontSize: 'var(--font-size-base)',
                            fontWeight: 600,
                        }}>
                            이름
                        </label>
                        <input
                            type="text"
                            className="input"
                            value={formData.first_name}
                            onChange={(e) => setFormData({ ...formData, first_name: e.target.value })}
                            placeholder="이름을 입력하세요"
                            required
                        />
                    </div>
                )}

                {!isLogin && (
                    <div style={{ marginBottom: 'var(--spacing-lg)' }}>
                        <label style={{
                            display: 'block',
                            marginBottom: '0.5rem',
                            fontSize: 'var(--font-size-base)',
                            fontWeight: 600,
                        }}>
                            전화번호
                        </label>
                        <input
                            type="tel"
                            className="input"
                            value={formData.phone_number}
                            onChange={(e) => setFormData({ ...formData, phone_number: e.target.value })}
                            placeholder="010-0000-0000"
                        />
                    </div>
                )}

                {!isLogin && (
                    <div style={{ marginBottom: 'var(--spacing-lg)' }}>
                        <label style={{
                            display: 'block',
                            marginBottom: '0.5rem',
                            fontSize: 'var(--font-size-base)',
                            fontWeight: 600,
                        }}>
                            역할
                        </label>
                        <div className="flex gap-4">
                            <button
                                type="button"
                                onClick={() => setFormData({ ...formData, role: 'senior' })}
                                className="btn w-full"
                                style={{
                                    background: formData.role === 'senior' ? 'var(--color-primary)' : 'var(--color-surface)',
                                    color: formData.role === 'senior' ? 'white' : 'var(--color-text)',
                                    border: '2px solid var(--color-primary)',
                                }}
                            >
                                👴 시니어
                            </button>
                            <button
                                type="button"
                                onClick={() => setFormData({ ...formData, role: 'guardian' })}
                                className="btn w-full"
                                style={{
                                    background: formData.role === 'guardian' ? 'var(--color-primary)' : 'var(--color-surface)',
                                    color: formData.role === 'guardian' ? 'white' : 'var(--color-text)',
                                    border: '2px solid var(--color-primary)',
                                }}
                            >
                                👨‍👩‍👧 보호자
                            </button>
                        </div>
                    </div>
                )}

                <div style={{ marginBottom: 'var(--spacing-lg)' }}>
                    <label style={{
                        display: 'block',
                        marginBottom: '0.5rem',
                        fontSize: 'var(--font-size-base)',
                        fontWeight: 600,
                    }}>
                        비밀번호
                    </label>
                    <input
                        type="password"
                        className="input"
                        value={formData.password}
                        onChange={(e) => setFormData({ ...formData, password: e.target.value })}
                        placeholder="비밀번호를 입력하세요"
                        required
                    />
                </div>

                {!isLogin && (
                    <div style={{ marginBottom: 'var(--spacing-lg)' }}>
                        <label style={{
                            display: 'block',
                            marginBottom: '0.5rem',
                            fontSize: 'var(--font-size-base)',
                            fontWeight: 600,
                        }}>
                            비밀번호 확인
                        </label>
                        <input
                            type="password"
                            className="input"
                            value={formData.password_confirm}
                            onChange={(e) => setFormData({ ...formData, password_confirm: e.target.value })}
                            placeholder="비밀번호를 다시 입력하세요"
                            required
                        />
                    </div>
                )}

                <button
                    type="submit"
                    disabled={isLoading}
                    className="btn btn-primary w-full"
                    style={{ marginTop: '1rem' }}
                >
                    {isLoading ? '처리 중...' : (isLogin ? '로그인' : '회원가입')}
                </button>
            </form>
        </div>
    );
}
