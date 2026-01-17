"""
Pinecone 직접 업로드 스크립트 (SSL 문제 우회용)
requests 라이브러리로 Pinecone REST API 직접 호출
"""

import os
import json
import time
import requests
import urllib3
from pathlib import Path
from dotenv import load_dotenv
from openai import OpenAI
import httpx

# SSL 경고 무시
urllib3.disable_warnings(urllib3.exceptions.InsecureRequestWarning)

# .env 파일 로드
load_dotenv()

# 설정
OPENAI_API_KEY = os.getenv('OPENAI_API_KEY')
PINECONE_API_KEY = os.getenv('PINECONE_API_KEY')
PINECONE_INDEX_NAME = os.getenv('PINECONE_INDEX_NAME', 'medications')
DATA_PATH = Path(__file__).parent.parent / 'data' / 'medications.json'

# Pinecone 호스트 (인덱스별로 다름)
PINECONE_HOST = "https://medications-xbyhqv2.svc.aped-4627-b74a.pinecone.io"


def get_embedding(client, text: str) -> list[float]:
    """OpenAI 임베딩 생성"""
    response = client.embeddings.create(
        model="text-embedding-3-small",
        input=text
    )
    return response.data[0].embedding


def upsert_to_pinecone(vectors: list) -> dict:
    """Pinecone에 벡터 업로드 (REST API 직접 호출)"""
    url = f"{PINECONE_HOST}/vectors/upsert"
    headers = {
        "Api-Key": PINECONE_API_KEY,
        "Content-Type": "application/json"
    }
    
    payload = {"vectors": vectors}
    
    response = requests.post(url, json=payload, headers=headers, verify=False, timeout=60)
    response.raise_for_status()
    return response.json()


def main():
    print("=" * 60)
    print("📦 Pinecone 직접 업로드 스크립트 (SSL 우회)")
    print("=" * 60)
    
    if not PINECONE_API_KEY:
        print("❌ PINECONE_API_KEY가 설정되지 않았습니다.")
        return
    
    if not OPENAI_API_KEY:
        print("❌ OPENAI_API_KEY가 설정되지 않았습니다.")
        return
    
    # OpenAI 클라이언트 (SSL 우회)
    http_client = httpx.Client(verify=False)
    openai_client = OpenAI(api_key=OPENAI_API_KEY, http_client=http_client)
    
    # 데이터 로드
    print(f"📂 데이터 로드: {DATA_PATH}")
    with open(DATA_PATH, 'r', encoding='utf-8') as f:
        medications = json.load(f)
    
    print(f"   총 {len(medications)}개 약품 데이터")
    
    vectors = []
    batch_size = 50  # 배치 크기
    uploaded = 0
    
    for idx, med in enumerate(medications):
        # 임베딩 텍스트 생성 (약품명만 사용하여 OCR 매칭 정확도 향상)
        text = med['name']
        
        try:
            embedding = get_embedding(openai_client, text)
        except Exception as e:
            print(f"   ⚠️ 임베딩 실패 ({med['name']}): {e}")
            continue
        
        vectors.append({
            'id': f"med_{idx}",
            'values': embedding,
            'metadata': {
                'name': med['name'],
                'ingredient': med.get('ingredient', ''),
                'manufacturer': med.get('manufacturer', ''),
                'usage': med.get('usage', '')[:200],
                'warning': med.get('warning', '')[:200]
            }
        })
        
        # 배치 업로드
        if len(vectors) >= batch_size:
            try:
                upsert_to_pinecone(vectors)
                uploaded += len(vectors)
                print(f"   ✅ {uploaded}/{len(medications)} 업로드 완료...")
                vectors = []
                time.sleep(0.1)  # API 제한 방지
            except Exception as e:
                print(f"   ❌ Pinecone 업로드 실패: {e}")
                return
    
    # 남은 벡터 업로드
    if vectors:
        try:
            upsert_to_pinecone(vectors)
            uploaded += len(vectors)
        except Exception as e:
            print(f"   ❌ Pinecone 업로드 실패: {e}")
            return
    
    print(f"\n🎉 완료! 총 {uploaded}개 약품 데이터가 Pinecone에 업로드되었습니다.")


if __name__ == '__main__':
    main()
