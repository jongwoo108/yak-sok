# 건강 피드 v1.1.0 작업 정리

> 최종 업데이트: 2026-02-07
> 앱 버전: 1.1.0 / 빌드 18

---

## 개요

건강 유튜브 피드 기능 배포 전 UI/UX 보완, 스플래시 개선, 버그 수정 및 백엔드 이슈 해결 내용을 정리한 문서.

---

## 1. 건강 피드 UI 변경

### 1.1 레이아웃: 2열 → 1열

- **파일**: `mobile/app/(tabs)/health-feed.tsx`
- **변경**: `FlatList`의 `numColumns={2}` 제거, 카드 너비를 화면 전체(`SCREEN_WIDTH - spacing.xl * 2`)로 변경
- **효과**: 한 줄에 영상 하나씩 표시, 제목·채널명 가독성 향상

### 1.2 무한 스크롤

- **유지**: `onEndReached={loadMore}`, `onEndReachedThreshold={0.3}` 기존 구현 유지
- 1열 전환 후에도 페이지네이션 정상 동작

### 1.3 이모지 제거

- **파일**: `mobile/app/(tabs)/health-feed.tsx`
- **추가**: `removeEmojis()` 유틸 — YouTube 제목·채널명에서 이모지 제거 (정규식 기반)
- **표시**: `video.title`, `channel_title` 렌더 시 `removeEmojis()` 적용

### 1.4 카드 UI 보완

- 썸네일 하단에 카테고리 태그 표시 (`content_category_display`)
- 제목/채널 폰트 크기 조정 (1열에 맞춤)

---

## 2. 스플래시 화면

### 2.1 이미지 권장 사이즈

- **권장**: 1284 x 2778px (iPhone 15 Pro Max 기준)
- **최소**: 1080 x 1920px
- **설정**: `app.config.js` — `splash.image: "./assets/splash-icon.png"`, `resizeMode: "contain"`, `backgroundColor: "#F0F7F4"`
- 로고는 중앙에 적당한 크기(300~500px)로 배치하고 나머지는 배경색으로 채우면 확대/축소 시 자연스럽게 표시됨

### 2.2 지속시간 제어

- **패키지**: `expo-splash-screen` (기존 설치됨)
- **파일**: `mobile/app/_layout.tsx` — `SplashScreen.preventAutoHideAsync()` 호출로 앱 로드 전 스플래시 유지
- **파일**: `mobile/app/index.tsx` — 인증 확인(`restoreAuth`) 완료 후 `SplashScreen.hideAsync()` 호출
- **결과**: 토큰 확인 + `api.auth.me()` 완료 시점(약 1.5~3초)까지 스플래시 표시 후 자동 숨김

---

## 3. 영상 상세 / 재생

### 3.1 에러 처리 보강

- **파일**: `mobile/app/health/video/[id].tsx`
- **추가**: `loadError` 상태 — API 실패 시 무한 로딩 방지
- **UI**: 로드 실패 시 "영상을 불러올 수 없습니다" + "다시 시도" 버튼 + 뒤로가기
- **로직**: `isLoading`일 때만 스피너, 에러/데이터 없음일 때는 에러 화면 분리

### 3.2 재생

- **구현**: `react-native-youtube-iframe`의 `YoutubePlayer` 사용, `videoId={video.video_id}`, `play={playing}`
- **의존성**: `react-native-webview` 필요 (package.json에 포함됨)
- 재생이 안 될 경우: 네트워크, YouTube 제한, WebView 권한 등 환경 요인 확인 필요

---

## 4. 설정 탭 버그 수정 (연결관리)

### 4.1 증상

- 설정 > 연결관리에서 **복약자(patient)** 계정으로 들어가면 "연결된 사용자"에 **본인 계정**이 표시됨

### 4.2 원인

- **파일**: `mobile/app/(tabs)/profile.tsx` — `fetchConnections` 내 역할 분기
- **기존**: `user.role === 'senior'`일 때만 보호자(guardian) 표시, 그 외(patient 포함)는 `rel.senior`(본인) 표시

### 4.3 수정

- **로직**: `user.role === 'guardian'`일 때만 연결된 시니어(`rel.senior`) 표시, **나머지(senior + patient)**는 연결된 보호자(`rel.guardian`) 표시
- 복약자도 시니어와 동일하게 "연결된 보호자"만 보이도록 통일

---

## 5. 백엔드 수정 사항

### 5.1 Health API URL 라우팅

- **파일**: `backend/core/urls.py`
- **추가**: `re_path(r'^api/health/?', include('apps.health.urls'))` — health 앱 URL 등록
- **원인**: health URL이 누락되어 `/api/health/feed/` 요청 시 404 발생

### 5.2 Health URL 패턴

- **파일**: `backend/apps/health/urls.py`
- **변경**: `re_path(r'^/', ...)` 제거, 다른 앱과 동일하게 `path('', include(router.urls))` 사용

### 5.3 OpenAI 모델 및 파라미터

- **파일**: `backend/apps/health/services.py`
- **모델**: `gpt-5-mini` → `gpt-5` (약 스캔 정확도 테스트 및 비용 체감 목적)
- **temperature**: 두 곳 모두 제거 — GPT-5 계열에서 `temperature` 커스텀 값 미지원 오류 방지
- **JSON 프롬프트**: `generate_search_queries` 시스템 메시지에 "결과는 JSON으로 반환하세요" 문구 추가 — `response_format: json_object` 사용 시 메시지 내 "json" 필수 요구사항 충족

---

## 6. 배포/운영 참고

### 6.1 Docker Compose

- **서비스 재시작**: `docker-compose -f docker-compose.prod.yml down --remove-orphans` 후 `up -d --build`
- **컨테이너 이름 충돌** 시 위 순서로 정리 후 재기동

### 6.2 수동 테스트 (서버)

```bash
# 건강 프로필 분석 (user_id 8 예시)
docker-compose -f docker-compose.prod.yml exec backend python manage.py shell -c "
from apps.health.tasks import refresh_user_health_profile
refresh_user_health_profile(8)
"

# YouTube 캐시 갱신
docker-compose -f docker-compose.prod.yml exec backend python manage.py shell -c "
from apps.health.tasks import refresh_youtube_cache
refresh_youtube_cache()
"
```

### 6.3 앱 빌드

- **버전**: 1.1.0 / 빌드 18 (`mobile/app.config.js`)
- **iOS 프로덕션**: `cd mobile && eas build --platform ios --profile production`
- **제출**: `eas submit --platform ios --profile production`

---

## 관련 문서

- [16_health_newsfeed_plan.md](./16_health_newsfeed_plan.md) — 건강 유튜브 피드 기능 설계 및 API
- [docs/README.md](../README.md) — 전체 개발 진행 현황
