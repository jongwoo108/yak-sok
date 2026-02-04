# 건강 뉴스피드 기능 계획

> 작성일: 2026-02-03  
> 상태: 계획 단계

---

## 개요

사용자가 복용 중인 약을 기반으로 질병을 추론하고, 해당 질병과 관련된 건강 정보, 뉴스, 생활 팁 등을 제공하는 **개인화된 건강 뉴스피드** 기능

---

## 목표

1. 사용자의 약 정보를 통해 질병/증상을 자동 추론
2. 추론된 질병에 맞춤화된 건강 정보 제공
3. 건강 관리에 도움이 되는 생활 습관, 식이요법, 운동 정보 제공
4. 최신 의료/건강 뉴스 큐레이션

---

## 주요 기능

### 1단계: 질병 추론 및 저장

#### 1.1 약 → 질병 매핑
- OCR로 등록된 약 정보에서 적응증(indication) 추출
- LLM을 활용한 질병/증상 추론
- 사용자별 질병 프로필 저장

#### 1.2 데이터 모델

```python
class UserHealthProfile(models.Model):
    """사용자 건강 프로필"""
    user = models.OneToOneField(User, on_delete=models.CASCADE)
    conditions = models.JSONField(default=list)  # 추론된 질병/증상 목록
    # 예: ["고혈압", "당뇨", "고지혈증"]
    updated_at = models.DateTimeField(auto_now=True)

class HealthCondition(models.Model):
    """질병/증상 마스터 데이터"""
    name = models.CharField(max_length=100)  # 질병명
    category = models.CharField(max_length=50)  # 카테고리 (심혈관, 내분비, 정신건강 등)
    description = models.TextField()  # 설명
    keywords = models.JSONField(default=list)  # 검색 키워드
```

### 2단계: 콘텐츠 수집 및 큐레이션

#### 2.1 콘텐츠 유형

| 유형 | 설명 | 예시 |
|------|------|------|
| 건강 팁 | 일상 생활 관리 팁 | "고혈압 환자를 위한 저염 식단" |
| 식이요법 | 질병별 권장 음식/피해야 할 음식 | "당뇨 환자에게 좋은 식품 10가지" |
| 운동 가이드 | 질병별 권장 운동 | "관절염 환자를 위한 수중 운동" |
| 의료 뉴스 | 최신 치료법, 연구 결과 | "고혈압 신약 임상시험 결과" |
| 계절 건강 | 계절별 건강 관리 | "여름철 당뇨 환자 수분 섭취" |

#### 2.2 콘텐츠 소스

- **공공 API**: 국민건강보험공단, 질병관리청
- **의료 정보**: 대한의학회, 전문 학회 자료
- **뉴스 API**: 건강/의료 뉴스 큐레이션
- **자체 제작**: LLM 기반 건강 콘텐츠 생성

#### 2.3 데이터 모델

```python
class HealthContent(models.Model):
    """건강 콘텐츠"""
    
    class ContentType(models.TextChoices):
        TIP = 'tip', '건강 팁'
        DIET = 'diet', '식이요법'
        EXERCISE = 'exercise', '운동 가이드'
        NEWS = 'news', '의료 뉴스'
        SEASONAL = 'seasonal', '계절 건강'
    
    title = models.CharField(max_length=200)
    content = models.TextField()
    content_type = models.CharField(max_length=20, choices=ContentType.choices)
    conditions = models.ManyToManyField(HealthCondition)  # 관련 질병
    thumbnail_url = models.URLField(blank=True)
    source = models.CharField(max_length=100)  # 출처
    published_at = models.DateTimeField()
    is_active = models.BooleanField(default=True)
    view_count = models.PositiveIntegerField(default=0)
    created_at = models.DateTimeField(auto_now_add=True)
```

### 3단계: 뉴스피드 UI

#### 3.1 새 탭 추가: "건강정보" 탭

```
하단 탭바:
[홈] [약 목록] [캘린더] [건강정보*] [설정]
                        ↑ NEW
```

#### 3.2 화면 구성

```
┌─────────────────────────────────┐
│  나의 건강 정보                  │
│  ─────────────────────────────  │
│  📋 나의 건강 프로필              │
│  ├─ 고혈압                       │
│  ├─ 당뇨                         │
│  └─ 고지혈증                     │
│                                 │
│  ─────────────────────────────  │
│  🔥 오늘의 추천                   │
│  ┌─────────────────────────┐   │
│  │ [이미지]                 │   │
│  │ 고혈압 환자를 위한        │   │
│  │ 저염 식단 가이드          │   │
│  └─────────────────────────┘   │
│                                 │
│  📰 맞춤 건강 뉴스               │
│  ├─ 당뇨 환자 운동법...          │
│  ├─ 고혈압 신약 소식...          │
│  └─ 여름철 혈압 관리...          │
│                                 │
│  💡 생활 팁                      │
│  ├─ 약 복용 시 피해야 할 음식     │
│  └─ 복약 후 운동 시간            │
└─────────────────────────────────┘
```

#### 3.3 상세 화면

- 콘텐츠 전문 보기
- 관련 콘텐츠 추천
- 북마크 기능
- 공유 기능

---

## 기술 스택

### 백엔드

| 기술 | 용도 |
|------|------|
| Django REST Framework | API 서버 |
| OpenAI GPT-4 | 질병 추론, 콘텐츠 생성 |
| Celery | 콘텐츠 수집 스케줄링 |
| Redis | 추천 캐싱 |

### 프론트엔드

| 기술 | 용도 |
|------|------|
| React Native | 모바일 앱 |
| FlatList | 뉴스피드 무한 스크롤 |
| AsyncStorage | 북마크 로컬 저장 |

### 외부 API

| API | 용도 |
|-----|------|
| 질병관리청 API | 질병 정보 |
| 네이버 뉴스 API | 건강 뉴스 |
| OpenAI API | 콘텐츠 생성/요약 |

---

## 개발 단계

### Phase 1: 질병 추론 (2주)

- [ ] 약품 데이터베이스에 적응증 필드 추가
- [ ] LLM 기반 질병 추론 로직 구현
- [ ] UserHealthProfile 모델 및 API 구현
- [ ] 약 등록 시 자동 질병 추론

### Phase 2: 콘텐츠 시스템 (3주)

- [ ] HealthCondition, HealthContent 모델 구현
- [ ] 콘텐츠 수집 크롤러/API 연동
- [ ] LLM 기반 콘텐츠 생성 파이프라인
- [ ] 콘텐츠 관리 Admin 페이지

### Phase 3: 뉴스피드 UI (2주)

- [ ] 건강정보 탭 UI 구현
- [ ] 뉴스피드 무한 스크롤
- [ ] 콘텐츠 상세 화면
- [ ] 북마크 기능

### Phase 4: 개인화 (2주)

- [ ] 사용자별 맞춤 추천 알고리즘
- [ ] 조회 기록 기반 추천
- [ ] 푸시 알림 (새 콘텐츠)

---

## API 설계

### 건강 프로필

```
GET  /api/health/profile/           # 내 건강 프로필 조회
POST /api/health/profile/refresh/   # 질병 재분석 요청
```

### 콘텐츠

```
GET  /api/health/feed/              # 맞춤 뉴스피드
GET  /api/health/content/<id>/      # 콘텐츠 상세
GET  /api/health/content/popular/   # 인기 콘텐츠
GET  /api/health/content/recent/    # 최신 콘텐츠
```

### 북마크

```
GET    /api/health/bookmarks/       # 북마크 목록
POST   /api/health/bookmarks/       # 북마크 추가
DELETE /api/health/bookmarks/<id>/  # 북마크 삭제
```

---

## 고려사항

### 의료 정보 주의사항

1. **면책 조항 필수**: "이 정보는 의료 조언을 대체하지 않습니다"
2. **출처 명시**: 모든 콘텐츠에 출처 표시
3. **전문가 검토**: 중요 콘텐츠는 의료 전문가 검토 권장
4. **사용자 피드백**: 부정확한 정보 신고 기능

### 개인정보 보호

1. 건강 정보는 민감 정보로 분류
2. 암호화 저장
3. 제3자 공유 금지
4. 사용자 동의 필수

### 콘텐츠 품질

1. 정기적인 콘텐츠 업데이트
2. 오래된 정보 자동 비활성화
3. 사용자 평가 시스템
4. A/B 테스트로 참여도 최적화

---

## 예상 일정

| 단계 | 기간 | 마일스톤 |
|------|------|----------|
| Phase 1 | 2주 | 질병 추론 시스템 |
| Phase 2 | 3주 | 콘텐츠 관리 시스템 |
| Phase 3 | 2주 | 뉴스피드 UI |
| Phase 4 | 2주 | 개인화 추천 |
| 테스트 | 1주 | QA 및 버그 수정 |
| **총합** | **10주** | |

---

## 성공 지표

| 지표 | 목표 |
|------|------|
| 일일 활성 사용자 (DAU) | 기존 대비 20% 증가 |
| 평균 세션 시간 | 5분 이상 |
| 콘텐츠 조회율 | 사용자당 3개/일 |
| 북마크율 | 조회 대비 10% |
| 재방문율 | 70% 이상 |

---

## 참고 자료

- [질병관리청 건강정보 API](https://www.kdca.go.kr)
- [의약품안전나라 API](https://nedrug.mfds.go.kr)
- [OpenAI API 문서](https://platform.openai.com/docs)

---

## 관련 문서

- [프로젝트 구조](./01_project_structure.md)
- [백엔드 개발](./02_backend_development.md)
- [API 명세](./04_api_specification.md)

---

**작성자**: AI Assistant  
**검토 필요**: 기획팀, 의료 자문
