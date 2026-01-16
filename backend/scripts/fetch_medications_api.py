"""
공공데이터포털 의약품 정보 수집 스크립트
식품의약품안전처_의약품개요정보(e약은요) API 활용

사용법:
    python fetch_medications_api.py

환경변수:
    DATA_GO_KR_API_KEY: 공공데이터포털 API 인증키 (Decoding)
"""

import os
import json
import time
import requests
import urllib3
from pathlib import Path
from dotenv import load_dotenv

# SSL 경고 무시 (Windows SSL 문제 해결용)
urllib3.disable_warnings(urllib3.exceptions.InsecureRequestWarning)

# .env 파일 로드
load_dotenv()

# API 설정
API_KEY = os.getenv('DATA_GO_KR_API_KEY')
BASE_URL = "https://apis.data.go.kr/1471000/DrbEasyDrugInfoService/getDrbEasyDrugList"

# 출력 경로
OUTPUT_PATH = Path(__file__).parent.parent / 'data' / 'medications.json'


def fetch_medications(page_no: int = 1, num_of_rows: int = 100) -> dict:
    """
    의약품 정보 API 호출
    
    Args:
        page_no: 페이지 번호
        num_of_rows: 페이지당 결과 수 (최대 100)
    
    Returns:
        API 응답 데이터
    """
    params = {
        'serviceKey': API_KEY,
        'pageNo': page_no,
        'numOfRows': num_of_rows,
        'type': 'json'
    }
    
    response = requests.get(BASE_URL, params=params, timeout=30, verify=False)
    response.raise_for_status()
    
    return response.json()


def parse_medication_item(item: dict) -> dict:
    """
    API 응답 아이템을 RAG용 포맷으로 변환
    
    Args:
        item: API 응답의 개별 약품 정보
    
    Returns:
        RAG 인덱싱용 약품 데이터
    """
    return {
        'name': item.get('itemName', '').strip(),
        'ingredient': item.get('efcyQesitm', '').strip()[:200] if item.get('efcyQesitm') else '',  # 효능효과
        'manufacturer': item.get('entpName', '').strip(),
        'usage': item.get('useMethodQesitm', '').strip()[:200] if item.get('useMethodQesitm') else '',  # 용법용량
        'warning': item.get('atpnQesitm', '').strip()[:200] if item.get('atpnQesitm') else '',  # 주의사항
    }


def fetch_all_medications(max_items: int = None, delay: float = 0.5) -> list:
    """
    전체 의약품 데이터 수집
    
    Args:
        max_items: 최대 수집 건수 (None이면 전체)
        delay: API 호출 간 대기 시간 (초)
    
    Returns:
        수집된 의약품 목록
    """
    medications = []
    page_no = 1
    num_of_rows = 100
    
    print(f"🔍 의약품 데이터 수집 시작...")
    print(f"   API Key: {API_KEY[:20]}..." if API_KEY else "   ⚠️ API Key가 설정되지 않았습니다!")
    
    if not API_KEY:
        print("❌ DATA_GO_KR_API_KEY 환경변수를 설정해주세요.")
        return []
    
    while True:
        try:
            print(f"   페이지 {page_no} 요청 중...")
            data = fetch_medications(page_no=page_no, num_of_rows=num_of_rows)
            
            # 응답 구조 확인
            body = data.get('body', {})
            items = body.get('items', [])
            total_count = body.get('totalCount', 0)
            
            if not items:
                print(f"   더 이상 데이터가 없습니다.")
                break
            
            for item in items:
                parsed = parse_medication_item(item)
                if parsed['name']:  # 이름이 있는 경우만 추가
                    medications.append(parsed)
            
            print(f"   ✅ {len(items)}개 수집 (총 {len(medications)}/{total_count})")
            
            # 최대 건수 도달 확인
            if max_items and len(medications) >= max_items:
                print(f"   최대 수집 건수({max_items}) 도달")
                break
            
            # 마지막 페이지 확인
            if page_no * num_of_rows >= total_count:
                print(f"   마지막 페이지 도달")
                break
            
            page_no += 1
            time.sleep(delay)  # API 호출 제한 방지
            
        except requests.exceptions.RequestException as e:
            print(f"   ❌ API 호출 오류: {e}")
            break
        except json.JSONDecodeError as e:
            print(f"   ❌ JSON 파싱 오류: {e}")
            break
    
    return medications[:max_items] if max_items else medications


def save_medications(medications: list, output_path: Path = OUTPUT_PATH):
    """
    수집된 데이터를 JSON 파일로 저장
    
    Args:
        medications: 약품 목록
        output_path: 저장 경로
    """
    output_path.parent.mkdir(parents=True, exist_ok=True)
    
    with open(output_path, 'w', encoding='utf-8') as f:
        json.dump(medications, f, ensure_ascii=False, indent=2)
    
    print(f"\n💾 {len(medications)}개 약품 데이터 저장 완료: {output_path}")


def main():
    """메인 실행 함수"""
    print("=" * 60)
    print("📦 공공데이터포털 의약품 정보 수집기")
    print("=" * 60)
    
    # 전체 데이터 수집 (테스트 시 max_items=1000 등으로 제한 가능)
    medications = fetch_all_medications(max_items=None, delay=0.3)
    
    if medications:
        # 중복 제거 (약품명 기준)
        seen = set()
        unique_medications = []
        for med in medications:
            if med['name'] not in seen:
                seen.add(med['name'])
                unique_medications.append(med)
        
        print(f"\n📊 수집 결과: {len(medications)}개 → 중복 제거 후 {len(unique_medications)}개")
        
        # 저장
        save_medications(unique_medications)
        
        print("\n🚀 다음 단계:")
        print("   cd backend")
        print("   python manage.py upload_medications")
    else:
        print("\n❌ 수집된 데이터가 없습니다.")


if __name__ == '__main__':
    main()
