# 앱스토어 제출 가이드 - 단계별 실행 가이드

> 작성일: 2026-01-25
> 
> 이 문서는 실제로 실행해야 할 명령어와 작업 순서를 정리한 가이드입니다.

---

## ✅ 완료된 작업

- [x] 이용약관 HTML 파일 생성 (`backend/apps/users/templates/terms.html`)
- [x] 개인정보 처리방침 HTML 파일 생성 (`backend/apps/users/templates/privacy.html`)
- [x] Django views 및 URL 라우팅 추가
- [x] 모바일 앱에 링크 연결 (`mobile/app/(tabs)/profile.tsx`)
- [x] 앱스토어 메타데이터 문서 생성 (`docs/deployment/05_appstore_metadata.md`)

---

## 📋 지금 해야 할 작업

### 1단계: 백엔드 서버에 법적 문서 배포

```bash
# 서버 SSH 접속 (실제 정보는 docs/SENSITIVE_INFO.md 참고)
ssh -i <SSH 키 경로> ubuntu@<서버 IP>

# 프로젝트 디렉토리로 이동
cd /app/yak-sok

# 최신 코드 받기
git pull origin main

# Docker 컨테이너 재시작
docker-compose -f docker-compose.prod.yml restart backend

# 배포 확인
curl https://yaksok-care.com/terms/
curl https://yaksok-care.com/privacy/
```

**예상 결과**: HTML 페이지가 정상적으로 표시됨

---

### 2단계: 모바일 앱 코드 커밋 (선택 사항)

```bash
# Git 상태 확인
git status

# 변경사항 스테이징
git add mobile/app/(tabs)/profile.tsx
git add backend/apps/users/templates/
git add backend/apps/users/views.py
git add backend/apps/users/urls.py
git add docs/deployment/05_appstore_metadata.md

# 커밋
git commit -m "Add terms and privacy policy pages, update app links"

# 푸시
git push origin main
```

---

### 3단계: Production 빌드 실행

#### 3.1 빌드 명령어

```bash
cd mobile
npx eas build --platform ios --profile production
```

#### 3.2 빌드 중 질문 응답

**중요**: 다음 질문들에 아래와 같이 답변하세요:

```
✔ Do you want to log in to your Apple account? ... yes
✔ Apple ID: ... <Apple 개발자 계정 이메일>
[비밀번호 입력]

✔ Reuse this distribution certificate? ... yes
✔ Generate a new Apple Provisioning Profile? ... YES (이번에는 yes!)
```

**빌드 시간**: 약 15-20분

#### 3.3 빌드 완료 확인

빌드가 완료되면 다음과 같은 메시지가 표시됩니다:

```
✔ Build finished

Build URL: https://expo.dev/accounts/jongwoo1008/projects/yak-sok/builds/...
```

---

### 4단계: TestFlight에 업로드 (선택 사항 - 사전 테스트용)

```bash
# 최신 빌드를 TestFlight에 자동 제출
npx eas submit --platform ios --latest
```

또는 **App Store Connect 웹사이트**에서 수동 제출:
1. https://appstoreconnect.apple.com 로그인
2. 내 앱 → 약-속 선택
3. TestFlight 탭
4. 새 빌드가 자동으로 표시됨 (처리 중...)
5. 처리 완료 후 "배포할 그룹" 선택

**테스트 추천**: Production 빌드로 실기기에서 다시 한번 전체 기능 테스트

---

### 5단계: 앱스토어 제출 준비

#### 5.1 App Store Connect에서 새 버전 생성

1. https://appstoreconnect.apple.com 로그인
2. **내 앱** → **약-속** 선택
3. **App Store** 탭 클릭
4. 왼쪽 사이드바에서 **+ 버전 또는 플랫폼** 클릭
5. **iOS** 선택
6. 버전 번호 입력: **1.0.0**

#### 5.2 메타데이터 입력

`docs/deployment/05_appstore_metadata.md` 문서를 참고하여 다음 항목들을 입력하세요:

**앱 정보**:
- [x] 이름: 약속 (Yak-Sok)
- [x] 부제목: 시니어 복약 관리 및 보호자 연결
- [x] 카테고리: 건강 및 피트니스 / 의료
- [x] 연령 등급: 4+

**설명문**:
```
복약자와 시니어를 위한 디지털 복약 관리 플랫폼

주요 기능:
• 처방전 OCR 스캔으로 약 정보 자동 입력
• 복약 시간 알림 및 기록 관리
• 월별 복약 캘린더 및 병원 방문일 자동 계산
• 보호자 연결로 복약 현황 모니터링
• 사용자 간 알림 전송 (안부 확인, 도움 요청)
• 음성 입력 지원
• 약품 정보 검색

시니어 친화적 UI:
• 큰 폰트와 넓은 터치 영역
• 직관적인 뉴모피즘 디자인
• 간편한 조작 방식

⚠️ 본 앱은 복약 관리를 돕는 보조 도구이며, 의료 행위를 대체하지 않습니다.
```

**키워드**:
```
복약,약,시니어,건강,알림,처방전,OCR,보호자,건강관리,의료
```

**URL**:
- 개인정보 처리방침 URL: `https://yaksok-care.com/privacy/`
- 이용약관 URL: `https://yaksok-care.com/terms/`
- 지원 URL: `https://yaksok-care.com`
- 마케팅 URL (선택): `https://yaksok-care.com`

**연락처 정보**:
- 이메일: `jongwoo1008@naver.com`
- 전화번호: (선택 사항)

#### 5.3 스크린샷 업로드

**필수**: 각 사이즈별로 최소 1장씩 필요 (최대 10장)

1. **6.7인치** (iPhone 15 Pro Max): 1290 x 2796
2. **6.5인치** (iPhone 11 Pro Max): 1242 x 2688
3. **5.5인치** (iPhone 8 Plus): 1242 x 2208

**촬영 방법**:
```bash
# iOS 시뮬레이터 실행
cd mobile
npx expo run:ios

# Xcode에서 원하는 디바이스 선택:
# - iPhone 15 Pro Max
# - iPhone 11 Pro Max
# - iPhone 8 Plus

# 스크린샷: Cmd + S
# 저장 위치: ~/Desktop
```

**추천 화면 순서**:
1. 로그인/회원가입 (역할 선택)
2. 홈 화면 (오늘의 복약)
3. 약 목록
4. 처방전 스캔
5. 복약 캘린더
6. 보호자 연결

#### 5.4 앱 아이콘 확인

- 파일: `mobile/assets/icon.png`
- 사이즈: 1024 x 1024
- 형식: PNG (투명 배경 불가)

```bash
# 아이콘 사이즈 확인 (macOS)
sips -g pixelWidth -g pixelHeight mobile/assets/icon.png

# 아이콘 사이즈 확인 (Windows PowerShell)
Get-Item mobile\assets\icon.png | Select-Object Name, Length
```

#### 5.5 앱 프라이버시 설정

**App Store Connect > 앱 개인정보 보호**:

수집하는 데이터:
- ✅ 개인정보 (이름, 이메일, 전화번호)
- ✅ 건강 데이터 (복약 기록)
- ✅ 식별자 (기기 ID)
- ✅ 사용 데이터

데이터 사용 목적:
- ✅ 앱 기능 제공
- ✅ 분석
- ✅ 앱 개인화

제3자와 연결된 데이터:
- ✅ OpenAI (처방전 OCR)
- ✅ Firebase (푸시 알림)

#### 5.6 심사 정보 입력

**심사 노트**:
```
테스트 계정 정보:

시니어 계정:
이메일: senior@test.com
비밀번호: <테스트 비밀번호>

보호자 계정:
이메일: guardian@test.com
비밀번호: <테스트 비밀번호>

테스트 방법:
1. 시니어 계정으로 로그인
2. 설정 > 연결 관리 > 초대 코드 생성
3. 보호자 계정으로 로그인
4. 설정 > 연결 관리 > 생성된 코드 입력하여 연결
5. 약 추가 및 복약 알림 기능 테스트
6. 캘린더에서 복약 현황 확인

참고사항:
- 본 앱은 의료 기기가 아니며 복약 관리를 돕는 보조 도구입니다
- 처방전 OCR은 OpenAI API를 사용합니다
- 푸시 알림은 Firebase를 사용합니다
```

**연락처 정보**:
- 이름: <개발자 이름>
- 전화번호: (선택 사항)
- 이메일: <개발자 이메일> (docs/SENSITIVE_INFO.md 참고)

---

### 6단계: 빌드 선택 및 제출

#### 6.1 빌드 선택

1. App Store Connect에서 **빌드** 섹션으로 스크롤
2. **빌드 선택** 클릭
3. 방금 업로드한 빌드 버전 선택 (1.0.0 (6))

#### 6.2 수출 규정 준수 정보

- **앱에서 암호화를 사용하나요?** → **예**
- **표준 암호화만 사용하나요?** → **예** (HTTPS 통신)
- **수출 규정 준수 코드가 필요한가요?** → **아니오**

#### 6.3 최종 제출

1. 모든 항목이 완료되었는지 확인 (녹색 체크 마크)
2. 오른쪽 상단 **심사를 위해 제출** 버튼 클릭
3. 확인 팝업에서 **제출** 클릭

---

## 📊 제출 후 프로세스

### 심사 단계

1. **대기 중 (Waiting for Review)**: 1-2일
2. **심사 중 (In Review)**: 1-2일
3. **승인 (Approved)**: 자동으로 App Store에 게시되거나 수동 게시 선택

### 심사 거부 시

거부 사유를 확인하고 수정 후 재제출:
1. App Store Connect에서 거부 사유 확인
2. 문제 수정
3. 새 빌드 업로드 (빌드 번호 증가 필요)
4. 다시 제출

### 일반적인 거부 사유

- ❌ 테스트 계정 미동작
- ❌ 스크린샷과 앱 기능 불일치
- ❌ 개인정보 처리방침 링크 오류
- ❌ 의료 면책 조항 미명시

**대비책**: 모두 완료되어 있음 ✅

---

## 🎯 체크리스트

### 제출 전 필수 확인사항

- [ ] 백엔드 서버에 법적 문서 배포 완료
  - [ ] https://yaksok-care.com/terms/ 접속 확인
  - [ ] https://yaksok-care.com/privacy/ 접속 확인
- [ ] Production 빌드 완료
  - [ ] Provisioning Profile 생성 완료 (yes 선택)
  - [ ] 빌드 성공 확인
- [ ] 앱스토어 메타데이터 입력 완료
  - [ ] 앱 설명 (한글)
  - [ ] 키워드
  - [ ] URL (개인정보, 이용약관, 지원)
  - [ ] 연락처 정보
- [ ] 스크린샷 업로드 완료
  - [ ] 6.7인치 최소 1장
  - [ ] 6.5인치 최소 1장
  - [ ] 5.5인치 최소 1장
- [ ] 앱 아이콘 1024x1024 확인
- [ ] 앱 프라이버시 설정 완료
- [ ] 심사 노트 작성 완료
  - [ ] 테스트 계정 정보
  - [ ] 테스트 방법
  - [ ] 참고사항
- [ ] 빌드 선택 완료
- [ ] 수출 규정 준수 정보 입력
- [ ] **최종 제출** 버튼 클릭

---

## 🚨 문제 해결

### 1. 법적 문서 페이지가 안 열릴 때

```bash
# 서버 로그 확인
ssh -i ~/.ssh/LightsailDefaultKey-ap-northeast-2.pem ubuntu@3.39.142.149
docker logs yaksok-backend --tail 50

# Django 설정 확인
# backend/core/settings.py의 TEMPLATES 설정 확인
# 'APP_DIRS': True 가 있어야 함
```

### 2. Production 빌드 실패 시

```bash
# 캐시 클리어 후 재시도
npx eas build --platform ios --profile production --clear-cache
```

### 3. Provisioning Profile 오류

- Apple Developer Portal에서 수동으로 삭제 후 재생성
- 또는 EAS에서 자동 재생성 (Generate new... → yes)

### 4. 테스트 계정 로그인 안 될 때

```bash
# 백엔드 서버에서 계정 생성
ssh -i <SSH 키 경로> ubuntu@<서버 IP>
docker exec -it yaksok-backend python manage.py shell

# Django shell에서
from django.contrib.auth import get_user_model
User = get_user_model()

# 시니어 계정
senior = User.objects.create_user(
    username='senior@test.com',
    email='senior@test.com',
    password='<테스트 비밀번호>',
    first_name='테스트시니어',
    role='senior'
)

# 보호자 계정
guardian = User.objects.create_user(
    username='guardian@test.com',
    email='guardian@test.com',
    password='<테스트 비밀번호>',
    first_name='테스트보호자',
    role='guardian'
)
```
> 실제 서버 정보와 비밀번호는 `docs/SENSITIVE_INFO.md` 참고

---

## 📞 도움이 필요할 때

- **Apple 개발자 지원**: https://developer.apple.com/contact/
- **EAS Build 문서**: https://docs.expo.dev/build/introduction/
- **App Store Connect 도움말**: https://developer.apple.com/app-store-connect/

---

## ✅ 작업 완료 후

모든 단계 완료 시:
1. 심사 결과 대기 (1-3일)
2. 승인되면 App Store에 자동 게시
3. 앱스토어에서 "약속" 검색하여 확인!

**축하합니다! 🎉**

---

**작성일**: 2026-01-25  
**최종 업데이트**: 2026-01-25  
**버전**: 1.0.0
