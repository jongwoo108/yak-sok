'use client';

import { useState } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { UserCircle2, ShieldCheck } from 'lucide-react';
import { authService } from '@/services/auth';

export default function RegisterPage() {
    const router = useRouter();

    const [formData, setFormData] = useState({
        email: '',
        password: '',
        password_confirm: '',
        first_name: '',
        last_name: '',
        role: 'senior' as 'senior' | 'guardian',
        phone_number: ''
    });
    const [isLoading, setIsLoading] = useState(false);
    const [error, setError] = useState<string | null>(null);

    const handleChange = (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement>) => {
        setFormData(prev => ({
            ...prev,
            [e.target.name]: e.target.value
        }));
    };

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        setError(null);
        setIsLoading(true);

        try {
            await authService.register(formData);
            alert('회원가입이 완료되었습니다. 로그인해주세요.');
            router.push('/login');
        } catch (err: any) {
            console.error(err);
            const msg = err.response?.data?.non_field_errors?.[0] ||
                err.response?.data?.email?.[0] ||
                err.response?.data?.password_confirm?.[0] ||
                '회원가입에 실패했습니다.';
            setError(msg);
        } finally {
            setIsLoading(false);
        }
    };

    return (
        <main className="auth-wrapper">
            <div className="auth-container clay-card">
                <div className="auth-header">
                    <h1 className="auth-title">
                        회원가입
                    </h1>
                    <p className="auth-subtitle">
                        약속(Yak-Sok) 서비스 이용을 위해<br />
                        정보를 입력해주세요.
                    </p>
                </div>

                {error && (
                    <div className="error-message">
                        {error}
                    </div>
                )}

                <form onSubmit={handleSubmit}>
                    {/* 역할 선택 */}
                    <div className="clay-select-group">
                        <button
                            type="button"
                            onClick={() => setFormData(prev => ({ ...prev, role: 'senior' }))}
                            className={`clay-select-btn ${formData.role === 'senior' ? 'active' : ''}`}
                        >
                            <UserCircle2 className="clay-select-icon w-8 h-8" />
                            어르신
                        </button>
                        <button
                            type="button"
                            onClick={() => setFormData(prev => ({ ...prev, role: 'guardian' }))}
                            className={`clay-select-btn ${formData.role === 'guardian' ? 'active' : ''}`}
                        >
                            <ShieldCheck className="clay-select-icon w-8 h-8" />
                            보호자
                        </button>
                    </div>

                    <div style={{ display: 'flex', gap: '12px' }}>
                        <div className="clay-input-group" style={{ flex: 1 }}>
                            <label className="clay-label">성</label>
                            <input
                                type="text" name="last_name" required
                                value={formData.last_name} onChange={handleChange}
                                className="clay-input"
                                placeholder="홍"
                            />
                        </div>
                        <div className="clay-input-group" style={{ flex: 1 }}>
                            <label className="clay-label">이름</label>
                            <input
                                type="text" name="first_name" required
                                value={formData.first_name} onChange={handleChange}
                                className="clay-input"
                                placeholder="길동"
                            />
                        </div>
                    </div>

                    <div className="clay-input-group">
                        <label className="clay-label">
                            이메일
                        </label>
                        <input
                            type="email" name="email" required
                            value={formData.email} onChange={handleChange}
                            className="clay-input"
                            placeholder="name@example.com"
                        />
                    </div>

                    <div className="clay-input-group">
                        <label className="clay-label">
                            비밀번호
                        </label>
                        <input
                            type="password" name="password" required minLength={8}
                            value={formData.password} onChange={handleChange}
                            className="clay-input"
                            placeholder="8자 이상 입력"
                        />
                    </div>

                    <div className="clay-input-group">
                        <label className="clay-label">
                            비밀번호 확인
                        </label>
                        <input
                            type="password" name="password_confirm" required minLength={8}
                            value={formData.password_confirm} onChange={handleChange}
                            className="clay-input"
                            placeholder="비밀번호 재입력"
                        />
                    </div>

                    <div className="clay-input-group">
                        <label className="clay-label">
                            전화번호 (선택)
                        </label>
                        <input
                            type="tel" name="phone_number"
                            value={formData.phone_number} onChange={handleChange}
                            className="clay-input"
                            placeholder="010-1234-5678"
                        />
                    </div>

                    <button
                        type="submit"
                        disabled={isLoading}
                        className="clay-btn-primary"
                        style={{ marginTop: '20px' }}
                    >
                        {isLoading ? '가입 처리 중...' : '가입하기'}
                    </button>
                </form>

                <p className="auth-footer">
                    이미 계정이 있으신가요?
                    <Link href="/login" className="link-highlight">
                        로그인
                    </Link>
                </p>
            </div>
        </main>
    );
}
