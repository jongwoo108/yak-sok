/**
 * API 타입 정의 (웹과 공유)
 */

// 사용자
export interface User {
    id: number;
    username: string;
    email: string;
    first_name: string;
    last_name: string;
    role: 'patient' | 'senior' | 'guardian';
    phone_number: string;
    emergency_contact: string;
    emergency_relation?: string;
    emergency_name?: string;
}

// 보호자 관계
export interface GuardianRelation {
    id: number;
    senior: number;
    guardian: number;
    senior_name: string;
    guardian_name: string;
    is_primary: boolean;
    created_at: string;
}

// 비상 연락처
export interface EmergencyContact {
    id: number;
    name: string;
    relation: string;
    phone_number: string;
    email: string;
    notify_by_email: boolean;
    is_primary: boolean;
    created_at: string;
    updated_at: string;
}

// 약품 그룹
export interface MedicationGroup {
    id: number;
    name: string;
    color: string;
    is_severe: boolean;
    medications_count: number;
}

// 복용 약품
export interface Medication {
    id: number;
    name: string;
    description: string;
    dosage: string;
    prescription_image?: string;
    is_active: boolean;
    is_severe?: boolean; // 그룹의 중증도 정보를 포함할 수 있음
    schedules: MedicationSchedule[];
    group_id?: number | null;
    group_name?: string | null;
    days_supply?: number | null;  // 처방 일수
    start_date?: string | null;   // 복용 시작일 (YYYY-MM-DD)
    end_date?: string | null;     // 처방 종료일 (= 다음 병원 방문일, 계산됨)
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

// API 응답
export interface ApiResponse<T> {
    count?: number;
    next?: string | null;
    previous?: string | null;
    results?: T[];
    data?: T;
}

// 캘린더 일별 요약
export interface DailyMedicationSummary {
    total: number;
    taken: number;
    missed: number;
}

// 병원 방문일 정보
export interface HospitalVisit {
    date: string;           // YYYY-MM-DD
    medication_id: number;
    medication_name: string;
    days_supply: number;
}

// 캘린더 데이터 (날짜 -> 요약)
export type CalendarDailySummary = Record<string, DailyMedicationSummary>;

// 캘린더 API 응답
export interface CalendarData {
    daily_summary: CalendarDailySummary;
    hospital_visits: HospitalVisit[];
}

// 건강 프로필
export interface HealthCondition {
    name: string;
    category: string;
}

export interface HealthProfile {
    id: number;
    username: string;
    conditions: HealthCondition[];
    search_queries: { query: string; category: string; condition: string }[];
    last_analyzed_at: string | null;
    created_at: string;
    updated_at: string;
}

// 캐시된 YouTube 영상
export interface CachedVideo {
    id: number;
    video_id: string;
    title: string;
    description?: string;
    thumbnail_url: string;
    channel_title: string;
    channel_id: string;
    published_at: string;
    view_count: number;
    content_category: 'diet' | 'exercise' | 'lifestyle' | 'medical' | 'general';
    content_category_display: string;
    conditions: { id: number; name: string; category: string; category_display: string }[];
    is_from_trusted_channel: boolean;
    is_bookmarked: boolean;
    search_query?: string;
    fetched_at?: string;
    updated_at?: string;
}

// 영상 북마크
export interface VideoBookmark {
    id: number;
    video: number;
    video_detail: CachedVideo;
    created_at: string;
}

