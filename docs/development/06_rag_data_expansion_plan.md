# RAG 데이터 확장 계획 (Medication Data Expansion)

> 최종 업데이트: 2026-01-12

## 목표
OCR 인식률 향상을 위해 현재 100개 수준인 `medications.json` 데이터를 수만 개 수준의 실제 의약품 데이터로 확장.
**정확성**을 위해 GPT 생성보다는 공공데이터 사용을 원칙으로 함.

---

## 현재 상태

| 항목 | 상태 |
|------|------|
| API 키 발급 | ✅ 완료 (식품의약품안전처_의약품개요정보) |
| 데이터 수집 스크립트 | ✅ 완료 (`scripts/fetch_medications_api.py`) |
| RAG 서비스 개선 | ✅ 완료 (임베딩 텍스트 확장) |
| 데이터 수집 실행 | ⬜ 미완료 |
| Pinecone 업로드 | ⬜ 미완료 |

---

## 추후 진행 작업

### 1단계: 환경변수 설정
`backend/.env` 파일에 API 키 추가:
```
DATA_GO_KR_API_KEY=7lOczRlpdOmXWEVBrallbmUsNKVkIWfOCcjIgIgafASm6Eos5NGvO6BUAQxVTZnHopJcZlM2yDfcK2MqENU1w==
```

### 2단계: 데이터 수집 실행
```bash
cd backend
python scripts/fetch_medications_api.py
```
> ⏱️ 약 60,000개 데이터 수집 예상 (몇 분 소요)

### 3단계: Pinecone 업로드
```bash
python manage.py upload_medications
```

### 4단계: RAG 성능 검증
- 처방전 스캔 테스트
- 유사도 임계값 튜닝 (현재 0.7 → 필요시 0.75~0.8)

---

## API 정보

| 항목 | 값 |
|------|-----|
| **API명** | 식품의약품안전처_의약품개요정보(e약은요) |
| **End Point** | `https://apis.data.go.kr/1471000/DrbEasyDrugInfoService` |
| **활용기간** | 2026-01-12 ~ 2028-01-12 |
| **문서** | [공공데이터포털](https://www.data.go.kr/data/15056763/openapi.do) |

---

## 관련 파일

| 파일 | 설명 |
|------|------|
| `backend/scripts/fetch_medications_api.py` | 공공데이터 수집 스크립트 |
| `backend/data/medications.json` | 수집된 약품 데이터 |
| `backend/apps/medications/rag_service.py` | RAG 서비스 (Pinecone 연동) |
| `backend/apps/medications/management/commands/upload_medications.py` | Pinecone 업로드 명령어 |

---

## 대안: 약학정보원 크롤링
* API 키 발급이 어렵거나 데이터가 불충분할 경우 고려
* 주의: `robots.txt` 준수 및 서버 부하 관리 필요
