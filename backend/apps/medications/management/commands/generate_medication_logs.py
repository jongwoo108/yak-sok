"""
기존 약의 복약 로그를 생성하는 관리 명령어
사용법: python manage.py generate_medication_logs
"""

from datetime import datetime, timedelta
from django.core.management.base import BaseCommand
from django.utils import timezone
from apps.medications.models import Medication, MedicationSchedule, MedicationLog


class Command(BaseCommand):
    help = '기존 약의 복약 로그를 start_date부터 end_date까지 생성합니다'

    def handle(self, *args, **options):
        medications = Medication.objects.filter(
            is_active=True,
            start_date__isnull=False,
            days_supply__isnull=False
        )
        
        total_created = 0
        
        for med in medications:
            start_date = med.start_date
            end_date = med.end_date
            
            if not end_date:
                continue
            
            self.stdout.write(f'처리 중: {med.name} ({start_date} ~ {end_date})')
            
            for schedule in med.schedules.filter(is_active=True):
                current_date = start_date
                logs_created = 0
                
                while current_date < end_date:
                    scheduled_datetime = timezone.make_aware(
                        datetime.combine(current_date, schedule.scheduled_time)
                    )
                    
                    # 이미 존재하는 로그는 건너뛰기
                    exists = MedicationLog.objects.filter(
                        schedule=schedule,
                        scheduled_datetime__date=current_date
                    ).exists()
                    
                    if not exists:
                        MedicationLog.objects.create(
                            schedule=schedule,
                            scheduled_datetime=scheduled_datetime,
                            status=MedicationLog.Status.PENDING
                        )
                        logs_created += 1
                        total_created += 1
                    
                    current_date += timedelta(days=1)
                
                if logs_created > 0:
                    self.stdout.write(f'  - {schedule.get_time_of_day_display()}: {logs_created}개 로그 생성')
        
        self.stdout.write(self.style.SUCCESS(f'완료! 총 {total_created}개의 복약 로그가 생성되었습니다.'))
