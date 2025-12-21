import React from "react";
import { useNavigate } from "react-router-dom";
import { motion } from "framer-motion";
import { useLanguage } from '../contexts/LanguageContext';
import { landingTranslations } from '../translations/landingTranslations';
import "../styles/LandingPage.css";

export default function LandingPage() {
  const navigate = useNavigate();
  const { language } = useLanguage();
  const t = landingTranslations[language];

  return (
    <div className="landing">
      {/* Hero Section */}
      <section className="hero">
        <div className="hero-inner">
          <motion.div
            className="hero-text"
            initial={{ opacity: 0, y: 30 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.8 }}
          >
            <h1>{t.hero.title}</h1>
            <p>{t.hero.subtitle}</p>

            <div className="hero-buttons">
              <button className="btn-primary" onClick={() => navigate("/study")}>
                {t.hero.startLearning}
              </button>
              <button
                className="btn-outline"
                onClick={() => window.scrollTo({ top: 700, behavior: "smooth" })}
              >
                {t.hero.learnMore}
              </button>
            </div>
          </motion.div>

          <motion.div
            className="hero-illustration"
            initial={{ opacity: 0, x: 100 }}
            animate={{ opacity: 1, x: 0 }}
            transition={{ duration: 1 }}
          >
            <img
              src="https://i.postimg.cc/65fYxRk6/gjidfpijgmwetf.jpg"
              alt="Học tập"
            />
          </motion.div>
        </div>
      </section>

      {/* Features Section */}
      <section className="features" id="features">
        <h2>{t.features.title}</h2>
        <p className="subtitle">
          {t.features.subtitle}
        </p>

        <div className="feature-grid">
          {[
            {
              img: "https://cdn-icons-png.flaticon.com/512/3135/3135715.png",
              ...t.features.cards[0]
            },
            {
              img: "https://cdn-icons-png.flaticon.com/512/1005/1005141.png",
              ...t.features.cards[1]
            },
            {
              img: "https://cdn-icons-png.flaticon.com/512/3135/3135719.png",
              ...t.features.cards[2]
            },
          ].map((f, i) => (
            <motion.div
              key={i}
              className="feature-card"
              initial={{ opacity: 0, y: 50 }}
              whileInView={{ opacity: 1, y: 0 }}
              transition={{ delay: i * 0.2 }}
            >
              <div className="icon-circle">
                <img src={f.img} alt={f.title} />
              </div>
              <h3>{f.title}</h3>
              <p>{f.desc}</p>
            </motion.div>
          ))}
        </div>
      </section>

      {/* AI Demo Section */}
    
      {/* CTA Section */}
      <motion.section
        className="cta-section"
        initial={{ opacity: 0 }}
        whileInView={{ opacity: 1 }}
        transition={{ duration: 0.8 }}
      >
        <div className="cta-box">
          <h2>{t.cta.title}</h2>
          <p>{t.cta.subtitle}</p>
          <button className="btn-primary btn-lg" onClick={() => navigate("/study")}>
            {t.cta.button}
          </button>
        </div>
      </motion.section>

      {/* Footer */}
    </div>
  );
}
