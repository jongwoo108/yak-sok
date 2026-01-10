"""
Medication RAG Service
약학정보원 데이터 기반 RAG를 활용한 약품명 보정 서비스
"""

import os
import json
from typing import Optional
from pathlib import Path

from openai import OpenAI
from pinecone import Pinecone


class MedicationRAGService:
    """약품명 RAG 보정 서비스"""
    
    def __init__(self):
        self.openai_client = OpenAI(api_key=os.getenv('OPENAI_API_KEY'))
        
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
    
    def correct_medication_name(self, raw_name: str, threshold: float = 0.75) -> dict:
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
                # 약품명 + 성분으로 임베딩 텍스트 생성
                text = f"{med['name']} {med.get('ingredient', '')}"
                embedding = self.get_embedding(text)
                
                vectors.append({
                    'id': f"med_{idx}",
                    'values': embedding,
                    'metadata': {
                        'name': med['name'],
                        'ingredient': med.get('ingredient', ''),
                        'manufacturer': med.get('manufacturer', '')
                    }
                })
                
                # 배치 업로드 (100개씩)
                if len(vectors) >= 100:
                    self.index.upsert(vectors=vectors)
                    vectors = []
            
            # 남은 벡터 업로드
            if vectors:
                self.index.upsert(vectors=vectors)
            
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
