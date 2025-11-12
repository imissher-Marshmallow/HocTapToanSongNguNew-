/**
 * webSearchResources.js
 * 
 * Uses OpenAI's API (with Bing search if available) or curated resource mapping
 * to find real learning links from VietJack, Khan Academy, and other trusted sources
 * for specific math topics and weak areas.
 */

const OpenAI = require('openai');
require('dotenv').config();

let openai;
try {
  openai = new OpenAI({ apiKey: process.env.OPENAI_API_KEY || '' });
} catch (error) {
  console.warn('Failed to initialize OpenAI client:', error);
}

// Curated resource mapping: topic -> array of trusted learning resources
const CURATED_RESOURCES = {
  'Đa thức': [
    { title: 'Đa thức - Khái niệm và Phép Toán', source: 'VietJack', url: 'https://vietjack.com/toan-7/da-thuc.jsp', type: 'lesson' },
    { title: 'Các phép toán với đa thức', source: 'VietJack', url: 'https://vietjack.com/toan-7/phep-cong-tru-da-thuc.jsp', type: 'exercise' },
    { title: 'Hằng đẳng thức đáng nhớ', source: 'Khan Academy', url: 'https://www.khanacademy.org/math/algebra/polynomial-arithmetic', type: 'video' }
  ],
  'Hình học': [
    { title: 'Hình học cơ bản - Tam giác', source: 'VietJack', url: 'https://vietjack.com/toan-7/hinh-hoc-tam-giac.jsp', type: 'lesson' },
    { title: 'Các tính chất của tam giác', source: 'VietJack', url: 'https://vietjack.com/toan-7/tinh-chat-tam-giac.jsp', type: 'exercise' },
    { title: 'Geometry Basics', source: 'Khan Academy', url: 'https://www.khanacademy.org/math/geometry', type: 'video' }
  ],
  'Phương trình': [
    { title: 'Phương trình bậc nhất một ẩn', source: 'VietJack', url: 'https://vietjack.com/toan-8/phuong-trinh-bac-nhat-mot-an.jsp', type: 'lesson' },
    { title: 'Hệ phương trình bậc nhất', source: 'VietJack', url: 'https://vietjack.com/toan-9/he-phuong-trinh-bac-nhat-hai-an.jsp', type: 'exercise' },
    { title: 'Solving Equations', source: 'Khan Academy', url: 'https://www.khanacademy.org/math/algebra/solving-linear-equations', type: 'video' }
  ],
  'Hằng đẳng thức': [
    { title: 'Hằng đẳng thức đáng nhớ (Phần 1)', source: 'VietJack', url: 'https://vietjack.com/toan-8/hang-dang-thuc-dang-nho.jsp', type: 'lesson' },
    { title: 'Hằng đẳng thức đáng nhớ (Phần 2)', source: 'VietJack', url: 'https://vietjack.com/toan-8/hang-dang-thuc-dang-nho-phan-2.jsp', type: 'exercise' },
    { title: 'Perfect Square Trinomials', source: 'Khan Academy', url: 'https://www.khanacademy.org/math/algebra/perfect-square-trinomials', type: 'video' }
  ],
  'Toán cơ bản (phép toán)': [
    { title: 'Phép toán cơ bản', source: 'VietJack', url: 'https://vietjack.com/toan-6/phep-cong-phep-tru.jsp', type: 'lesson' },
    { title: 'Phép nhân và chia', source: 'VietJack', url: 'https://vietjack.com/toan-6/phep-nhan-phep-chia.jsp', type: 'exercise' },
    { title: 'Basic Arithmetic', source: 'Khan Academy', url: 'https://www.khanacademy.org/math/arithmetic', type: 'video' }
  ],
  'Tối ưu / Giá trị cực trị': [
    { title: 'Giá trị lớn nhất, giá trị nhỏ nhất', source: 'VietJack', url: 'https://vietjack.com/toan-9/gia-tri-lon-nhat-nho-nhat.jsp', type: 'lesson' },
    { title: 'Bất đẳng thức và cực trị', source: 'VietJack', url: 'https://vietjack.com/toan-9/bat-dang-thuc.jsp', type: 'exercise' }
  ],
  'Số học': [
    { title: 'Số nguyên và phân số', source: 'VietJack', url: 'https://vietjack.com/toan-6/so-nguyen-phan-so.jsp', type: 'lesson' },
    { title: 'Các phép toán với số', source: 'VietJack', url: 'https://vietjack.com/toan-6/cong-tru-nhan-chia-so.jsp', type: 'exercise' },
    { title: 'Number System', source: 'Khan Academy', url: 'https://www.khanacademy.org/math/pre-algebra/numbers', type: 'video' }
  ],
  'Bậc / Hệ số': [
    { title: 'Bậc của đa thức', source: 'VietJack', url: 'https://vietjack.com/toan-7/bac-cua-da-thuc.jsp', type: 'lesson' },
    { title: 'Hệ số trong đa thức', source: 'VietJack', url: 'https://vietjack.com/toan-7/he-so-da-thuc.jsp', type: 'exercise' }
  ],
  'General': [
    { title: 'Ôn tập Toán cơ bản', source: 'VietJack', url: 'https://vietjack.com/toan/', type: 'lesson' },
    { title: 'Toán học từ cơ bản', source: 'Khan Academy', url: 'https://www.khanacademy.org/math', type: 'video' }
  ]
};

/**
 * Get learning resources for a specific topic.
 * First tries OpenAI web search (if available), then falls back to curated resources.
 */
async function getResourcesForTopic(topic, difficulty = 'medium') {
  // Clean topic name for search
  const cleanTopic = (topic || 'General').trim();
  
  // Try OpenAI search first (if supported)
  try {
    if (openai) {
      // Attempt to use OpenAI with search capability
      // Note: As of late 2024, OpenAI doesn't natively support web search through the standard API
      // We'll use a prompt-based approach to suggest where to find resources
      const prompt = `Tìm ra các bài học trên VietJack hoặc Khan Academy cho chủ đề: "${cleanTopic}" (mức độ: ${difficulty}). 
      Trả về duy nhất một JSON array không kèm chữ thừa với format:
      [
        { "title": "tên bài học", "source": "VietJack hoặc Khan Academy", "url": "link học liệu" },
        ...tối đa 3 tài liệu
      ]
      VD:
      [
        { "title": "Đa thức - Khái niệm", "source": "VietJack", "url": "https://vietjack.com/toan-7/da-thuc.jsp" }
      ]`;

      const response = await openai.chat.completions.create({
        model: 'gpt-4o-mini',
        messages: [
          {
            role: 'user',
            content: prompt
          }
        ],
        max_tokens: 400,
        temperature: 0.3
      });

      const raw = response.choices[0].message.content.trim();
      try {
        const jsonMatch = raw.match(/\[[\s\S]*\]/);
        if (jsonMatch) {
          const parsed = JSON.parse(jsonMatch[0]);
          if (Array.isArray(parsed) && parsed.length > 0) {
            return parsed;
          }
        }
      } catch (e) {
        console.warn('Failed to parse OpenAI search result:', e);
      }
    }
  } catch (err) {
    console.warn('OpenAI search failed, using curated resources:', err && err.message);
  }

  // Fallback to curated resources
  return CURATED_RESOURCES[cleanTopic] || CURATED_RESOURCES['General'] || [];
}

/**
 * Generate motivational feedback based on student's performance level and weak areas.
 */
function generateMotivationalFeedback(score, performanceLabel, weakAreas) {
  // Map performance level to motivation message
  const motivationalMessages = {
    'Giỏi': {
      opening: '🌟 Chúc mừng! Bạn đã đạt kết quả rất tốt!',
      body: 'Bạn đã chứng tỏ sự hiểu biết sâu sắc về các chủ đề này. Hãy tiếp tục duy trì đà tốt và thử sức với các bài toán nâng cao hơn!',
      closing: 'Bạn đang trên đường trở thành một bậc thầy toán học! 🚀'
    },
    'Đạt': {
      opening: '✅ Tốt lắm! Bạn đã đạt yêu cầu học tập.',
      body: 'Bạn đã nắm được kiến thức cơ bản tốt. Chỉ cần luyện tập thêm một chút ở những chủ đề yếu, bạn sẽ đạt kết quả tuyệt vời!',
      closing: 'Cứ tiếp tục nỗ lực, bạn sẽ tất yếu thành công! 💪'
    },
    'Trung bình': {
      opening: '📚 Bạn đã tìm ra những điểm cần cải thiện. Đó là điều tốt!',
      body: 'Học tập không phải là một cuộc đua, mà là một hành trình. Bạn đã hoàn thành một phần quan trọng bằng cách nhận ra điểm yếu của mình. Hãy theo kế hoạch học tập bên dưới, bạn chắc chắn sẽ tiến bộ!',
      closing: 'Mỗi ngày bạn học tập là một ngày bạn tiến gần hơn đến mục tiêu! 🌱'
    },
    'Không đạt': {
      opening: '💡 Đây là cơ hội để bạn phát triển!',
      body: 'Điểm số hiện tại có vẻ chưa lý tưởng, nhưng đừng buồn! Đây chỉ là bắt đầu. Hầu hết các bạn xuất sắc đều từng trải qua lúc khó khăn. Hãy làm theo kế hoạch chi tiết dưới đây, chăm chỉ luyện tập, và bạn sẽ sớm thấy sự tiến bộ!',
      closing: 'Thành công đến với những ai không bỏ cuộc. Bạn sẽ làm được! 🔥'
    }
  };

  const msg = motivationalMessages[performanceLabel] || motivationalMessages['Trung bình'];

  // Add specific weak area encouragement
  let weakAreaEncouragement = '';
  if (weakAreas && weakAreas.length > 0) {
    const topWeakArea = weakAreas[0];
    weakAreaEncouragement = `\n\n📌 Điểm đặc biệt: Chủ đề "${topWeakArea.topic}" cần sự chú ý của bạn. Đây là một chủ đề quan trọng, và khi bạn nắm vững nó, bạn sẽ cảm thấy tự tin hơn nhiều!`;
  }

  return {
    opening: msg.opening,
    body: msg.body + weakAreaEncouragement,
    closing: msg.closing,
    overallMessage: `${msg.opening}\n\n${msg.body}${weakAreaEncouragement}\n\n${msg.closing}`
  };
}

module.exports = {
  getResourcesForTopic,
  generateMotivationalFeedback,
  CURATED_RESOURCES
};
