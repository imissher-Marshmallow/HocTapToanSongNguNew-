import requests
from bs4 import BeautifulSoup
from typing import List, Dict, Optional
import json
import os
from datetime import datetime
import aiohttp
import asyncio
from urllib.parse import urljoin

class ResourceScraper:
    def __init__(self):
        self.sources = {
            'vietjack': {
                'base_url': 'https://vietjack.com',
                'math_path': '/math-grade-8',
                'allowed_domains': ['vietjack.com']
            },
            'hoc247': {
                'base_url': 'https://hoc247.net',
                'math_path': '/toan-8',
                'allowed_domains': ['hoc247.net']
            }
        }
        self.session = None
        
    async def init_session(self):
        if not self.session:
            self.session = aiohttp.ClientSession()
    
    async def close(self):
        if self.session:
            await self.session.close()
            self.session = None
    
    def clean_text(self, text: str) -> str:
        """Clean and normalize text content."""
        if not text:
            return ""
        return " ".join(text.split())
    
    async def fetch_page(self, url: str) -> Optional[str]:
        """Fetch a page with error handling and retries."""
        try:
            await self.init_session()
            async with self.session.get(url) as response:
                if response.status == 200:
                    return await response.text()
                else:
                    print(f"Error fetching {url}: Status {response.status}")
                    return None
        except Exception as e:
            print(f"Error fetching {url}: {str(e)}")
            return None
    
    async def scrape_vietjack_math(self, topic: Optional[str] = None) -> List[Dict]:
        """Scrape math resources from VietJack."""
        resources = []
        base_url = self.sources['vietjack']['base_url']
        math_url = urljoin(base_url, self.sources['vietjack']['math_path'])
        
        # Fetch main page
        content = await self.fetch_page(math_url)
        if not content:
            return resources
        
        soup = BeautifulSoup(content, 'html.parser')
        
        # Find topic sections
        topic_sections = soup.find_all('div', class_='topic-section')
        
        for section in topic_sections:
            topic_name = self.clean_text(section.find('h2').text) if section.find('h2') else "Unknown Topic"
            
            if topic and topic.lower() not in topic_name.lower():
                continue
                
            # Extract resources
            lessons = section.find_all('a', class_='lesson-link')
            for lesson in lessons:
                resource = {
                    'title': self.clean_text(lesson.text),
                    'url': urljoin(base_url, lesson.get('href', '')),
                    'type': 'lesson',
                    'topic': topic_name,
                    'source': 'VietJack',
                    'scraped_at': datetime.utcnow().isoformat(),
                    'resource_metadata': {
                        'difficulty': self._estimate_difficulty(lesson.text),
                        'has_exercises': 'bài tập' in lesson.text.lower()
                    }
                }
                resources.append(resource)
        
        return resources
    
    async def scrape_hoc247_math(self, topic: Optional[str] = None) -> List[Dict]:
        """Scrape math resources from Hoc247."""
        resources = []
        base_url = self.sources['hoc247']['base_url']
        math_url = urljoin(base_url, self.sources['hoc247']['math_path'])
        
        content = await self.fetch_page(math_url)
        if not content:
            return resources
            
        soup = BeautifulSoup(content, 'html.parser')
        
        # Find lesson containers
        lessons = soup.find_all('div', class_='lesson-container')
        
        for lesson in lessons:
            topic_name = self.clean_text(lesson.find('h3').text) if lesson.find('h3') else "Unknown Topic"
            
            if topic and topic.lower() not in topic_name.lower():
                continue
            
            # Extract lesson details
            title_elem = lesson.find('a', class_='lesson-title')
            if title_elem:
                resource = {
                    'title': self.clean_text(title_elem.text),
                    'url': urljoin(base_url, title_elem.get('href', '')),
                    'type': 'lesson',
                    'topic': topic_name,
                    'source': 'Hoc247',
                    'scraped_at': datetime.utcnow().isoformat(),
                    'resource_metadata': {
                        'difficulty': self._estimate_difficulty(title_elem.text),
                        'has_exercises': self._has_exercises(lesson)
                    }
                }
                resources.append(resource)
        
        return resources
    
    def _estimate_difficulty(self, text: str) -> str:
        """Estimate content difficulty based on keywords."""
        text = text.lower()
        if any(word in text for word in ['cơ bản', 'easy', 'basic']):
            return 'easy'
        elif any(word in text for word in ['nâng cao', 'hard', 'advanced']):
            return 'hard'
        return 'medium'
    
    def _has_exercises(self, container) -> bool:
        """Check if a lesson container has exercise content."""
        exercise_indicators = ['bài tập', 'luyện tập', 'exercises']
        text = container.text.lower()
        return any(indicator in text for indicator in exercise_indicators)
    
    async def fetch_resources(self, topic: Optional[str] = None) -> List[Dict]:
        """Fetch resources from all configured sources."""
        tasks = [
            self.scrape_vietjack_math(topic),
            self.scrape_hoc247_math(topic)
        ]
        
        results = await asyncio.gather(*tasks)
        
        # Combine and deduplicate resources
        all_resources = []
        seen_urls = set()
        
        for source_resources in results:
            for resource in source_resources:
                if resource['url'] not in seen_urls:
                    seen_urls.add(resource['url'])
                    all_resources.append(resource)
        
        return all_resources
    
    async def update_resource_database(self, topic: Optional[str] = None) -> Dict:
        """Update the resource database with fresh content."""
        resources = await self.fetch_resources(topic)
        
        # Save to JSON file with timestamp
        timestamp = datetime.utcnow().strftime('%Y%m%d_%H%M%S')
        filename = f'resources_{timestamp}.json'
        
        os.makedirs('data', exist_ok=True)
        with open(os.path.join('data', filename), 'w', encoding='utf-8') as f:
            json.dump(resources, f, ensure_ascii=False, indent=2)
        
        return {
            'status': 'success',
            'resources_count': len(resources),
            'timestamp': timestamp,
            'filename': filename
        }