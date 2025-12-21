import React, { useState } from 'react';
import { motion } from 'framer-motion';
import { useLanguage } from '../contexts/LanguageContext';
import resourcesData from '../data/resources.json';
import '../styles/Resources.css';

function TopicAccordion({ topic, language }) {
  const [open, setOpen] = useState(false);
  return (
    <motion.div
      className="topic-accordion"
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      transition={{ duration: 0.3 }}
    >
      <button
        className="accordion-toggle"
        onClick={() => setOpen(o => !o)}
      >
        <div className="accordion-header">
          <div className="accordion-info">
            <h3>{topic.title}</h3>
            <span className="lesson-count">{topic.lessons.length} {language === 'vi' ? 'bài học' : 'lessons'}</span>
          </div>
          <div className="accordion-icon">{open ? '▾' : '▸'}</div>
        </div>
      </button>
      {open && (
        <motion.div
          className="accordion-content"
          initial={{ opacity: 0, height: 0 }}
          animate={{ opacity: 1, height: 'auto' }}
          exit={{ opacity: 0, height: 0 }}
          transition={{ duration: 0.3 }}
        >
          <ul className="lessons-list">
            {topic.lessons.map((l, idx) => (
              <li key={idx} className="lesson-item">
                <a href={l.link} target="_blank" rel="noreferrer" className="lesson-link">
                  <span className="lesson-icon">📖</span>
                  <span className="lesson-name">{l.name}</span>
                  <span className="external-icon">↗</span>
                </a>
              </li>
            ))}
          </ul>
        </motion.div>
      )}
    </motion.div>
  );
}

export default function Resources() {
  const { language } = useLanguage();
  const topics = resourcesData.topics || [];
  const featured = topics.filter(t => t.featured).flatMap(t => t.lessons.map(l => ({ topic: t.title, ...l })));

  return (
    <div className="resources-container">
      {/* Header */}
      <motion.div
        className="resources-header"
        initial={{ opacity: 0, y: -20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.5 }}
      >
        <h1>{language === 'vi' ? '📚 Tài Nguyên Học Tập' : '📚 Learning Resources'}</h1>
        <p>{language === 'vi' ? 'Khám phá các tài liệu, video và bài tập để nâng cao kỹ năng của bạn' : 'Explore materials, videos, and exercises to enhance your skills'}</p>
      </motion.div>

      {/* Featured Resources Carousel */}
      {featured.length > 0 && (
        <motion.div
          className="featured-section"
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ delay: 0.2, duration: 0.5 }}
        >
          <h2>{language === 'vi' ? '⭐ Tài Nguyên Nổi Bật' : '⭐ Featured Resources'}</h2>
          <div className="featured-carousel">
            {featured.map((f, idx) => (
              <motion.a
                key={idx}
                className="featured-card"
                href={f.link}
                target="_blank"
                rel="noreferrer"
                initial={{ opacity: 0, x: 20 }}
                animate={{ opacity: 1, x: 0 }}
                transition={{ delay: idx * 0.1, duration: 0.4 }}
                whileHover={{ y: -8, boxShadow: '0 12px 24px rgba(37, 99, 235, 0.2)' }}
              >
                <div className="featured-card-icon">⭐</div>
                <div className="featured-card-content">
                  <h4>{f.name}</h4>
                  <p>{f.topic}</p>
                </div>
                <div className="featured-card-arrow">→</div>
              </motion.a>
            ))}
          </div>
        </motion.div>
      )}

      {/* Topics List */}
      <motion.div
        className="topics-section"
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        transition={{ delay: 0.3, duration: 0.5 }}
      >
        <h2>{language === 'vi' ? '📑 Tất Cả Tài Nguyên' : '📑 All Resources'}</h2>
        <div className="topics-list">
          {topics.map((t, idx) => (
            <motion.div
              key={t.id}
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              transition={{ delay: 0.3 + idx * 0.05, duration: 0.4 }}
            >
              <TopicAccordion topic={t} language={language} />
            </motion.div>
          ))}
        </div>
      </motion.div>
    </div>
  );
}
