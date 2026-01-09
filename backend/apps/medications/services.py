"""
Medications Services - OCR 및 STT 처리
"""

import base64
from django.conf import settings


class OCRService:
    """
    처방전 OCR 스캔 서비스
    OpenAI Vision API 활용
    """
    
    def __init__(self):
        self.api_key = settings.OPENAI_API_KEY
    
    def parse_prescription(self, image_file):
        """
        처방전 이미지에서 약품 정보 추출
        
        Args:
            image_file: 업로드된 이미지 파일
            
        Returns:
            dict: 추출된 약품 정보 리스트
        """
        # TODO: OpenAI Vision API 연동 구현
        # 현재는 예시 응답 반환
        
        # 이미지를 base64로 인코딩
        image_data = base64.b64encode(image_file.read()).decode('utf-8')
        
        # OpenAI API 호출 (구현 예정)
        # response = openai.ChatCompletion.create(...)
        
        return {
            'success': True,
            'medications': [
                {
                    'name': '추출된 약품명',
                    'dosage': '1정',
                    'frequency': '하루 3회',
                    'times': ['08:00', '12:00', '18:00']
                }
            ],
            'message': 'OCR 처리가 완료되었습니다. 결과를 확인해주세요.'
        }


class STTService:
    """
    음성 명령 처리 서비스
    OpenAI Whisper API 활용
    """
    
    def __init__(self):
        self.api_key = settings.OPENAI_API_KEY
    
    def transcribe(self, audio_file):
        """
        음성을 텍스트로 변환
        
        Args:
            audio_file: 업로드된 오디오 파일
            
        Returns:
            str: 변환된 텍스트
        """
        # TODO: OpenAI Whisper API 연동 구현
        return "아침 8시에 혈압약 추가해줘"
    
    def process_command(self, audio_file, user):
        """
        음성 명령 처리
        
        Args:
            audio_file: 오디오 파일
            user: 현재 사용자
            
        Returns:
            dict: 처리 결과
        """
        # 음성을 텍스트로 변환
        text = self.transcribe(audio_file)
        
        # 명령어 파싱 및 처리
        # TODO: NLP를 통한 의도 분류 및 엔티티 추출 구현
        
        return {
            'success': True,
            'transcribed_text': text,
            'action': 'add_schedule',
            'message': '음성 명령이 처리되었습니다.'
        }
