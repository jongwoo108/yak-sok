"""
Health Services - GPT-5 Mini 질병 추론 및 키워드 생성
"""

import json
import httpx
from openai import OpenAI
from django.conf import settings
from django.utils import timezone


def _get_openai_client():
    """OpenAI 클라이언트 생성 (SSL 호환)"""
    http_client = httpx.Client(verify=False)
    return OpenAI(api_key=settings.OPENAI_API_KEY, http_client=http_client)


def infer_conditions_from_medications(user):
    """
    사용자 약 목록 → GPT-5 Mini로 질병 추론
    
    Args:
        user: User 인스턴스
        
    Returns:
        list: [{"name": "고혈압", "category": "심혈관"}, ...]
    """
    from apps.medications.models import Medication
    
    medications = Medication.objects.filter(user=user, is_active=True)
    if not medications.exists():
        return []
    
    med_names = [m.name for m in medications]
    client = _get_openai_client()
    
    response = client.chat.completions.create(
        model="gpt-5",
        messages=[
            {
                "role": "system",
                "content": """당신은 의약품 전문가입니다. 의약품 목록을 분석하여 추정 질병/증상을 JSON으로 반환하세요.

반환 형식:
{
    "conditions": [
        {"name": "질병명", "category": "카테고리"}
    ]
}

카테고리 옵션: 심혈관, 내분비, 호흡기, 소화기, 근골격, 신경, 정신건강, 피부, 면역, 기타

주의사항:
- 약의 주요 적응증만 포함
- 일반적이고 명확한 질병명 사용
- 중복 없이 반환"""
            },
            {
                "role": "user",
                "content": f"복용 약: {', '.join(med_names)}"
            }
        ],
        response_format={"type": "json_object"},
    )
    
    result = json.loads(response.choices[0].message.content)
    return result.get('conditions', [])


def generate_search_queries(conditions):
    """
    질병 목록 → YouTube 검색 키워드 생성 (GPT-5 Mini)
    
    Args:
        conditions: [{"name": "고혈압", "category": "심혈관"}, ...]
        
    Returns:
        list: [{"query": "고혈압 저염 식단", "category": "diet", "condition": "고혈압"}, ...]
    """
    if not conditions:
        return []
    
    condition_names = [c.get('name', '') for c in conditions]
    client = _get_openai_client()
    
    response = client.chat.completions.create(
        model="gpt-5",
        messages=[
            {
                "role": "system",
                "content": """질병 목록을 보고 YouTube에서 검색할 한국어 건강 관리 키워드를 생성하세요. 결과는 JSON으로 반환하세요.

카테고리별로 생성:
- diet: 식이요법, 음식 관련
- exercise: 운동, 스트레칭 관련
- lifestyle: 생활습관, 수면, 스트레스 관련
- medical: 전문의 설명, 질병 이해 관련

반환 형식:
{
    "queries": [
        {"query": "검색 키워드", "category": "diet", "condition": "질병명"}
    ]
}

각 질병당 4개 키워드 (카테고리별 1개씩) 생성하세요.
검색 키워드는 YouTube에서 실제로 잘 검색되는 자연스러운 한국어로 작성하세요."""
            },
            {
                "role": "user",
                "content": f"질병: {', '.join(condition_names)}"
            }
        ],
        response_format={"type": "json_object"},
    )
    
    result = json.loads(response.choices[0].message.content)
    return result.get('queries', [])


def analyze_and_update_profile(user):
    """
    사용자 건강 프로필 전체 분석 (질병 추론 + 키워드 생성)
    약 등록/수정 시 호출
    
    Returns:
        UserHealthProfile 인스턴스
    """
    from .models import UserHealthProfile, HealthCondition
    
    profile, created = UserHealthProfile.objects.get_or_create(user=user)
    
    # 1. 질병 추론
    conditions = infer_conditions_from_medications(user)
    profile.conditions = conditions
    
    # 2. 검색 키워드 생성
    search_queries = generate_search_queries(conditions)
    profile.search_queries = search_queries
    
    # 3. HealthCondition 마스터 데이터 자동 생성/매핑
    category_map = {
        '심혈관': 'cardiovascular',
        '내분비': 'endocrine',
        '호흡기': 'respiratory',
        '소화기': 'digestive',
        '근골격': 'musculoskeletal',
        '신경': 'neurological',
        '정신건강': 'mental',
        '피부': 'dermatological',
        '면역': 'immune',
        '기타': 'other',
    }
    
    for condition in conditions:
        name = condition.get('name', '')
        category_kr = condition.get('category', '기타')
        category_en = category_map.get(category_kr, 'other')
        
        if name:
            HealthCondition.objects.get_or_create(
                name=name,
                defaults={
                    'category': category_en,
                }
            )
    
    profile.last_analyzed_at = timezone.now()
    profile.save()
    
    return profile
