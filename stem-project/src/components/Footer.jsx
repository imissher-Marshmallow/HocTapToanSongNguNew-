import React from "react";
import "../styles/footer.css"; // import CSS riêng

function Footer() {
  return (
    <footer className="footer">
      <div className="footer-container">
        <div className="footer-left">
          <h2 className="footer-title">Website Học Tập 8A2</h2>
          <p className="footer-sub">© {new Date().getFullYear()} | All rights reserved</p>
        </div>

        <div className="footer-links">
          <a href="#about">Giới thiệu</a>
          <a href="#contact">Liên hệ</a>
          <a href="#faq">Hỏi đáp</a>
          <a href="https://fconline.garena.vn/">FCO for bobo</a>
        </div>

        <div className="footer-right">
          <a href="mailto:contact@8a2.com" title="Email">📧</a>
          <a href="https://github.com/yourusername" target="_blank" rel="noreferrer" title="GitHub">💻</a>
        </div>
      </div>

      <div className="footer-bottom">
        Made with <span className="heart">❤️</span> by 8A2 Team
      </div>
    </footer>
  );
}

export default Footer;
