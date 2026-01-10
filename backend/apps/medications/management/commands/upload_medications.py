"""
약품 데이터를 Pinecone에 업로드하는 관리 명령어
"""

from django.core.management.base import BaseCommand
from apps.medications.rag_service import get_rag_service


class Command(BaseCommand):
    help = '약품 데이터를 Pinecone 벡터 DB에 업로드합니다'
    
    def add_arguments(self, parser):
        parser.add_argument(
            '--data-path',
            type=str,
            help='medications.json 파일 경로 (기본: backend/data/medications.json)'
        )
    
    def handle(self, *args, **options):
        self.stdout.write('약품 데이터 업로드를 시작합니다...')
        
        rag_service = get_rag_service()
        
        if not rag_service.index:
            self.stdout.write(
                self.style.ERROR('Pinecone 인덱스가 설정되지 않았습니다. .env 파일을 확인하세요.')
            )
            return
        
        data_path = options.get('data_path')
        result = rag_service.upload_medications_to_pinecone(data_path)
        
        if result['success']:
            self.stdout.write(
                self.style.SUCCESS(f"성공: {result['message']}")
            )
        else:
            self.stdout.write(
                self.style.ERROR(f"실패: {result['error']}")
            )
