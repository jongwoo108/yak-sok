# SQL 실습 예제 (pgAdmin / Yak-Sok DB)

> 프로젝트 DB 스키마 기준 실습용 쿼리 모음

---

## 테이블 구조 요약

| 앱 | 테이블명 | 설명 |
|----|----------|------|
| users | `users_user` | 사용자 (복약자/시니어/보호자) |
| users | `users_guardianrelation` | 시니어-보호자 연결 |
| users | `users_invitecode` | 초대 코드 |
| users | `users_emergencycontact` | 비상 연락처 (users 앱) |
| medications | `medications_medicationgroup` | 약품 그룹 (질환명) |
| medications | `medications_medication` | 복용 약품 |
| medications | `medications_medicationschedule` | 복약 스케줄 |
| medications | `medications_medicationlog` | 복약 기록 (일별) |
| alerts | `alerts_alert` | 비상 알림 기록 |
| alerts | `alerts_emergencycontact` | 비상 연락처 (alerts 앱) |

---

## 1. 기본 SELECT

### 1-1. 모든 사용자 조회 (이메일, 이름, 역할)

```sql
SELECT id, username, email, first_name, last_name, role, is_active, date_joined
FROM users_user
ORDER BY date_joined DESC;
```

### 1-2. 역할별 사용자 수

```sql
SELECT role, COUNT(*) AS cnt
FROM users_user
WHERE is_active = true
GROUP BY role
ORDER BY cnt DESC;
```

### 1-3. 복약자(patient)만 조회

```sql
SELECT id, username, first_name, email
FROM users_user
WHERE role = 'patient'
  AND is_active = true;
```

---

## 2. WHERE, AND, OR

### 2-1. 특정 이메일 사용자 조회

```sql
SELECT * FROM users_user
WHERE email = 'senior@test.com';
```

### 2-2. 활성 약만 조회

```sql
SELECT id, name, dosage, user_id, is_active
FROM medications_medication
WHERE is_active = true
ORDER BY name;
```

### 2-3. 오늘 날짜의 복약 기록

```sql
SELECT *
FROM medications_medicationlog
WHERE scheduled_datetime::date = CURRENT_DATE
ORDER BY scheduled_datetime;
```

### 2-4. 복용 완료(taken)된 로그만

```sql
SELECT *
FROM medications_medicationlog
WHERE status = 'taken'
ORDER BY taken_datetime DESC;
```

---

## 3. JOIN

### 3-1. 약 목록 + 그룹명 (LEFT JOIN)

```sql
SELECT m.id, m.name, m.dosage, g.name AS group_name
FROM medications_medication m
LEFT JOIN medications_medicationgroup g ON m.group_id = g.id
WHERE m.is_active = true
ORDER BY g.name NULLS LAST, m.name;
```

### 3-2. 복약 기록 + 약 이름 + 스케줄 시간대

```sql
SELECT
    l.id,
    l.scheduled_datetime,
    l.status,
    med.name AS medication_name,
    s.time_of_day,
    s.scheduled_time
FROM medications_medicationlog l
JOIN medications_medicationschedule s ON l.schedule_id = s.id
JOIN medications_medication med ON s.medication_id = med.id
WHERE l.scheduled_datetime::date = CURRENT_DATE
ORDER BY l.scheduled_datetime;
```

### 3-3. 시니어-보호자 연결 목록 (이름 포함)

```sql
SELECT
    gr.id,
    u_senior.username AS senior_email,
    u_senior.first_name AS senior_name,
    u_guardian.username AS guardian_email,
    u_guardian.first_name AS guardian_name,
    gr.is_primary,
    gr.created_at
FROM users_guardianrelation gr
JOIN users_user u_senior ON gr.senior_id = u_senior.id
JOIN users_user u_guardian ON gr.guardian_id = u_guardian.id
ORDER BY gr.created_at DESC;
```

### 3-4. 사용자별 등록 약 개수

```sql
SELECT u.id, u.username, u.first_name, COUNT(m.id) AS medication_count
FROM users_user u
LEFT JOIN medications_medication m ON m.user_id = u.id AND m.is_active = true
GROUP BY u.id, u.username, u.first_name
ORDER BY medication_count DESC;
```

---

## 4. 집계 (COUNT, SUM, AVG)

### 4-1. 사용자별 오늘 복약 수 (전체 / 복용 완료)

```sql
SELECT
    u.id,
    u.first_name,
    COUNT(l.id) AS total_logs,
    COUNT(l.id) FILTER (WHERE l.status = 'taken') AS taken_count
FROM users_user u
JOIN medications_medication med ON med.user_id = u.id
JOIN medications_medicationschedule s ON s.medication_id = med.id
JOIN medications_medicationlog l ON l.schedule_id = s.id
WHERE l.scheduled_datetime::date = CURRENT_DATE
GROUP BY u.id, u.first_name;
```

### 4-2. 역할별 평균 약 등록 개수

```sql
SELECT u.role, COUNT(m.id)::float / NULLIF(COUNT(DISTINCT u.id), 0) AS avg_medications
FROM users_user u
LEFT JOIN medications_medication m ON m.user_id = u.id AND m.is_active = true
WHERE u.is_active = true
GROUP BY u.role;
```

### 4-3. 날짜별 복약 완료율 (오늘 포함 최근 7일)

```sql
SELECT
    l.scheduled_datetime::date AS day,
    COUNT(*) AS total,
    COUNT(*) FILTER (WHERE l.status = 'taken') AS taken,
    ROUND(100.0 * COUNT(*) FILTER (WHERE l.status = 'taken') / NULLIF(COUNT(*), 0), 1) AS rate_pct
FROM medications_medicationlog l
WHERE l.scheduled_datetime >= CURRENT_DATE - INTERVAL '7 days'
GROUP BY l.scheduled_datetime::date
ORDER BY day DESC;
```

---

## 5. 서브쿼리

### 5-1. 약을 3개 이상 등록한 사용자

```sql
SELECT id, username, first_name
FROM users_user
WHERE id IN (
    SELECT user_id
    FROM medications_medication
    WHERE is_active = true
    GROUP BY user_id
    HAVING COUNT(*) >= 3
);
```

### 5-2. 보호자와 연결된 시니어만 조회

```sql
SELECT * FROM users_user
WHERE id IN (SELECT senior_id FROM users_guardianrelation)
  AND role IN ('senior', 'patient');
```

### 5-3. 가장 최근에 생성된 약 5개

```sql
SELECT id, name, user_id, created_at
FROM medications_medication
ORDER BY created_at DESC
LIMIT 5;
```

---

## 6. 날짜/시간

### 6-1. 이번 주 복약 기록 수

```sql
SELECT COUNT(*)
FROM medications_medicationlog
WHERE scheduled_datetime >= date_trunc('week', CURRENT_DATE)
  AND scheduled_datetime < date_trunc('week', CURRENT_DATE) + INTERVAL '7 days';
```

### 6-2. 만료되지 않은 초대 코드

```sql
SELECT id, code, user_id, expires_at, is_used
FROM users_invitecode
WHERE is_used = false
  AND expires_at > NOW()
ORDER BY expires_at;
```

### 6-3. 발송된 알림만 (최근 10건)

```sql
SELECT id, user_id, alert_type, title, status, sent_at
FROM alerts_alert
WHERE status = 'sent'
ORDER BY sent_at DESC NULLS LAST
LIMIT 10;
```

---

## 7. 정렬·페이징

### 7-1. 사용자 이름 순, 10명씩 (1페이지)

```sql
SELECT id, username, first_name, role
FROM users_user
WHERE is_active = true
ORDER BY first_name NULLS LAST, id
LIMIT 10 OFFSET 0;
```

### 7-2. 2페이지 (11~20번째)

```sql
SELECT id, username, first_name, role
FROM users_user
WHERE is_active = true
ORDER BY first_name NULLS LAST, id
LIMIT 10 OFFSET 10;
```

---

## 8. UPDATE / DELETE (실습 시 주의)

실제 데이터를 바꾸지 않으려면 `SELECT`로 조건만 확인한 뒤, 필요할 때만 실행하세요.

### 8-1. 특정 약 비활성화 (실행 전 SELECT로 id 확인)

```sql
-- 먼저 확인
-- SELECT id, name FROM medications_medication WHERE id = ???;

-- UPDATE medications_medication SET is_active = false WHERE id = ???;
```

### 8-2. 테스트 사용자 비활성화 (실행 신중)

```sql
-- UPDATE users_user SET is_active = false WHERE email LIKE '%@test.com';
```

---

## 9. 뷰(VIEW) 만들어보기

### 9-1. 오늘 복약 요약 뷰

```sql
CREATE OR REPLACE VIEW v_today_medication_summary AS
SELECT
    u.id AS user_id,
    u.first_name,
    COUNT(l.id) AS total,
    COUNT(l.id) FILTER (WHERE l.status = 'taken') AS taken,
    COUNT(l.id) FILTER (WHERE l.status = 'pending') AS pending
FROM users_user u
JOIN medications_medication m ON m.user_id = u.id AND m.is_active = true
JOIN medications_medicationschedule s ON s.medication_id = m.id
JOIN medications_medicationlog l ON l.schedule_id = s.id
WHERE l.scheduled_datetime::date = CURRENT_DATE
GROUP BY u.id, u.first_name;

-- 사용
SELECT * FROM v_today_medication_summary;
```

---

## 10. 트랜잭션 연습

```sql
BEGIN;

-- 여러 작업을 한 번에 (실제로 적용하지 않으려면 마지막에 ROLLBACK)
-- SELECT ... ;
-- UPDATE ... ;

-- 적용하려면 COMMIT;, 취소하려면 ROLLBACK;
ROLLBACK;
```

---

## pgAdmin 연결 정보 (로컬)

| 항목 | 값 (예시) |
|------|------------|
| Host | localhost (또는 서버 IP) |
| Port | 5432 |
| Database | postgres (또는 settings의 DB 이름) |
| User/Password | settings.py 또는 .env 참고 |

서버 DB를 쓰는 경우: 배포 문서의 DB 접속 정보 사용. **실제 데이터 변경(UPDATE/DELETE)은 피할 것.**

---

## 실습 순서 제안

1. 1~2: 기본 SELECT, WHERE  
2. 3: JOIN으로 약·스케줄·로그 묶어보기  
3. 4: COUNT 등 집계  
4. 5: 서브쿼리  
5. 6: 날짜 조건  
6. 9: VIEW 생성 후 조회  

이 문서는 프로젝트 DB에 맞춰 두었으므로, pgAdmin에서 그대로 붙여 넣어 실습하면 됩니다.
