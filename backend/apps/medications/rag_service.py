"""
Medication RAG Service
약학정보원 데이터 기반 RAG를 활용한 약품명 보정 서비스
"""

import os
import json
import ssl
import httpx
import urllib3
import certifi
from typing import Optional
from pathlib import Path

# Windows anaconda/venv SSL 충돌 해결: certifi 경로 명시적 설정
os.environ['SSL_CERT_FILE'] = certifi.where()
os.environ['CURL_CA_BUNDLE'] = certifi.where()
os.environ['REQUESTS_CA_BUNDLE'] = certifi.where()
urllib3.disable_warnings(urllib3.exceptions.InsecureRequestWarning)

from openai import OpenAI
from pinecone import Pinecone


class MedicationRAGService:
    """약품명 RAG 보정 서비스"""
    
    def __init__(self):
        # Windows SSL 권한 문제 해결을 위해 SSL 검증 비활성화
        http_client = httpx.Client(verify=False)
        self.openai_client = OpenAI(api_key=os.getenv('OPENAI_API_KEY'), http_client=http_client)
        
        pinecone_api_key = os.getenv('PINECONE_API_KEY')
        if pinecone_api_key:
            self.pc = Pinecone(api_key=pinecone_api_key)
            self.index_name = os.getenv('PINECONE_INDEX_NAME', 'medications')
            try:
                self.index = self.pc.Index(self.index_name)
            except Exception as e:
                print(f"Pinecone 연결 실패: {e}")
                self.index = None
        else:
            self.pc = None
            self.index = None
    
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
            
            # 유사도 검색
            results = self.index.query(
                vector=query_embedding,
                top_k=1,
                include_metadata=True
            )
            
            if results.matches and results.matches[0].score >= threshold:
                match = results.matches[0]
                print(f"[RAG] '{raw_name}' → '{match.metadata.get('name')}' (유사도: {match.score:.3f}) ✅")
                return {
                    'original': raw_name,
                    'corrected': match.metadata.get('name', raw_name),
                    'ingredient': match.metadata.get('ingredient', ''),
                    'manufacturer': match.metadata.get('manufacturer', ''),
                    'confidence': match.score,
                    'matched': True
                }
            else:
                score = results.matches[0].score if results.matches else 0
                closest = results.matches[0].metadata.get('name', 'N/A') if results.matches else 'N/A'
                print(f"[RAG] '{raw_name}' → 매칭 실패 (가장 가까운: '{closest}', 유사도: {score:.3f}, 임계값: {threshold}) ❌")
                return {
                    'original': raw_name,
                    'corrected': raw_name,
                    'confidence': score,
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
                # 약품명 + 성분 + 용법 + 주의사항으로 임베딩 텍스트 생성 (풍부한 의미 정보)
                text_parts = [med['name']]
                if med.get('ingredient'):
                    text_parts.append(med['ingredient'])
                if med.get('manufacturer'):
                    text_parts.append(med['manufacturer'])
                if med.get('usage'):
                    text_parts.append(med['usage'][:100])  # 용법용량 일부
                
                text = ' '.join(text_parts)
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
