'use client';

import { useState, useRef, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import { ArrowLeft, Camera, Lightbulb, Search, Check, RefreshCw, Loader2 } from 'lucide-react';
import { api } from '@/services/api';
import { useMedicationStore } from '@/services/store';

export default function ScanPrescriptionPage() {
    const router = useRouter();
    const { medications: existingMedications, fetchMedications } = useMedicationStore();
    const fileInputRef = useRef<HTMLInputElement>(null);
    const [isLoading, setIsLoading] = useState(false);
    const [error, setError] = useState('');
    const [preview, setPreview] = useState<string | null>(null);
    const [scanResult, setScanResult] = useState<any>(null);

    // 페이지 로드시 기존 약 목록 가져오기 (중복 체크용)
    useEffect(() => {
        fetchMedications();
    }, [fetchMedications]);

    const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
        const file = e.target.files?.[0];
        if (file) {
            // 미리보기 생성
            const reader = new FileReader();
            reader.onloadend = () => {
                setPreview(reader.result as string);
            };
            reader.readAsDataURL(file);
        }
    };

    const handleScan = async () => {
        const file = fileInputRef.current?.files?.[0];
        if (!file) {
            setError('이미지를 선택해주세요.');
            return;
        }

        setIsLoading(true);
        setError('');

        try {
            const response = await api.medications.scanPrescription(file);
            setScanResult(response.data);
        } catch (err: any) {
            setError(err.response?.data?.error || 'OCR 처리에 실패했습니다.');
        } finally {
            setIsLoading(false);
        }
    };

    const isDuplicate = (name: string) => {
        return existingMedications.some(med => med.name === name);
    };

    const handleConfirm = async () => {
        if (!scanResult?.medications) return;

        setIsLoading(true);
        try {
            // 중복되지 않은 약품만 필터링하여 등록
            const newMedications = scanResult.medications.filter((med: any) => !isDuplicate(med.name));

            if (newMedications.length === 0) {
                alert('모든 약이 이미 등록되어 있습니다.');
                router.push('/medications');
                return;
            }

            for (const med of newMedications) {
                await api.medications.create({
                    name: med.name,
                    dosage: med.dosage,
                    description: med.description || med.frequency, // 설명 우선, 없으면 횟수
                });
            }
            // 등록 후 최신 데이터 가져오기
            await fetchMedications();
            router.push('/medications');
        } catch (err: any) {
            setError('약 등록에 실패했습니다.');
        } finally {
            setIsLoading(false);
        }
    };

    return (
        <>
            <div className="organic-bg" />
            <div className="page-wrapper">
                <div className="page-content">
                    {/* 헤더 */}
                    <header className="flex items-center" style={{ justifyContent: 'space-between' }}>
                        <Link
                            href="/medications"
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
                            <Camera size={24} color="var(--color-mint-dark)" />
                            처방전 스캔
                        </h1>
                        <div style={{ width: '44px' }} />
                    </header>

                    {error && (
                        <div style={{
                            padding: '1rem',
                            background: 'var(--color-pink-light)',
                            color: 'var(--color-danger)',
                            borderRadius: 'var(--border-radius)',
                            fontSize: 'var(--font-size-base)',
                        }}>
                            {error}
                        </div>
                    )}

                    {!scanResult ? (
                        <>
                            {/* 이미지 업로드 영역 */}
                            <div
                                className="card"
                                style={{
                                    minHeight: '300px',
                                    display: 'flex',
                                    flexDirection: 'column',
                                    alignItems: 'center',
                                    justifyContent: 'center',
                                    cursor: 'pointer',
                                    border: '3px dashed var(--color-cream-dark)',
                                }}
                                onClick={() => fileInputRef.current?.click()}
                            >
                                {preview ? (
                                    <img
                                        src={preview}
                                        alt="처방전 미리보기"
                                        style={{
                                            maxWidth: '100%',
                                            maxHeight: '400px',
                                            borderRadius: 'var(--border-radius)',
                                        }}
                                    />
                                ) : (
                                    <>
                                        <div className="status-icon" style={{
                                            width: '80px',
                                            height: '80px',
                                            background: 'var(--color-cream)',
                                            marginBottom: '1rem',
                                        }}>
                                            <Camera size={36} color="var(--color-text-light)" />
                                        </div>
                                        <p style={{
                                            fontSize: 'var(--font-size-lg)',
                                            color: 'var(--color-text-light)',
                                            textAlign: 'center',
                                        }}>
                                            처방전 또는 약 봉투 사진을<br />
                                            촬영하거나 선택해주세요
                                        </p>
                                    </>
                                )}
                                <input
                                    ref={fileInputRef}
                                    type="file"
                                    accept="image/*"
                                    capture="environment"
                                    onChange={handleFileChange}
                                    style={{ display: 'none' }}
                                />
                            </div>

                            {/* 안내 */}
                            <div className="card" style={{ background: 'var(--color-mint-light)' }}>
                                <p style={{
                                    fontSize: 'var(--font-size-base)',
                                    color: 'var(--color-mint-dark)',
                                    fontWeight: 600,
                                    marginBottom: '0.5rem',
                                    display: 'flex',
                                    alignItems: 'center',
                                    gap: '0.5rem',
                                }}>
                                    <Lightbulb size={18} />
                                    스캔 팁
                                </p>
                                <ul style={{
                                    fontSize: 'var(--font-size-sm)',
                                    color: 'var(--color-text)',
                                    paddingLeft: '1.5rem',
                                }}>
                                    <li>밝은 곳에서 촬영해주세요</li>
                                    <li>글씨가 잘 보이도록 가까이 촬영해주세요</li>
                                    <li>약 이름과 복용 시간이 보이면 좋아요</li>
                                </ul>
                            </div>

                            {/* 스캔 버튼 */}
                            <button
                                onClick={handleScan}
                                disabled={!preview || isLoading}
                                className="btn btn-primary w-full"
                                style={{ fontSize: 'var(--font-size-xl)', minHeight: '64px' }}
                            >
                                {isLoading ? (
                                    <Loader2 size={24} className="animate-spin" />
                                ) : (
                                    <>
                                        <Search size={24} />
                                        AI로 분석하기
                                    </>
                                )}
                            </button>
                        </>
                    ) : (
                        <>
                            {/* 스캔 결과 */}
                            <div className="card">
                                <h2 style={{
                                    fontSize: 'var(--font-size-lg)',
                                    fontWeight: 700,
                                    marginBottom: '1rem',
                                    display: 'flex',
                                    alignItems: 'center',
                                    gap: '0.5rem',
                                }}>
                                    <Check size={20} color="var(--color-mint-dark)" />
                                    분석 결과
                                </h2>

                                {scanResult.medications?.map((med: any, index: number) => {
                                    const duplicate = isDuplicate(med.name);
                                    return (
                                        <div
                                            key={index}
                                            style={{
                                                padding: '1rem',
                                                marginBottom: '0.5rem',
                                                background: duplicate ? 'var(--color-cream-dark)' : 'var(--color-cream)',
                                                borderRadius: 'var(--border-radius)',
                                                opacity: duplicate ? 0.7 : 1,
                                                position: 'relative',
                                            }}
                                        >
                                            <div className="flex justify-between items-start">
                                                <p style={{
                                                    fontSize: 'var(--font-size-lg)',
                                                    fontWeight: 600,
                                                    marginBottom: '0.25rem',
                                                }}>
                                                    {med.name}
                                                </p>
                                                {duplicate && (
                                                    <span style={{
                                                        fontSize: 'var(--font-size-sm)',
                                                        color: 'white',
                                                        background: 'var(--color-danger)',
                                                        padding: '0.25rem 0.75rem',
                                                        borderRadius: '999px',
                                                        fontWeight: 600,
                                                        whiteSpace: 'nowrap',
                                                        flexShrink: 0,
                                                        marginLeft: '0.5rem',
                                                        alignSelf: 'flex-start',
                                                        height: 'fit-content',
                                                        lineHeight: '1.2',
                                                    }}>
                                                        이미 등록됨
                                                    </span>
                                                )}
                                            </div>
                                            <p style={{ fontSize: 'var(--font-size-base)', color: 'var(--color-text-light)' }}>
                                                {med.dosage} · {med.frequency}
                                            </p>
                                            {med.description && (
                                                <p style={{ fontSize: 'var(--font-size-sm)', color: 'var(--color-text)', marginTop: '0.25rem' }}>
                                                    {med.description}
                                                </p>
                                            )}
                                            <p style={{ fontSize: 'var(--font-size-sm)', color: 'var(--color-mint-dark)', marginTop: '0.25rem' }}>
                                                복용 시간: {med.times?.join(', ')}
                                            </p>
                                        </div>
                                    );
                                })}
                            </div>

                            <div className="flex flex-col gap-4">
                                <button
                                    onClick={handleConfirm}
                                    disabled={isLoading}
                                    className="btn btn-primary w-full"
                                    style={{ fontSize: 'var(--font-size-xl)', minHeight: '64px' }}
                                >
                                    {isLoading ? (
                                        <Loader2 size={24} className="animate-spin" />
                                    ) : (
                                        <>
                                            <Check size={24} />
                                            이대로 등록하기
                                        </>
                                    )}
                                </button>
                                <button
                                    onClick={() => {
                                        setScanResult(null);
                                        setPreview(null);
                                    }}
                                    className="btn w-full"
                                    style={{
                                        background: 'var(--color-cream)',
                                        color: 'var(--color-text)',
                                    }}
                                >
                                    <RefreshCw size={20} />
                                    다시 스캔하기
                                </button>
                            </div>
                        </>
                    )}
                </div>
            </div>
        </>
    );
}
