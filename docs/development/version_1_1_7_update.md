# Yak-Sok 업데이트 요약 (v1.1.7)
작성일: 2026년 3월 20일

## 1. 모바일 앱 스캔 결과 UI 통일
- **문제점:** 처방전 스캔 결과 화면의 "계속 복용"과 "빠진 약" 카드가 각각 초록색, 빨간색 배경을 전체적으로 사용하여 기존 앱의 파스텔 뉴모피즘(Neumorphism) 디자인 시스템과 이질감이 있었으며, 약 정보 텍스트가 위로 치우쳐진 정렬 문제가 존재.
- **해결 내역:**
  - 모든 스캔 결과 카드 배경을 통일된 뉴모피즘 기본 배경(`colors.baseLight`, 흰색)으로 변경.
  - "계속 복용" 및 "빠진 약"의 상태를 나타내기 위해 항목 좌측 원형 아이콘의 색상을 각각 앱의 메인 키 컬러(`colors.primary`, 민트색)와 빨간색(`colors.dangerDark`)으로 통일.
  - `medicationHeader`의 정렬을 `alignItems: 'center'` 및 `marginBottom: 0`으로 재조정하여 수직 중앙 정렬 문제와 불필요한 하단 여백 제거.
- **결과:** 전체 앱의 디자인 일관성을 회복하고, 시각적으로 훨씬 깔끔한 정보 전달 가능.

## 2. 모바일 앱 빌드 및 업데이트 배포
- `app.config.js`의 버전 및 빌드 번호 상향 (`version: 1.1.7`, `buildNumber: 32`).
- EAS OTA 업데이트(`eas update`)를 활용하여 앱 스토어 재심사 없이 UI 변경 사항을 빠르게 프로덕션 모바일 앱에 배포.

## 3. 백엔드 배포 안정화 (405 Method Not Allowed 에러 수정)
- **문제점:** 모바일 앱에서 "계속 복용" 혹은 "빠진 약" 처리를 할 때, `batch-renew` 및 `batch-deactivate` API를 호출하면 405 Method Not Allowed 에러가 발생.
- **해결 내역:**
  - 해당 API (Custom Actions) 코드는 이미 백엔드 저장소에 병합되어 있었으나, 실제 클라우드 서버(EC2)에는 최신 코드가 반영되지 않은 상태임을 확인.
  - 서버 측에서 `git pull`을 실행하여 최신 코드를 다운로드하고, Nginx 캐시 및 `gunicorn` 컨테이너 재시작, Django 마이그레이션을 정상적으로 적용.
- **결과:** 운영 서버에 최신 로직 반영 후 API 정상 작동 확인. 

## 4. 프론트엔드 (웹) 코드 정리 및 Expo Web 배포 검토
- 기존의 Next.js 프론트엔드는 더 이상 사용되지 않음을 확인하고 `frontend/` 폴더 완전 삭제 적용 (모바일 앱으로 일원화).
- 대안으로 `npx expo export --platform web`을 사용해 Expo Web (React Native Web) 빌드를 시도.
- EC2 서버의 Nginx에 빌드된 웹 정적 파일들을 배포하고 `try_files` 및 API 프록시 설정을 추가.
- **현재 이슈 및 향후 계획:**
  - 카메라 캡처(`expo-camera`)나 네이티브 의존성을 가지는 라이브러리(`react-native-web-webview` 등)가 웹 환경에서 ES 모듈 변환 에러(`Cannot use import statement outside a module`)를 유발하여 빈 화면이 출력되는 구조적 한계 발견.
  - 모바일 UX에 집중하기 위해 고비용의 React Native Web 트러블슈팅을 진행하기보다는, 추후 필요시 서비스 소개용 랜딩 페이지를 단순 제작하는 방향을 제안.
