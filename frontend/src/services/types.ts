/**
 * API 타입 정의
 */

// 사용자
export interface User {
    id: number;
    username: string;
    email: string;
    first_name: string;
    last_name: string;
    role: 'senior' | 'guardian';
    phone_number: string;
    emergency_contact: string;
}

// 복용 약품
export interface Medication {
    id: number;
    name: string;
    description: string;
    dosage: string;
    prescription_image?: string;
    is_active: boolean;
    schedules: MedicationSchedule[];
    created_at: string;
    updated_at: string;
}

// 복약 스케줄
export interface MedicationSchedule {
    id: number;
    medication: number;
    time_of_day: 'morning' | 'noon' | 'evening' | 'night' | 'custom';
    time_of_day_display: string;
    scheduled_time: string;
    is_active: boolean;
}

// 복약 기록
export interface MedicationLog {
    id: number;
    schedule: number;
    medication_name: string;
    medication_dosage: string;
    group_id: number | null;
    group_name: string | null;
    time_of_day: string;
    time_of_day_display: string;
    scheduled_datetime: string;
    taken_datetime: string | null;
    status: 'pending' | 'taken' | 'missed' | 'skipped';
    status_display: string;
    notes: string;
    created_at: string;
    updated_at: string;
}

// 비상 알림
export interface Alert {
    id: number;
    user: number;
    recipient: number | null;
    medication_log: number | null;
    medication_name: string;
    alert_type: 'reminder' | 'warning' | 'emergency';
    alert_type_display: string;
    status: 'pending' | 'sent' | 'cancelled' | 'failed';
    status_display: string;
    title: string;
    message: string;
    scheduled_at: string;
    sent_at: string | null;
    created_at: string;
}

// 비상 연락처
export interface EmergencyContact {
    id: number;
    name: string;
    phone_number: string;
    contact_type: 'guardian' | 'hospital' | 'emergency' | 'other';
    contact_type_display: string;
    priority: number;
    is_active: boolean;
    created_at: string;
}

// API 응답
export interface ApiResponse<T> {
    count?: number;
    next?: string | null;
    previous?: string | null;
    results?: T[];
    data?: T;
}

// OCR 스캔 결과
export interface OCRResult {
    success: boolean;
    medications: {
        name: string;
        dosage: string;
        frequency: string;
        times: string[];
    }[];
    message: string;
}

// STT 명령 결과
export interface STTResult {
    success: boolean;
    transcribed_text: string;
    action: string;
    message: string;
}
