# 02. 백엔드 개발 상세

> 작성일: 2026-01-09

## 개발 완료 항목

### ✅ 프로젝트 설정 (`core/`)

| 파일 | 설명 | 주요 설정 |
|------|------|-----------|
| `settings.py` | Django 메인 설정 | PostgreSQL, Celery, JWT, CORS |
| `urls.py` | URL 라우팅 | API 엔드포인트 매핑 |
| `celery.py` | Celery 설정 | Redis 브로커, 자동 태스크 탐색 |
| `wsgi.py` / `asgi.py` | 서버 설정 | Gunicorn 연동 |

### ✅ 사용자 앱 (`apps/users/`)

#### 모델

```python
class User(AbstractUser):
    """커스텀 사용자 모델"""
    role = models.CharField(choices=['senior', 'guardian'])
    phone_number = models.CharField(max_length=15)
    emergency_contact = models.CharField(max_length=15)
    fcm_token = models.CharField(max_length=255)  # 푸시 알림용

class GuardianRelation(models.Model):
    """시니어-보호자 연결 관계"""
    senior = models.ForeignKey(User, related_name='guardians')
    guardian = models.ForeignKey(User, related_name='seniors')
    is_primary = models.BooleanField(default=False)
```

#### API 엔드포인트

| Method | Endpoint | 설명 |
|--------|----------|------|
| POST | `/api/users/` | 회원가입 |
| GET | `/api/users/me/` | 현재 사용자 정보 |
| PATCH | `/api/users/update_fcm_token/` | FCM 토큰 업데이트 |
| GET/POST | `/api/users/guardians/` | 보호자 관계 관리 |

---

### ✅ 복약 앱 (`apps/medications/`)

#### 모델

```python
class Medication(models.Model):
    """복용 약품 정보"""
    user = models.ForeignKey(User)
    name = models.CharField(max_length=100)
    dosage = models.CharField(max_length=50)
    prescription_image = models.ImageField()  # OCR 스캔용

class MedicationSchedule(models.Model):
    """복약 스케줄"""
    medication = models.ForeignKey(Medication)
    time_of_day = models.CharField(choices=['morning', 'noon', 'evening', 'night'])
    scheduled_time = models.TimeField()

class MedicationLog(models.Model):
    """복약 기록 - Safety Line 핵심 데이터"""
    schedule = models.ForeignKey(MedicationSchedule)
    scheduled_datetime = models.DateTimeField()
    taken_datetime = models.DateTimeField(null=True)
    status = models.CharField(choices=['pending', 'taken', 'missed', 'skipped'])
    celery_task_id = models.CharField()  # 알림 취소용
```

#### API 엔드포인트

| Method | Endpoint | 설명 |
|--------|----------|------|
| GET/POST | `/api/medications/` | 약품 목록/등록 |
| POST | `/api/medications/scan_prescription/` | 처방전 OCR 스캔 |
| POST | `/api/medications/voice_command/` | 음성 명령 처리 |
| GET | `/api/medications/logs/today/` | 오늘의 복약 기록 |
| POST | `/api/medications/logs/{id}/take/` | 복약 완료 처리 |

#### 서비스 클래스

```python
class OCRService:
    """처방전 OCR 스캔 (OpenAI Vision API - gpt-4o)"""
    def parse_prescription(self, image_file) -> dict:
        # 이미지를 base64로 인코딩
        # gpt-4o 모델로 테이블 형태의 처방전 분석
        # 약품명, 용량, 복용법, 효능 설명 추출
        # JSON 형식으로 반환

class STTService:
    """음성 명령 처리 (OpenAI Whisper - whisper-1)"""
    def transcribe(self, audio_file) -> str
    def process_command(self, audio_file, user) -> dict
```

> ✅ **구현 완료**: OCR 및 STT 서비스가 OpenAI API와 연동되어 실제 동작합니다.


---

### ✅ 알림 앱 (`apps/alerts/`) - Safety Line

#### 모델

```python
class Alert(models.Model):
    """비상 알림 기록"""
    user = models.ForeignKey(User)  # 시니어
    recipient = models.ForeignKey(User)  # 수신자 (보호자)
    medication_log = models.ForeignKey(MedicationLog)
    alert_type = models.CharField(choices=['reminder', 'warning', 'emergency'])
    status = models.CharField(choices=['pending', 'sent', 'cancelled', 'failed'])
    celery_task_id = models.CharField()
    scheduled_at = models.DateTimeField()
    sent_at = models.DateTimeField(null=True)

class EmergencyContact(models.Model):
    """비상 연락처"""
    user = models.ForeignKey(User)
    name = models.CharField(max_length=50)
    phone_number = models.CharField(max_length=15)
    contact_type = models.CharField(choices=['guardian', 'hospital', 'emergency'])
    priority = models.PositiveIntegerField()
```

#### Celery 태스크 (핵심!)

```python
@shared_task
def schedule_medication_alert(medication_log_id):
    """복약 알림 예약"""
    # 1. MedicationLog 조회
    # 2. 임계 시간 후 알림 예약
    # 3. Celery 태스크 ID 저장

@shared_task
def trigger_safety_alert(alert_id):
    """Safety Line 비상 알림 발송"""
    # 1. 시니어 본인 알림
    # 2. 보호자 푸시 알림
    # 3. (필요시) 비상 연락처 호출

@shared_task
def send_push_notification(user_id, title, message):
    """FCM 푸시 알림 발송"""

def revoke_alert_task(task_id):
    """예약된 알림 취소 (복약 완료 시)"""
```

---

## 의존성 (`requirements.txt`)

```
Django>=4.2,<5.0
djangorestframework>=3.14
djangorestframework-simplejwt>=5.3
django-cors-headers>=4.3
django-celery-beat>=2.5
django-celery-results>=2.5
celery>=5.3
redis>=5.0
psycopg2-binary>=2.9
Pillow>=10.0
python-dotenv>=1.0
openai>=1.0
gunicorn>=21.0
```

---

## 실행 방법

```bash
# 가상환경 활성화
cd backend

# 의존성 설치
pip install -r requirements.txt

# 환경 변수 설정
cp ../.env.example .env
# .env 파일 편집

# 마이그레이션
python manage.py migrate

# 슈퍼유저 생성
python manage.py createsuperuser

# 개발 서버 실행
python manage.py runserver

# Celery Worker (별도 터미널)
celery -A core worker --loglevel=info

# Celery Beat (별도 터미널)
celery -A core beat --loglevel=info
```

---

## 다음 단계 (TODO)

- [x] ~~OpenAI Vision API 연동 (OCR 실제 구현)~~ ✅ 완료
- [x] ~~OpenAI Whisper API 연동 (STT 실제 구현)~~ ✅ 완료
- [x] ~~약품 그룹 기능 (MedicationGroup 모델)~~ ✅ 완료
- [ ] **OCR 정확도 향상 - RAG 구현** (아래 참조)
- [ ] Firebase Admin SDK 연동 (푸시 알림 - Safety Line)
- [ ] 유닛 테스트 작성
- [ ] API 문서화 (Swagger/drf-spectacular)

---

## OCR 정확도 향상 - RAG 구현 계획

### 문제점
현재 GPT-4o 기반 OCR에서 약품명 인식 오류 발생 (예: "파록스씨알정" → "파록스씨일정")

### 해결방안: 하이브리드 RAG 접근

```
[처방전 이미지] → [GPT-4o OCR] → [RAG 검색 보정] → [정확한 약품명]
```

### 비용 분석 (✅ 추천: RAG 방식)

| 항목 | 비용 |
|------|------|
| 초기 임베딩 생성 (60K 약품) | ~$1-2 (1회) |
| 벡터 DB (무료 티어) | $0 |
| 검색 API (월 1,000회) | ~$0.02 |
| **월 총 추가 비용** | **≈ $0.02** |

### 데이터 소스
- **약학정보원 (health.kr)**: 대한민국 공인 의약품 데이터베이스
- 약 60,000+ 제품 정보
- 제품명, 성분명, 제조사, 효능, 외형정보 포함

### 구현 계획

#### 1단계: 데이터 수집
```python
# 약학정보원 크롤링 스크립트
# 저장 형식: {"name": "파록스씨알정 12.5mg", "ingredient": "파록세틴", "manufacturer": "한미약품"}
```

#### 2단계: 임베딩 생성 및 저장
```python
# 벡터 DB: Pinecone (무료 티어) 또는 Supabase pgvector
embeddings = openai.embeddings.create(
    model="text-embedding-3-small",  # 비용 효율적
    input="파록스씨알정 12.5mg 파록세틴 한미약품"
)
```

#### 3단계: OCR 서비스 수정
```python
class OCRService:
    def parse_prescription(self, image_file):
        # 1. GPT-4o로 대략적 약품명 추출
        raw_medications = self._ocr_with_gpt4o(image_file)
        
        # 2. RAG로 정확한 약품명 보정
        for med in raw_medications:
            med['name'] = self._correct_with_rag(med['name'])
        
        return raw_medications
    
    def _correct_with_rag(self, raw_name):
        # 유사도 검색으로 가장 가까운 실제 약품명 반환
        query_embedding = get_embedding(raw_name)
        result = vector_db.similarity_search(query_embedding, top_k=1)
        return result[0]['name'] if result else raw_name
```

### 벡터 DB 옵션

| 서비스 | 무료 티어 | 추천도 |
|--------|----------|--------|
| **Pinecone** | 100K 벡터, 무제한 쿼리 | ⭐⭐⭐ |
| **Supabase pgvector** | 500MB | ⭐⭐ |
| **ChromaDB (로컬)** | 무제한 | ⭐ (운영 복잡) |

