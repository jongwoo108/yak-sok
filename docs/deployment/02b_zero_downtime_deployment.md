# 무중단 배포 검토 (Zero-Downtime Deployment)

> 작성일: 2026-02-03  
> 상태: 참고용 (버전 업그레이드 시 검토)

---

## 개요

현재 CI/CD는 배포 시 **기존 컨테이너 중지 → 새 컨테이너 기동** 순서라, 수 초~수십 초 동안 서비스가 끊깁니다.  
버전 업그레이드나 트래픽 증가 시 **무중단 배포**를 도입할 때 참고할 수 있는 옵션을 정리합니다.

---

## 현재 vs 무중단

| 항목 | 현재 | 무중단 배포 |
|------|------|-------------|
| 배포 방식 | 기존 중지 → 새로 기동 | 새로 기동 → 헬스 확인 → 기존 중지 |
| 다운타임 | 수 초~수십 초 | 0초 (이론상) |
| 인프라 | 서버 1대, backend 1개 | 서버 1대에서 2개 또는 로드밸런서 |

---

## 검토 옵션

### 1. Nginx + backend 2개 (롤링, 1대 서버)

**구조**

```
Nginx (80/443)
    ├── backend-1 (8000) ← 현재 트래픽
    └── backend-2 (8001) ← 배포 시 먼저 기동
```

**배포 순서**

1. backend-2 새 이미지로 기동 (8001)
2. Nginx가 backend-2 헬스 체크
3. Nginx upstream을 backend-2로 전환
4. backend-1 중지
5. 다음 배포 시 1↔2 역할 교대

**필요 작업**

- `docker-compose.prod.yml`: backend 서비스 2개 (backend_blue, backend_green) 또는 replicas
- Nginx upstream 설정: 두 백엔드로 분기, 헬스 체크
- 배포 스크립트: 새 컨테이너 기동 → 헬스 체크 → Nginx reload → 기존 컨테이너 중지

**장점**: 서버 1대에서 구현 가능  
**단점**: 메모리/CPU 사용량 증가, Nginx·배포 스크립트 관리 필요

---

### 2. Blue-Green 배포

**구조**

- Blue 환경: 현재 서비스 중인 backend
- Green 환경: 새 버전 backend (같은 서버 또는 별도 인스턴스)
- 트래픽 전환: Nginx 또는 로드밸런서에서 한 번에 Blue → Green 전환

**필요 작업**

- 동일 앱을 두 세트 실행 (컨테이너 2세트 또는 서버 2대)
- 전환 스크립트: Green 기동 → 헬스 체크 → Nginx upstream을 Green으로 변경 → Blue 중지

**장점**: 전환 시점만 끊으면 되고, 롤백은 다시 Blue로 전환하면 됨  
**단점**: 리소스 2배 (메모리 등)

---

### 3. Docker Compose scale + 헬스 체크

**개념**

- `docker-compose up -d --scale backend=2` 로 backend 2개 기동
- Nginx가 두 인스턴스에 로드밸런싱
- 배포 시: 새 이미지로 1개씩 재기동 (한 개씩만 교체)

**필요 작업**

- `docker-compose.prod.yml`에 backend `deploy.replicas: 2` 또는 scale 사용
- Nginx upstream에 backend 두 개 등록
- 배포 시 한 인스턴스만 `up -d --build` 후 순차 교체하는 스크립트

**장점**: Compose 기본 기능 활용  
**단점**: Compose만으로는 “한 개씩만 교체” 로직을 직접 구현해야 함

---

## 공통 사전 요구사항

| 항목 | 내용 |
|------|------|
| Nginx | upstream에 backend 2개 등록, `proxy_pass`로 로드밸런싱 |
| 헬스 체크 | `/api/users/` 등 경로로 200 확인 후에만 트래픽 전환 |
| 세션 | JWT 기반이면 세션 고정 불필요; 세션 저장 시 스티키 세션 또는 공유 세션 저장소 검토 |
| DB/Redis | 기존과 동일 (1개 인스턴스 공유) |

---

## 도입 시점 제안

- **지금**: 현 방식 유지 (배포 시 잠깐 끊김 허용)
- **검토 시점**:  
  - 트래픽/가용성 요구가 커질 때  
  - 서버 스펙 업그레이드(메모리 등) 시  
  - 장애 대응·롤백을 더 정교하게 하고 싶을 때

---

## 참고 자료

- [Docker Compose rolling update](https://docs.docker.com/compose/production/)
- [Nginx upstream health check](https://nginx.org/en/docs/http/ngx_http_upstream_module.html)
- [Blue-Green Deployment](https://martinfowler.com/bliki/BlueGreenDeployment.html)

---

**관련 문서**: [02_cicd_pipeline.md](./02_cicd_pipeline.md)
