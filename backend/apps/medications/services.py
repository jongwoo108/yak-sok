"""
Medications Services - OCR 및 STT 처리
"""

import json
import base64
from openai import OpenAI
from django.conf import settings


class OCRService:
    """
    처방전 OCR 스캔 서비스
    OpenAI Vision API 활용
    """
    
    def __init__(self):
        self.client = OpenAI(api_key=settings.OPENAI_API_KEY)
    
    def parse_prescription(self, image_file):
        """
        처방전 이미지에서 약품 정보 추출
        
        Args:
            image_file: 업로드된 이미지 파일
            
        Returns:
            dict: 추출된 약품 정보 리스트
        """
        try:
            # 이미지를 base64로 인코딩
            image_content = image_file.read()
            image_base64 = base64.b64encode(image_content).decode('utf-8')
            
            prompt = """
            이 처방전 이미지에서 약품 정보를 추출해서 JSON 형식으로 반환해줘.
            이미지는 일반적으로 '약품명', '약품 사진', '설명/효능', '복용법' 등의 컬럼으로 구성된 표 형태일 거야.
            각 행(Row)을 분석해서 다음 필드를 포함하는 리스트를 만들어줘:

            - symptom: 이 처방전에 포함된 약품들이 치료하는 주요 증상/질환명을 추정해줘. 예: "우울증", "고혈압", "당뇨", "불면증", "소화장애" 등. 하나의 대표 증상만.
            - medications: 약품 목록 (리스트)
                - name: 약품명 (예: "데팍신서방정 25mg")
                - dosage: 1회 투약량
                - frequency: 1일 투여 횟수 (예: "하루 3회", "1일 1회")
                - times: 복용 시간대 리스트 (예: ["아침", "저녁"]) - 처방전에 표시된 복용 시간 정보를 "아침", "점심", "저녁", "취침전" 중에서 선택해줘
                - description: 약에 대한 상세 설명. **가장 중요함**. 약의 모양(예: "흰색 정제")과 효능/효과(예: "- 중추에 작용하여...", "- 심박동수를 감소시켜...") 등 해당 칸에 있는 **모든 텍스트**를 그대로 가져와줘. 줄바꿈 문자가 있다면 공백으로 대체해서 한 줄로 만들어줘.

            응답은 오직 JSON 데이터만 보내줘. 마크다운 포맷팅 없이 raw JSON으로.
            """

            response = self.client.chat.completions.create(
                model="gpt-4o",
                messages=[
                    {
                        "role": "user",
                        "content": [
                            {"type": "text", "text": prompt},
                            {
                                "type": "image_url",
                                "image_url": {
                                    "url": f"data:image/jpeg;base64,{image_base64}",
                                },
                            },
                        ],
                    }
                ],
                max_tokens=1500,
            )
            
            content = response.choices[0].message.content
            # JSON 파싱 (혹시 모를 마크다운 코드블록 제거)
            content = content.replace('```json', '').replace('```', '').strip()
            result = json.loads(content)
            
            return {
                'success': True,
                'symptom': result.get('symptom', ''),
                'medications': result.get('medications', []),
                'message': 'OCR 처리가 완료되었습니다.'
            }
            
        except Exception as e:
            print(f"OCR Error: {str(e)}")
            # 에러 발생 시 예시 데이터 반환 (데모 안정성을 위해)
            # 실제 운영 시에는 에러를 반환해야 함
            return {
                'success': False,
                'message': f'OCR 처리 중 오류가 발생했습니다: {str(e)}'
            }


class STTService:
    """
    음성 명령 처리 서비스
    OpenAI Whisper API 활용
    """
    
    def __init__(self):
        self.client = OpenAI(api_key=settings.OPENAI_API_KEY)
    
    def transcribe(self, audio_file):
        """
        음성을 텍스트로 변환
        """
        try:
            # Whisper API는 파일 객체를 직접 받음
            # 파일 포인터를 처음으로 되돌림 (혹시 모를 상황 대비)
            if hasattr(audio_file, 'seek'):
                audio_file.seek(0)
                
            response = self.client.audio.transcriptions.create(
                model="whisper-1",
                file=audio_file
            )
            return response.text
        except Exception as e:
            print(f"STT Error: {str(e)}")
            return ""
    
    def process_command(self, audio_file, user):
        """
        음성 명령 처리
        """
        # 음성을 텍스트로 변환
        text = self.transcribe(audio_file)
        
        if not text:
            return {
                'success': False,
                'message': '음성을 인식하지 못했습니다.'
            }
        
        # 간단한 키워드 기반 의도 분류 (임시 구현)
        # 실제로는 여기서도 GPT를 사용하여 의도를 파악하고 구조화된 데이터를 뽑아내면 좋습니다.
        action = 'unknown'
        if '먹었어' in text or '복용' in text:
            action = 'take_medication'
        elif '추가' in text or '등록' in text:
            action = 'add_schedule'
        
        return {
            'success': True,
            'transcribed_text': text,
            'action': action,
            'message': f'음성 인식 결과: "{text}"'
        }
