# 03. 프론트엔드 개발 상세

> 작성일: 2026-01-09

## 개발 완료 항목

### ✅ 프로젝트 설정

| 파일 | 설명 |
|------|------|
| `package.json` | Next.js 14 + TypeScript + Zustand |
| `tsconfig.json` | TypeScript 설정, 경로 별칭 (`@/*`) |
| `next.config.js` | API 프록시, PWA 설정 |
| `public/manifest.json` | PWA 매니페스트 |

### 의존성

```json
{
  "dependencies": {
    "next": "14.0.0",
    "react": "^18",
    "axios": "^1.6.0",
    "zustand": "^4.4.0",
    "react-hook-form": "^7.48.0",
    "date-fns": "^2.30.0",
    "lucide-react": "^0.294.0",
    "framer-motion": "^10.16.0"
  }
}
```


---

## 페이지 구조 (`src/app/`)

| 경로 | 파일 | 설명 |
|------|------|------|
| `/` | `page.tsx` | 홈 - 오늘의 복약 목록 |
| `/login` | `login/page.tsx` | 로그인/회원가입 |
| `/medications` | `medications/page.tsx` | 내 약 목록 (편집 모드, 일괄 삭제) |
| `/medications/[id]` | `medications/[id]/page.tsx` | 약 상세/수정 |
| `/medications/add` | `medications/add/page.tsx` | 약 추가 (시간대 선택) |
| `/medications/scan` | `medications/scan/page.tsx` | 처방전 OCR 스캔 (중복 감지) |
| `/profile` | `profile/page.tsx` | 내 정보 + 비상 연락처 |
| `/guardian` | `guardian/page.tsx` | 보호자 대시보드 |
| `/alerts` | `alerts/page.tsx` | 알림 내역 |


---

## 컴포넌트 (`src/components/`)

### MedicationCard

복약 카드 컴포넌트 - 큰 터치 영역, 상태 표시

```tsx
interface MedicationCardProps {
  medication: Medication;
  isSelectionMode: boolean;
  isSelected: boolean;
  onToggleSelect: (id: number) => void;
}

// 주요 기능:
// - 복용 완료 버튼 (큰 터치 영역)
// - 상태별 색상 구분 (복용 중: 녹색, 중단: 분홍색)
// - 스캔에서 등록된 설명 1줄 표시 (truncate)
// - 편집 모드: 체크박스 표시
// - 클릭 시 상세 페이지 이동
```


### Button

재사용 가능한 버튼 컴포넌트

```tsx
interface ButtonProps {
  variant?: 'primary' | 'success' | 'danger' | 'outline';
  size?: 'default' | 'large';
  isLoading?: boolean;
}
```

### Input

재사용 가능한 입력 필드 컴포넌트

```tsx
interface InputProps {
  label?: string;
  error?: string;
}
```

---

## 서비스 (`src/services/`)

### API 클라이언트 (`api.ts`)

```typescript
// Axios 인스턴스 설정
export const apiClient = axios.create({
  baseURL: '/api',
  headers: { 'Content-Type': 'application/json' },
});

// 인터셉터: JWT 토큰 자동 추가
// 인터셉터: 401 응답 시 토큰 자동 갱신

export const api = {
  auth: { login, register, me },
  medications: { list, create, scanPrescription, voiceCommand },
  logs: { today, take },
  alerts: { list, pending },
  emergencyContacts: { list, create, update, delete },
};
```

### 상태 관리 (`store.ts`)

Zustand를 사용한 전역 상태 관리

```typescript
interface AppState {
  // 사용자
  user: User | null;
  isAuthenticated: boolean;
  
  // 복약
  medications: Medication[];
  todayLogs: MedicationLog[];
  
  // 알림
  alerts: Alert[];
  
  // 로딩/에러
  isLoading: boolean;
  error: string | null;
  
  // 액션
  fetchUser, logout,
  fetchMedications, deleteMedication, updateMedication,
  fetchTodayLogs, takeMedication,
  fetchAlerts,
}
```


### 타입 정의 (`types.ts`)

```typescript
// User, Medication, MedicationSchedule, MedicationLog
// Alert, EmergencyContact
// OCRResult, STTResult
// ApiResponse<T>
```

---

## 시니어 맞춤 UI 설계 (`globals.css`)

### CSS 변수

```css
:root {
  /* 고대비 색상 */
  --color-primary: #4F46E5;
  --color-success: #059669;
  --color-warning: #D97706;
  --color-danger: #DC2626;
  
  /* 큰 폰트 */
  --font-size-base: 1.25rem;   /* 20px */
  --font-size-lg: 1.5rem;      /* 24px */
  --font-size-xl: 2rem;        /* 32px */
  --font-size-2xl: 2.5rem;     /* 40px */
  
  /* 큰 터치 영역 */
  --touch-target-min: 48px;
  --border-radius: 16px;
}
```

### 디자인 원칙

1. **최소 터치 영역 48px**: 모든 인터랙티브 요소
2. **고대비 색상**: 시각 능력 저하 고려
3. **큰 폰트**: 기본 20px, 제목 32-40px
4. **명확한 상태 구분**: 색상 + 아이콘 조합
5. **단순한 네비게이션**: 최대 3depth

---

## 페이지별 주요 기능

### 홈 페이지 (`/`)

- 오늘 날짜 표시
- 복약 카드 목록 (시간순)
- 복용 완료 버튼 (원터치)
- 하단 네비게이션 (약 목록, 설정)

### 로그인 페이지 (`/login`)

- 로그인/회원가입 탭 전환
- 시니어/보호자 역할 선택 (회원가입)
- JWT 토큰 저장 (localStorage)

### 약 추가 페이지 (`/medications/add`)

- 약 이름, 복용량 입력
- 시간대 선택 (아침/점심/저녁/취침전)
- 큰 선택 버튼

### 처방전 스캔 페이지 (`/medications/scan`)

- 카메라/갤러리 이미지 선택
- 이미지 미리보기
- AI 분석 결과 표시 (gpt-4o Vision)
- **중복 약품 감지** (이미 등록된 약은 표시)
- 분석 결과 확인 후 등록 (중복은 자동 제외)

### 약 상세 페이지 (`/medications/[id]`) ✨ NEW

- 약 상세 정보 표시 (이름, 용량, 설명)
- 수정 모드 전환 (react-hook-form)
- 복용 상태 토글 (복용 중/중단)
- 삭제 기능


### 프로필 페이지 (`/profile`)

- 사용자 정보 표시
- 비상 연락처 CRUD
- 로그아웃

### 보호자 대시보드 (`/guardian`)

- 담당 시니어 목록
- 시니어별 복약률 표시
- 오늘의 복약 현황
- 긴급 전화 버튼

---

## 실행 방법

```bash
cd frontend

# 의존성 설치
npm install

# 개발 서버 실행 (http://localhost:3000)
npm run dev

# 빌드
npm run build

# 프로덕션 실행
npm start
```

---

## 다음 단계 (TODO)

- [ ] 음성 인식 UI 추가 (Whisper 연동)
- [ ] PWA 오프라인 지원
- [x] ~~푸시 알림 수신 처리 (FCM) - Safety Line~~ ✅ 완료 (UI/UX 개선됨)


- [ ] 다크 모드 지원
- [ ] E2E 테스트 (Playwright)
- [ ] 접근성 검사 (axe-core)

---

## ✅ 최근 구현 완료 (2026-01-10)

- [x] 약 상세/수정 페이지 (`/medications/[id]`)
- [x] 편집 모드 일괄 삭제 (전체 선택/선택 삭제)
- [x] 처방전 스캔 중복 약품 감지
- [x] 약품 설명 목록에서 1줄 truncate
- [x] framer-motion 애니메이션 적용
- [x] **Google 소셜 로그인 구현** (Firebase Auth + Backend ID Token 검증)
    - 상세 내용: [04_authentication_implementation.md](./04_authentication_implementation.md)
