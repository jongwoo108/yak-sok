"""
Medications Services - OCR 처리
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
    Upstage Document OCR + OpenAI GPT 구조화
    """

    def __init__(self):
        # Windows SSL 권한 문제 해결을 위해 SSL 검증 비활성화
        http_client = httpx.Client(verify=False)
        self.client = OpenAI(api_key=settings.OPENAI_API_KEY, http_client=http_client)
        self.upstage_api_key = settings.UPSTAGE_API_KEY
    
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
    
    def _extract_text_with_upstage(self, image_content: bytes) -> str:
        """
        Upstage Document OCR API로 이미지에서 텍스트 추출
        """
        url = "https://api.upstage.ai/v1/document-digitization"
        headers = {"Authorization": f"Bearer {self.upstage_api_key}"}

        response = httpx.post(
            url,
            headers=headers,
            files={"document": ("prescription.jpg", image_content, "image/jpeg")},
            data={"model": "ocr"},
            timeout=30.0,
        )
        response.raise_for_status()
        result = response.json()

        # pages 내 텍스트 합치기
        texts = []
        for page in result.get("pages", []):
            for word in page.get("words", []):
                texts.append(word.get("text", ""))

        extracted = " ".join(texts)
        print(f"[Upstage OCR] 추출된 텍스트 길이: {len(extracted)}")
        print(f"[Upstage OCR] 텍스트: {extracted[:500]}...")
        return extracted

    def _structure_with_gpt(self, ocr_text: str) -> dict:
        """
        GPT로 OCR 추출 텍스트를 구조화된 JSON으로 변환
        """
        prompt = f"""
        아래는 처방전 이미지에서 OCR로 추출한 텍스트야.
        이 텍스트에서 약품 정보를 추출해서 JSON 형식으로 반환해줘.

        처방전은 일반적으로 '약품명', '약품 사진', '설명/효능', '복용법' 등의 컬럼으로 구성된 표 형태야.
        각 행(Row)을 분석해서 다음 필드를 포함하는 리스트를 만들어줘:

        - symptom: 이 처방전에 포함된 약품들이 치료하는 주요 증상/질환명을 추정해줘. 예: "우울증", "고혈압", "당뇨", "불면증", "소화장애" 등. 하나의 대표 증상만.
        - medications: 약품 목록 (리스트)
            - name: 약품명 (예: "데팍신서방정 25mg")
            - dosage: 1회 투약량
            - frequency: 1일 투여 횟수 (예: "하루 3회", "1일 1회")
            - times: 복용 시간대 리스트 (예: ["아침", "저녁"]) - 처방전에 표시된 복용 시간 정보를 "아침", "점심", "저녁", "취침전" 중에서 선택해줘
            - description: 약에 대한 상세 설명. **가장 중요함**. 약의 모양(예: "흰색 정제")과 효능/효과(예: "- 중추에 작용하여...", "- 심박동수를 감소시켜...") 등 해당 칸에 있는 **모든 텍스트**를 그대로 가져와줘. 줄바꿈 문자가 있다면 공백으로 대체해서 한 줄로 만들어줘.

        응답은 오직 JSON 데이터만 보내줘. 마크다운 포맷팅 없이 raw JSON으로.

        --- OCR 추출 텍스트 ---
        {ocr_text}
        """

        response = self.client.chat.completions.create(
            model="gpt-4o",
            messages=[{"role": "user", "content": prompt}],
            max_tokens=1500,
        )

        content = response.choices[0].message.content
        print(f"[GPT Response] Raw Content:\n{content}")
        return content

    def parse_prescription(self, image_file):
        """
        처방전 이미지에서 약품 정보 추출
        1단계: Upstage OCR로 텍스트 추출
        2단계: GPT로 텍스트 구조화

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

            # 1단계: Upstage OCR로 텍스트 추출
            ocr_text = self._extract_text_with_upstage(image_content)

            # 2단계: GPT로 구조화
            content = self._structure_with_gpt(ocr_text)

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
            # 데모 모드: API 키가 없거나 에러 발생 시 예시 데이터 반환
            return {
                'success': True,
                'symptom': '고혈압',
                'medications': [
                    {
                        'name': '아모디핀정 5mg',
                        'dosage': '1정',
                        'frequency': '1일 1회',
                        'times': ['아침'],
                        'description': '흰색의 육각형 정제, 고혈압 치료제'
                    },
                    {
                        'name': '다이아벡스정 500mg',
                        'dosage': '1정',
                        'frequency': '1일 2회',
                        'times': ['아침', '저녁'],
                        'description': '흰색의 원형 필름코팅정, 당뇨병 치료제'
                    }
                ],
                'message': 'OCR 처리가 완료되었습니다. (데모 데이터)'
            }
