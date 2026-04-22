"""
Medications Services - OCR 처리
GPT-4o Vision을 사용하여 처방전 이미지에서 직접 약품 정보 추출
"""

import json
import base64
import io
import httpx
from openai import OpenAI
from django.conf import settings
from PIL import Image, ExifTags


class OCRService:
    """
    처방전 OCR 스캔 서비스
    GPT-4o Vision으로 이미지에서 직접 약품 정보 추출
    """

    def __init__(self):
        # Windows SSL 권한 문제 해결을 위해 SSL 검증 비활성화
        http_client = httpx.Client(verify=False)
        self.client = OpenAI(api_key=settings.OPENAI_API_KEY, http_client=http_client)
    
    def _auto_rotate_image(self, image_content: bytes) -> bytes:
        """
        EXIF 데이터를 기반으로 이미지 자동 회전
        모바일에서 세로로 촬영한 사진을 올바른 방향으로 회전
        iOS HEIC 포맷도 처리 가능하도록 개선
        """
        from PIL import ImageOps
        
        try:
            # 이미지 열기 시도
            image = Image.open(io.BytesIO(image_content))
            
            # EXIF 기반 자동 회전 (가장 신뢰할 수 있는 방법)
            image = ImageOps.exif_transpose(image)
            
            # RGB 모드로 변환 (PNG, RGBA 등 대응)
            if image.mode in ('RGBA', 'P'):
                image = image.convert('RGB')
            elif image.mode != 'RGB':
                image = image.convert('RGB')
            
            # 회전된 이미지를 JPEG bytes로 변환
            output = io.BytesIO()
            image.save(output, format='JPEG', quality=90)
            print(f"[이미지 회전] 원본 → 회전 완료 (크기: {image.size})")
            return output.getvalue()
            
        except Exception as e:
            print(f"이미지 회전 처리 건너뜀: {e}")
            # 원본이 이미 JPEG인 경우 그대로 반환
            if image_content[:2] == b'\xff\xd8':  # JPEG magic bytes
                print("[이미지] 원본 JPEG 그대로 사용")
                return image_content
            # PNG인 경우
            if image_content[:4] == b'\x89PNG':
                print("[이미지] 원본 PNG 그대로 사용")
                return image_content
            # 그 외의 경우에도 원본 반환 (GPT가 처리 시도)
            return image_content

    def _extract_with_gpt4o_vision(self, image_content: bytes) -> str:
        """
        GPT-4o Vision으로 처방전 이미지에서 직접 약품 정보 추출
        이미지를 base64로 인코딩하여 전송
        """
        image_base64 = base64.b64encode(image_content).decode('utf-8')
        
        response = self.client.chat.completions.create(
            model="gpt-4o",
            messages=[
                {
                    "role": "system",
                    "content": "처방전 이미지를 분석하여 약품 정보를 JSON으로 구조화하는 전문가입니다. 정확하고 일관된 형식으로 응답합니다."
                },
                {
                    "role": "user",
                    "content": [
                        {
                            "type": "text",
                            "text": """이 처방전 이미지에서 약품 정보를 추출하여 JSON 형식으로 반환하세요.

규칙:
1. symptom: 처방 약품들의 대표 증상/질환명 1개 (예: "고혈압", "당뇨", "우울증")
2. medications: 약품 목록 배열
   - name: 약품명 + 용량 (예: "데팍신서방정 25mg")
   - dosage: 1회 투약량 (예: "1정", "2캡슐")
   - frequency: 1일 투여 횟수 (예: "1일 1회", "1일 3회")
   - times: 복용 시간대 배열, 다음 중에서만 선택: ["아침", "점심", "저녁", "취침전"]
   - description: 약의 효능/효과를 한 줄로 작성

처방전의 모든 약품을 빠짐없이 추출하세요."""
                        },
                        {
                            "type": "image_url",
                            "image_url": {
                                "url": f"data:image/jpeg;base64,{image_base64}",
                                "detail": "high"
                            }
                        }
                    ]
                }
            ],
            temperature=0,
            max_tokens=2000,
            response_format={"type": "json_object"},
        )

        content = response.choices[0].message.content
        print(f"[GPT-4o Vision] Raw Response:\n{content}")
        return content

    def parse_prescription(self, image_file):
        """
        처방전 이미지에서 약품 정보 추출
        GPT-4o Vision으로 이미지에서 직접 추출 (1단계)

        Args:
            image_file: 업로드된 이미지 파일

        Returns:
            dict: 추출된 약품 정보 리스트
        """
        try:
            # 이미지 읽기 및 자동 회전
            image_content = image_file.read()
            print(f"[OCR Debug] 원본 바이트 크기: {len(image_content)}")
            image_content = self._auto_rotate_image(image_content)
            print(f"[OCR Debug] 처리 후 바이트 크기: {len(image_content)}")

            # GPT-4o Vision으로 직접 추출
            content = self._extract_with_gpt4o_vision(image_content)

            # JSON 파싱 (마크다운 코드블록 제거)
            content = content.replace('```json', '').replace('```', '').strip()

            try:
                start_idx = content.find('{')
                end_idx = content.rfind('}')
                if start_idx != -1 and end_idx != -1:
                    content = content[start_idx:end_idx+1]
            except:
                pass

            result = json.loads(content)
            
            # RAG를 통한 약품명 보정
            medications = result.get('medications', [])
            try:
                from .rag_service import get_rag_service
                rag_service = get_rag_service()
                
                for med in medications:
                    if med.get('name'):
                        correction = rag_service.correct_medication_name(med['name'])
                        if correction.get('matched'):
                            med['name'] = correction['corrected']
                            med['rag_confidence'] = correction['confidence']
                            # 성분/제조사 정보도 추가
                            if correction.get('ingredient'):
                                med['ingredient'] = correction['ingredient']
                            if correction.get('manufacturer'):
                                med['manufacturer'] = correction['manufacturer']
            except Exception as rag_error:
                print(f"RAG 보정 건너뜀: {rag_error}")
                # RAG 오류 시에도 OCR 결과는 반환
            
            return {
                'success': True,
                'symptom': result.get('symptom', ''),
                'medications': medications,
                'message': 'OCR 처리가 완료되었습니다.'
            }
            
        except Exception as e:
            print(f"OCR Error: {str(e)}")
            import traceback
            traceback.print_exc()
            return {
                'success': False,
                'error': str(e),
                'message': f'OCR 처리에 실패했습니다: {str(e)}'
            }
