"""
Medication RAG Service
약학정보원 데이터 기반 RAG를 활용한 약품명 보정 서비스
"""

import os
import json
import httpx
import urllib3
import requests
from typing import Optional
from pathlib import Path

# SSL 경고 비활성화
urllib3.disable_warnings(urllib3.exceptions.InsecureRequestWarning)

from openai import OpenAI

# Pinecone REST API 설정
PINECONE_HOST = "https://medications-xbyhqv2.svc.aped-4627-b74a.pinecone.io"


class MedicationRAGService:
    """약품명 RAG 보정 서비스"""
    
    def __init__(self):
        # Windows SSL 권한 문제 해결을 위해 SSL 검증 비활성화
        http_client = httpx.Client(verify=False)
        self.openai_client = OpenAI(api_key=os.getenv('OPENAI_API_KEY'), http_client=http_client)
        
        self.pinecone_api_key = os.getenv('PINECONE_API_KEY')
        self.pinecone_host = PINECONE_HOST
        
        # Pinecone 연결 테스트 (REST API)
        if self.pinecone_api_key:
            try:
                self._test_pinecone_connection()
                self.index = True  # 연결 성공 표시
                print(f"[Pinecone] REST API 연결 성공 ✅")
            except Exception as e:
                print(f"Pinecone 연결 실패: {e}")
                self.index = None
        else:
            self.index = None
    
    def _test_pinecone_connection(self):
        """Pinecone 연결 테스트"""
        url = f"{self.pinecone_host}/describe_index_stats"
        headers = {"Api-Key": self.pinecone_api_key}
        response = requests.get(url, headers=headers, verify=False, timeout=10)
        response.raise_for_status()
    
    def _query_pinecone(self, vector: list, top_k: int = 1) -> dict:
        """Pinecone 벡터 검색 (REST API 직접 호출)"""
        url = f"{self.pinecone_host}/query"
        headers = {
            "Api-Key": self.pinecone_api_key,
            "Content-Type": "application/json"
        }
        payload = {
            "vector": vector,
            "topK": top_k,
            "includeMetadata": True
        }
        response = requests.post(url, json=payload, headers=headers, verify=False, timeout=30)
        response.raise_for_status()
        return response.json()
    
    def get_embedding(self, text: str) -> list[float]:
        """텍스트 임베딩 생성"""
        response = self.openai_client.embeddings.create(
            model="text-embedding-3-small",
            input=text
        )
        return response.data[0].embedding
    
    def correct_medication_name(self, raw_name: str, threshold: float = 0.7) -> dict:
        """
        OCR로 인식된 약품명을 RAG로 보정
        
        Args:
            raw_name: OCR로 인식된 약품명
            threshold: 유사도 임계값 (기본 0.7)
            
        Returns:
            {
                'original': 원본 약품명,
                'corrected': 보정된 약품명,
                'confidence': 유사도 점수,
                'matched': 매칭 성공 여부
            }
        """
        if not self.index:
            return {
                'original': raw_name,
                'corrected': raw_name,
                'confidence': 0,
                'matched': False,
                'error': 'Pinecone 인덱스가 설정되지 않았습니다.'
            }
        
        try:
            # 약품명 임베딩 생성
            query_embedding = self.get_embedding(raw_name)
            
            # 유사도 검색 (REST API 직접 호출)
            results = self._query_pinecone(query_embedding, top_k=1)
            
            matches = results.get('matches', [])
            best_match = matches[0] if matches else None
            
            if best_match:
                metadata = best_match.get('metadata', {})
                score = best_match.get('score', 0)
                matched_name = metadata.get('name', '')
                
                # 1. 유사도가 임계값 이상인 경우 (일반적인 RAG 매칭)
                if score >= threshold:
                    print(f"[RAG] '{raw_name}' → '{matched_name}' (유사도: {score:.3f}) ✅")
                    return {
                        'original': raw_name,
                        'corrected': matched_name,
                        'ingredient': metadata.get('ingredient', ''),
                        'manufacturer': metadata.get('manufacturer', ''),
                        'confidence': score,
                        'matched': True
                    }
                
                # 2. 유사도는 낮지만 문자열이 완전히 일치하는 경우 (임베딩Context 차이에 의한 유사도 저하 대응)
                if raw_name.replace(' ', '') == matched_name.replace(' ', ''):
                    print(f"[RAG] '{raw_name}' → '{matched_name}' (문자열 완전 일치로 강제 매칭) ✅")
                    return {
                        'original': raw_name,
                        'corrected': matched_name,
                        'ingredient': metadata.get('ingredient', ''),
                        'manufacturer': metadata.get('manufacturer', ''),
                        'confidence': 1.0,  # 완전 일치이므로 점수 1.0 부여
                        'matched': True
                    }
                
                # 3. 매칭 실패
                closest = matched_name if matched_name else 'N/A'
                print(f"[RAG] '{raw_name}' → 매칭 실패 (가장 가까운: '{closest}', 유사도: {score:.3f}, 임계값: {threshold}) ❌")
                return {
                    'original': raw_name,
                    'corrected': raw_name,
                    'confidence': score,
                    'matched': False
                }
            else:
                print(f"[RAG] '{raw_name}' → 검색 결과 없음 ❌")
                return {
                    'original': raw_name,
                    'corrected': raw_name,
                    'confidence': 0,
                    'matched': False
                }
                
        except Exception as e:
            print(f"RAG 검색 오류: {e}")
            return {
                'original': raw_name,
                'corrected': raw_name,
                'confidence': 0,
                'matched': False,
                'error': str(e)
            }
    
    def upload_medications_to_pinecone(self, data_path: Optional[str] = None) -> dict:
        """
        약품 데이터를 Pinecone에 업로드
        
        Args:
            data_path: medications.json 파일 경로 (기본: backend/data/medications.json)
            
        Returns:
            업로드 결과
        """
        if not self.index:
            return {'success': False, 'error': 'Pinecone 인덱스가 설정되지 않았습니다.'}
        
        if data_path is None:
            data_path = Path(__file__).parent.parent.parent / 'data' / 'medications.json'
        
        try:
            with open(data_path, 'r', encoding='utf-8') as f:
                medications = json.load(f)
            
            vectors = []
            for idx, med in enumerate(medications):
                # 약품명으로만 임베딩 생성 (OCR 결과와 일치시키기 위함)
                # 성분, 제조사 등은 메타데이터로만 저장하여 풍부한 정보 유지
                text = med['name']
                embedding = self.get_embedding(text)
                
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
                
                # 배치 업로드 (100개씩) + 진행 상황 출력
                if len(vectors) >= 100:
                    self.index.upsert(vectors=vectors)
                    print(f"[RAG] {idx + 1}/{len(medications)} 업로드 완료...")
                    vectors = []
            
            # 남은 벡터 업로드
            if vectors:
                self.index.upsert(vectors=vectors)
            
            print(f"[RAG] ✅ 전체 {len(medications)}개 업로드 완료!")
            return {
                'success': True,
                'uploaded_count': len(medications),
                'message': f'{len(medications)}개 약품 데이터가 업로드되었습니다.'
            }
            
        except Exception as e:
            return {
                'success': False,
                'error': str(e)
            }


# 싱글톤 인스턴스
_rag_service = None

def get_rag_service() -> MedicationRAGService:
    """RAG 서비스 싱글톤 인스턴스 반환"""
    global _rag_service
    if _rag_service is None:
        _rag_service = MedicationRAGService()
    return _rag_service
