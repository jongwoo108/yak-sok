"""
Data migration: Merge 'senior' role into 'patient' role
기존 senior 사용자를 patient로 통합
"""

from django.db import migrations


def merge_senior_to_patient(apps, schema_editor):
    """senior 역할 사용자를 patient로 변경"""
    User = apps.get_model('users', 'User')
    updated = User.objects.filter(role='senior').update(role='patient')
    if updated:
        print(f"\n  → {updated}명의 senior 사용자를 patient로 변경했습니다.")


def reverse_merge(apps, schema_editor):
    """역방향 마이그레이션: 복원 불가 (데이터 손실 없이 진행)"""
    pass


class Migration(migrations.Migration):

    dependencies = [
        ('users', '0005_add_patient_role'),
    ]

    operations = [
        # 1. 기존 senior 데이터를 patient로 변경
        migrations.RunPython(merge_senior_to_patient, reverse_merge),
        
        # 2. role 필드의 choices 업데이트 (senior 제거)
        migrations.AlterField(
            model_name='user',
            name='role',
            field=__import__('django.db.models', fromlist=['CharField']).CharField(
                choices=[('patient', '복약자'), ('guardian', '보호자')],
                default='patient',
                max_length=10,
                verbose_name='역할',
            ),
        ),
        
        # 3. GuardianRelation.senior FK의 limit_choices_to 업데이트
        migrations.AlterField(
            model_name='guardianrelation',
            name='senior',
            field=__import__('django.db.models', fromlist=['ForeignKey']).ForeignKey(
                limit_choices_to={'role__in': ['patient']},
                on_delete=__import__('django.db.models', fromlist=['CASCADE']).CASCADE,
                related_name='guardians',
                to='users.user',
                verbose_name='사용자',
            ),
        ),
    ]
