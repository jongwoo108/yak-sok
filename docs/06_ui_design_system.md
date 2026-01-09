# 06. UI/UX 디자인 시스템

> 약속(Yak-Sok) 프론트엔드 디자인 시스템 문서

## 1. 디자인 컨셉

### 1.1 파스텔 뉴모피즘 (Pastel Neumorphism)

시니어 사용자를 위한 부드럽고 따뜻한 시각적 경험을 제공하는 디자인 시스템입니다.

```
특징:
- 파스텔 톤의 부드러운 색상
- 입체감 있는 뉴모피즘 그림자
- 시니어 친화적 큰 폰트와 터치 영역
- 유기적인 배경 그라데이션
```

### 1.2 색상 팔레트

```css
/* 주요 색상 */
--color-mint: #A8D5BA;        /* 메인 민트 */
--color-mint-light: #C5E8D5;  /* 민트 라이트 */
--color-mint-dark: #7BC49A;   /* 민트 다크 (Primary) */

--color-blue: #8EB8C9;        /* 보조 블루 */
--color-blue-light: #B5D1DC;
--color-blue-dark: #6A9AAD;

--color-cream: #F5EDE3;       /* 배경 크림 */
--color-cream-light: #FAF6F1; /* 기본 배경 */
--color-cream-dark: #EBE3D5;

--color-pink: #F5D6D0;        /* 경고/위험 핑크 */
--color-pink-light: #FAE9E5;
--color-pink-dark: #E8B4A8;
```

### 1.3 타이포그래피

```css
/* 시니어 맞춤 큰 폰트 크기 */
--font-size-sm: 0.9rem;    /* 14.4px */
--font-size-base: 1.1rem;  /* 17.6px */
--font-size-lg: 1.35rem;   /* 21.6px */
--font-size-xl: 1.75rem;   /* 28px */
--font-size-2xl: 2.25rem;  /* 36px */

/* 폰트 패밀리 */
font-family: 'Noto Sans KR', -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif;
```

---

## 2. 레이아웃 시스템

### 2.1 동적 페이지 레이아웃

고정된 헤더/푸터 대신 **동적 여백**을 사용하여 자연스러운 콘텐츠 흐름을 제공합니다.

```
┌─────────────────────────────────────┐
│         ↑ 동적 여백 (2~4rem)        │
│                                     │
│  ┌─────────────────────────────┐    │
│  │        헤더                 │    │
│  ├─────────────────────────────┤    │
│  │                             │    │
│  │    메인 콘텐츠              │    │  ← 세로 중앙 정렬
│  │    (gap 기반 간격)          │    │
│  │                             │    │
│  ├─────────────────────────────┤    │
│  │        하단 버튼            │    │
│  └─────────────────────────────┘    │
│                                     │
│         ↓ 동적 여백 (2~4rem)        │
└─────────────────────────────────────┘
```

### 2.2 CSS 클래스

#### `.page-wrapper`
페이지 전체를 감싸는 래퍼입니다.

```css
.page-wrapper {
  display: flex;
  flex-direction: column;
  min-height: 100vh;
  padding: clamp(2rem, 5vh, 4rem) var(--spacing-lg);
  padding-bottom: max(2rem, env(safe-area-inset-bottom, 2rem));
}
```

#### `.page-content`
메인 콘텐츠 영역으로, 세로 중앙 정렬됩니다.

```css
.page-content {
  flex: 1;
  display: flex;
  flex-direction: column;
  justify-content: center;
  gap: var(--spacing-lg);
  max-width: 480px;
  margin: 0 auto;
  width: 100%;
}
```

### 2.3 사용 예시

```tsx
export default function ExamplePage() {
    return (
        <>
            <div className="organic-bg" />
            <div className="page-wrapper">
                <div className="page-content">
                    {/* 헤더 */}
                    <header>...</header>
                    
                    {/* 메인 콘텐츠 */}
                    <main>...</main>
                    
                    {/* 하단 버튼 */}
                    <nav>...</nav>
                </div>
            </div>
        </>
    );
}
```

---

## 3. 컴포넌트 스타일

### 3.1 버튼 (Button)

```css
.btn {
  min-height: 52px;              /* 큰 터치 영역 */
  padding: 1rem 2rem;
  font-size: 1.35rem;
  font-weight: 600;
  border-radius: 50px;           /* Pill 형태 */
  box-shadow: 8px 8px 16px rgba(0, 0, 0, 0.08),
              -8px -8px 16px rgba(255, 255, 255, 0.8);
}

.btn-primary {
  background: linear-gradient(135deg, #A8D5BA 0%, #7BC49A 100%);
  color: white;
}
```

### 3.2 카드 (Card)

```css
.card {
  background: var(--color-cream);
  border-radius: 28px;
  padding: 2rem;
  box-shadow: 8px 8px 16px rgba(0, 0, 0, 0.08),
              -8px -8px 16px rgba(255, 255, 255, 0.8);
}
```

### 3.3 입력 필드 (Input)

```css
.input {
  min-height: 52px;
  padding: 1.5rem;
  font-size: 1.1rem;
  border-radius: 20px;
  box-shadow: inset 4px 4px 8px rgba(0, 0, 0, 0.05),
              inset -4px -4px 8px rgba(255, 255, 255, 0.9);
}
```

### 3.4 상태 아이콘 (Status Icon)

```css
.status-icon {
  width: 60px;
  height: 60px;
  border-radius: 50%;
  display: flex;
  align-items: center;
  justify-content: center;
}

.status-icon-success {
  background: linear-gradient(135deg, #C5E8D5 0%, #A8D5BA 100%);
}

.status-icon-pending {
  background: linear-gradient(135deg, #FAE9E5 0%, #F5D6D0 100%);
}
```

---

## 4. 유기적 배경

부드러운 그라데이션 배경을 제공합니다.

```css
.organic-bg {
  position: fixed;
  top: 0;
  left: 0;
  right: 0;
  bottom: 0;
  z-index: -1;
  background:
    radial-gradient(ellipse at 0% 0%, #C5E8D5 0%, transparent 50%),
    radial-gradient(ellipse at 100% 0%, #B5D1DC 0%, transparent 50%),
    radial-gradient(ellipse at 50% 100%, #FAE9E5 0%, transparent 50%),
    #FAF6F1;
}
```

---

## 5. 반응형 디자인

### 5.1 브레이크포인트

```css
/* 기본: 모바일 (< 768px) */
.page-content {
  max-width: 480px;
}

/* 태블릿 이상 */
@media (min-width: 768px) {
  .page-content {
    max-width: 640px;
  }
}
```

### 5.2 동적 패딩

`clamp()` 함수를 사용하여 화면 크기에 따라 패딩이 자동 조절됩니다.

```css
.page-wrapper {
  padding: clamp(2rem, 5vh, 4rem) 1.5rem;
}

.p-6 {
  padding: clamp(1.5rem, 4vh, 3rem) 1.5rem;
}
```

---

## 6. 아이콘 시스템

[Lucide React](https://lucide.dev/)를 사용합니다.

### 6.1 자주 사용되는 아이콘

| 아이콘 | 용도 | import |
|--------|------|--------|
| `Pill` | 약/복약 | `lucide-react` |
| `Camera` | 처방전 스캔 | `lucide-react` |
| `User` | 프로필 | `lucide-react` |
| `Bell` | 알림 | `lucide-react` |
| `Check` | 완료/확인 | `lucide-react` |
| `ArrowLeft` | 뒤로가기 | `lucide-react` |
| `Plus` | 추가 | `lucide-react` |

### 6.2 사용 예시

```tsx
import { Pill, Check, ArrowLeft } from 'lucide-react';

<Pill size={24} color="var(--color-mint-dark)" />
<Check size={20} color="white" />
<ArrowLeft size={22} color="var(--color-text)" />
```

---

## 7. 접근성

### 7.1 포커스 표시

```css
:focus-visible {
  outline: 3px solid var(--color-mint);
  outline-offset: 2px;
}
```

### 7.2 터치 영역

모든 인터랙티브 요소는 최소 52px의 터치 영역을 가집니다.

```css
--touch-target-min: 52px;
```

### 7.3 색상 대비

- 텍스트 색상: `#5A6B5D` (배경과 4.5:1 이상 대비율)
- 보조 텍스트: `#8A9B8D`

---

## 8. 페이지별 적용 현황

| 페이지 | 파일 위치 | 레이아웃 |
|--------|-----------|----------|
| 홈 | `app/page.tsx` | page-wrapper + page-content |
| 로그인 | `app/login/page.tsx` | page-wrapper + page-content |
| 약 목록 | `app/medications/page.tsx` | page-wrapper + page-content |
| 약 추가 | `app/medications/add/page.tsx` | page-wrapper + page-content |
| 처방전 스캔 | `app/medications/scan/page.tsx` | page-wrapper + page-content |
| 프로필 | `app/profile/page.tsx` | page-wrapper + page-content |
| 알림 | `app/alerts/page.tsx` | page-wrapper + page-content |
| 보호자 대시보드 | `app/guardian/page.tsx` | page-wrapper + page-content |

---

## 9. 개발 가이드라인

### 9.1 새 페이지 생성 시

1. `page-wrapper`와 `page-content` 클래스 사용
2. `organic-bg` 배경 추가
3. Lucide 아이콘 사용
4. 시니어 친화적 큰 폰트 크기 유지

### 9.2 체크리스트

- [ ] 최소 터치 영역 52px 확보
- [ ] 뉴모피즘 그림자 적용
- [ ] 동적 패딩 사용 (`clamp()`)
- [ ] 모바일 우선 반응형 디자인
- [ ] 접근성 포커스 표시 확인
