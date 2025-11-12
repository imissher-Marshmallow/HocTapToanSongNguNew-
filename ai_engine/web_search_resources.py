"""
web_search_resources.py

Uses OpenAI API to search for learning resources and generate motivational feedback.
"""

import os
try:
    from openai import OpenAI
except ImportError:
    OpenAI = None
import requests
from urllib.parse import urlparse

# Curated resource mapping
CURATED_RESOURCES = {
    'Đa thức': [
        {'title': 'Đa thức - Khái niệm và Phép Toán', 'source': 'VietJack', 'url': 'https://vietjack.com/toan-7/da-thuc.jsp', 'type': 'lesson'},
        {'title': 'Các phép toán với đa thức', 'source': 'VietJack', 'url': 'https://vietjack.com/toan-7/phep-cong-tru-da-thuc.jsp', 'type': 'exercise'},
        {'title': 'Polynomial Arithmetic', 'source': 'Khan Academy', 'url': 'https://www.khanacademy.org/math/algebra/polynomial-arithmetic', 'type': 'video'}
    ],
    'Hình học': [
        {'title': 'Hình học cơ bản - Tam giác', 'source': 'VietJack', 'url': 'https://vietjack.com/toan-7/hinh-hoc-tam-giac.jsp', 'type': 'lesson'},
        {'title': 'Các tính chất của tam giác', 'source': 'VietJack', 'url': 'https://vietjack.com/toan-7/tinh-chat-tam-giac.jsp', 'type': 'exercise'},
        {'title': 'Geometry Basics', 'source': 'Khan Academy', 'url': 'https://www.khanacademy.org/math/geometry', 'type': 'video'}
    ],
    'Phương trình': [
        {'title': 'Phương trình bậc nhất một ẩn', 'source': 'VietJack', 'url': 'https://vietjack.com/toan-8/phuong-trinh-bac-nhat-mot-an.jsp', 'type': 'lesson'},
        {'title': 'Hệ phương trình bậc nhất', 'source': 'VietJack', 'url': 'https://vietjack.com/toan-9/he-phuong-trinh-bac-nhat-hai-an.jsp', 'type': 'exercise'},
        {'title': 'Solving Equations', 'source': 'Khan Academy', 'url': 'https://www.khanacademy.org/math/algebra/solving-linear-equations', 'type': 'video'}
    ],
    'Hằng đẳng thức': [
        {'title': 'Hằng đẳng thức đáng nhớ (Phần 1)', 'source': 'VietJack', 'url': 'https://vietjack.com/toan-8/hang-dang-thuc-dang-nho.jsp', 'type': 'lesson'},
        {'title': 'Hằng đẳng thức đáng nhớ (Phần 2)', 'source': 'VietJack', 'url': 'https://vietjack.com/toan-8/hang-dang-thuc-dang-nho-phan-2.jsp', 'type': 'exercise'},
        {'title': 'Perfect Square Trinomials', 'source': 'Khan Academy', 'url': 'https://www.khanacademy.org/math/algebra/perfect-square-trinomials', 'type': 'video'}
    ],
    'General': [
        {'title': 'Ôn tập Toán cơ bản', 'source': 'VietJack', 'url': 'https://vietjack.com/toan/', 'type': 'lesson'},
        {'title': 'Toán học từ cơ bản', 'source': 'Khan Academy', 'url': 'https://www.khanacademy.org/math', 'type': 'video'}
    ]
}

def get_resources_for_topic(topic: str, difficulty: str = 'medium') -> list:
    """Get learning resources for a specific topic."""
    clean_topic = (topic or 'General').strip()
    
    # Helper: check URL is reachable (HEAD or GET) quickly
    def is_url_ok(url: str, timeout: float = 3.0) -> bool:
        try:
            parsed = urlparse(url)
            if not parsed.scheme.startswith('http'):
                return False
            # Use HEAD first to be lightweight
            resp = requests.head(url, allow_redirects=True, timeout=timeout)
            return resp.status_code >= 200 and resp.status_code < 400
        except Exception:
            return False

    # First try curated resources and filter invalid links
    if clean_topic in CURATED_RESOURCES:
        valid = [r for r in CURATED_RESOURCES[clean_topic] if isinstance(r.get('url'), str) and is_url_ok(r.get('url'))]
        if valid:
            return valid

    # Try to find a close match and validate links
    for key in CURATED_RESOURCES:
        if key.lower() in clean_topic.lower():
            valid = [r for r in CURATED_RESOURCES[key] if isinstance(r.get('url'), str) and is_url_ok(r.get('url'))]
            if valid:
                return valid

    # If none valid, attempt to build safe VietJack link for common topics
    vk_base = 'https://vietjack.com'
    slug_map = {
        'đa thức': '/toan-7/da-thuc.jsp',
        'hình học': '/toan-7/hinh-hoc-tam-giac.jsp',
        'phương trình': '/toan-8/phuong-trinh-bac-nhat-mot-an.jsp',
        'hằng đẳng thức': '/toan-8/hang-dang-thuc-dang-nho.jsp',
        'số học': '/toan-6/so-nguyen-phan-so.jsp'
    }
    key = clean_topic.lower()
    for k in slug_map:
        if k in key:
            candidate = vk_base + slug_map[k]
            if is_url_ok(candidate):
                return [{'title': f'Bài học {clean_topic}', 'source': 'VietJack', 'url': candidate, 'type': 'lesson'}]

    # Return general curated resources filtered by validity
    general_valid = [r for r in CURATED_RESOURCES['General'] if isinstance(r.get('url'), str) and is_url_ok(r.get('url'))]
    if general_valid:
        return general_valid

    # Last resort: return the unfiltered general list (best-effort)
    return CURATED_RESOURCES['General']

def generate_motivational_feedback(score: float, performance_label: str, weak_areas: list) -> dict:
    """Generate motivational feedback based on student performance."""
    
    messages = {
        'Giỏi': {
            'opening': '🌟 Chúc mừng! Bạn đã đạt kết quả rất tốt!',
            'body': 'Bạn đã chứng tỏ sự hiểu biết sâu sắc về các chủ đề này. Hãy tiếp tục duy trì đà tốt và thử sức với các bài toán nâng cao hơn!',
            'closing': 'Bạn đang trên đường trở thành một bậc thầy toán học! 🚀'
        },
        'Đạt': {
            'opening': '✅ Tốt lắm! Bạn đã đạt yêu cầu học tập.',
            'body': 'Bạn đã nắm được kiến thức cơ bản tốt. Chỉ cần luyện tập thêm một chút ở những chủ đề yếu, bạn sẽ đạt kết quả tuyệt vời!',
            'closing': 'Cứ tiếp tục nỗ lực, bạn sẽ tất yếu thành công! 💪'
        },
        'Trung bình': {
            'opening': '📚 Bạn đã tìm ra những điểm cần cải thiện. Đó là điều tốt!',
            'body': 'Học tập không phải là một cuộc đua, mà là một hành trình. Bạn đã hoàn thành một phần quan trọng bằng cách nhận ra điểm yếu của mình. Hãy theo kế hoạch học tập bên dưới, bạn chắc chắn sẽ tiến bộ!',
            'closing': 'Mỗi ngày bạn học tập là một ngày bạn tiến gần hơn đến mục tiêu! 🌱'
        },
        'Không đạt': {
            'opening': '💡 Đây là cơ hội để bạn phát triển!',
            'body': 'Điểm số hiện tại có vẻ chưa lý tưởng, nhưng đừng buồn! Đây chỉ là bắt đầu. Hầu hết các bạn xuất sắc đều từng trải qua lúc khó khăn. Hãy làm theo kế hoạch chi tiết dưới đây, chăm chỉ luyện tập, và bạn sẽ sớm thấy sự tiến bộ!',
            'closing': 'Thành công đến với những ai không bỏ cuộc. Bạn sẽ làm được! 🔥'
        }
    }
    
    msg = messages.get(performance_label, messages['Trung bình'])
    
    weak_area_encouragement = ''
    if weak_areas and len(weak_areas) > 0:
        top_weak = weak_areas[0]
        weak_area_topic = top_weak.get('topic', 'chủ đề này')
        weak_area_encouragement = f'\n\n📌 Điểm đặc biệt: Chủ đề "{weak_area_topic}" cần sự chú ý của bạn. Đây là một chủ đề quan trọng, và khi bạn nắm vững nó, bạn sẽ cảm thấy tự tin hơn nhiều!'
    
    overall_message = f"{msg['opening']}\n\n{msg['body']}{weak_area_encouragement}\n\n{msg['closing']}"
    
    return {
        'opening': msg['opening'],
        'body': msg['body'] + weak_area_encouragement,
        'closing': msg['closing'],
        'overall_message': overall_message
    }
