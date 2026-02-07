# 건강 유튜브 피드 기능

> 최종 업데이트: 2026-02-07
> 상태: 구현 완료 (배포 전)

---

## 개요

사용자가 복용 중인 약을 기반으로 GPT-5 Mini가 질병을 추론하고, YouTube Data API v3로 맞춤 건강 영상을 큐레이팅하여 **개인화된 건강 영상 피드**를 제공하는 기능.

---

## 탭 구조

### 변경 전
```
[홈(복약체크)] [내 약] [캘린더] [설정]
```

### 변경 후
```
[건강피드] [복약] [캘린더] [설정]
```

- **건강피드**: 앱의 메인 랜딩 페이지 - YouTube 영상 기반 건강 정보
- **복약**: 오늘 복약 체크 (기존 홈) + 내 약 관리 바로가기
- **캘린더**: 기존 유지
- **설정**: 기존 유지

---

## 콘텐츠 전략

### YouTube 영상 큐레이션 (메인)
- YouTube Data API v3 사용 (무료 할당 10,000 유닛/일)
- 사용자 질병 기반 검색 키워드로 영상 수집
- DB에 캐시하여 API 할당량 절약
- 신뢰 채널 (의사, 약사, 공공기관) 우선 노출

### GPT-5 활용 (보조)
- 약 목록 → 질병 추론 (약 등록 시 1회)
- 질병 → YouTube 검색 키워드 생성
- **모델**: GPT-5 (temperature 파라미터 미지원으로 제거)
- 비용은 사용량에 따라 상이 (체감 테스트용)

---

## 기술 구현

### 백엔드 (`backend/apps/health/`)

| 파일 | 역할 |
|------|------|
| `models.py` | UserHealthProfile, HealthCondition, TrustedChannel, CachedVideo, VideoBookmark |
| `services.py` | GPT-5 질병 추론 + 검색 키워드 생성 |
| `youtube_service.py` | YouTube API 검색, 통계 조회, 캐시 저장 |
| `tasks.py` | Celery Beat 자동 캐시 갱신 (매일 05:00) |
| `views.py` | 프로필, 피드, 북마크 API |
| `serializers.py` | DRF 시리얼라이저 |
| `admin.py` | Django Admin 관리 |

### 프론트엔드

| 파일 | 역할 |
|------|------|
| `mobile/app/(tabs)/health-feed.tsx` | 건강피드 메인 탭 (1열 리스트, 무한 스크롤, 이모지 제거) |
| `mobile/app/health/video/[id].tsx` | 영상 상세 + YouTube 임베드 재생 (에러 시 재시도 UI) |
| `mobile/components/CustomTabBar.tsx` | 탭 구조 수정 |

### API 엔드포인트

```
GET  /api/health/profile/           # 내 건강 프로필
POST /api/health/profile/refresh/   # 질병 재분석
GET  /api/health/feed/              # 영상 피드
GET  /api/health/feed/?category=diet # 카테고리 필터
GET  /api/health/feed/<id>/         # 영상 상세
POST /api/health/bookmarks/         # 북마크 추가
GET  /api/health/bookmarks/         # 내 북마크
DELETE /api/health/bookmarks/<id>/  # 북마크 삭제
```

---

## 환경 변수

```
YOUTUBE_API_KEY=...   # Google Cloud Console에서 발급 필요
OPENAI_API_KEY=...    # 기존 사용 (GPT-5 호출)
```

---

## 배포 순서

1. `YOUTUBE_API_KEY` 환경 변수 설정
2. `python manage.py makemigrations health` 실행
3. `python manage.py migrate` 실행
4. Django Admin에서 신뢰 채널 등록
5. 모바일 앱 빌드 (`react-native-youtube-iframe`, `react-native-webview` 설치 필요)
6. Celery Beat에 `refresh-youtube-cache` 태스크 등록 확인

---

## 비용 정리

| 항목 | 비고 |
|------|------|
| GPT-5 | 사용량에 따라 상이 |
| YouTube API | $0 (무료 할당 내) |

---

## v1.1.0 보완 사항 (2026-02-07)

- **피드 레이아웃**: 2열 → 1열, 무한 스크롤 유지
- **스플래시**: 이미지 권장 1284x2778px, `expo-splash-screen`으로 인증 완료 시점까지 표시
- **이모지**: 피드 제목/채널명에서 이모지 제거
- **영상 상세**: 로드 실패 시 에러 메시지 + 재시도 버튼
- **설정 연결관리**: 복약자 계정에서 본인 대신 연결된 보호자만 표시하도록 버그 수정
- **백엔드**: Health URL 라우팅 추가, GPT-5 + temperature 제거, 키워드 생성 프롬프트에 JSON 명시

상세: [18_health_feed_v1.1.0_changelog.md](./18_health_feed_v1.1.0_changelog.md)
