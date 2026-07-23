import React, { useState } from 'react';
import { ChevronLeft, ChevronRight, X } from 'lucide-react';

export default function FlashcardViewer({ flashcards, onClose }) {
  const [currentIndex, setCurrentIndex] = useState(0);
  const [isFlipped, setIsFlipped] = useState(false);

  if (!flashcards || flashcards.length === 0) {
    return (
      <div className="study-modal-overlay">
        <div className="study-modal-content">
          <header className="study-modal-header">
            <h2>Flashcards</h2>
            <button onClick={onClose}><X size={20} /></button>
          </header>
          <div className="study-modal-body">
            <p>Không có flashcard nào.</p>
          </div>
        </div>
      </div>
    );
  }

  const currentCard = flashcards[currentIndex];

  const handleNext = () => {
    setIsFlipped(false);
    setTimeout(() => {
      setCurrentIndex((prev) => (prev + 1) % flashcards.length);
    }, 150);
  };

  const handlePrev = () => {
    setIsFlipped(false);
    setTimeout(() => {
      setCurrentIndex((prev) => (prev - 1 + flashcards.length) % flashcards.length);
    }, 150);
  };

  return (
    <div className="study-modal-overlay" style={overlayStyle}>
      <div className="study-modal-content" style={contentStyle}>
        <header className="study-modal-header" style={headerStyle}>
          <h2>Flashcards</h2>
          <button onClick={onClose} style={closeBtnStyle}><X size={20} /></button>
        </header>
        
        <div className="study-modal-body" style={bodyStyle}>
          <div className="flashcard-container" style={containerStyle}>
            <div 
              className={`flashcard-inner ${isFlipped ? 'flipped' : ''}`} 
              style={{...innerStyle, transform: isFlipped ? 'rotateY(180deg)' : 'rotateY(0)'}}
              onClick={() => setIsFlipped(!isFlipped)}
            >
              <div className="flashcard-front" style={{...cardFaceStyle}}>
                <h3>Câu hỏi:</h3>
                <p>{currentCard.question || currentCard.front}</p>
                <span style={hintStyle}>Bấm để xem mặt sau</span>
              </div>
              <div className="flashcard-back" style={{...cardFaceStyle, transform: 'rotateY(180deg)', background: '#f8fafc'}}>
                <h3>Trả lời:</h3>
                <p>{currentCard.answer || currentCard.back}</p>
              </div>
            </div>
          </div>
          
          <div className="flashcard-controls" style={controlsStyle}>
            <button onClick={handlePrev} style={controlBtnStyle}><ChevronLeft size={20} /> Trước</button>
            <span>{currentIndex + 1} / {flashcards.length}</span>
            <button onClick={handleNext} style={controlBtnStyle}>Sau <ChevronRight size={20} /></button>
          </div>
        </div>
      </div>
    </div>
  );
}

const overlayStyle = {
  position: 'fixed',
  top: 0, left: 0, right: 0, bottom: 0,
  backgroundColor: 'rgba(0,0,0,0.5)',
  display: 'flex',
  alignItems: 'center',
  justifyContent: 'center',
  zIndex: 1000
};

const contentStyle = {
  background: 'white',
  borderRadius: '8px',
  width: '90%',
  maxWidth: '600px',
  maxHeight: '90vh',
  display: 'flex',
  flexDirection: 'column',
  boxShadow: '0 4px 6px rgba(0,0,0,0.1)'
};

const headerStyle = {
  padding: '16px 20px',
  borderBottom: '1px solid #e2e8f0',
  display: 'flex',
  justifyContent: 'space-between',
  alignItems: 'center'
};

const closeBtnStyle = {
  background: 'none',
  border: 'none',
  cursor: 'pointer'
};

const bodyStyle = {
  padding: '24px',
  display: 'flex',
  flexDirection: 'column',
  alignItems: 'center'
};

const containerStyle = {
  width: '100%',
  height: '300px',
  perspective: '1000px',
  marginBottom: '24px'
};

const innerStyle = {
  width: '100%',
  height: '100%',
  position: 'relative',
  transition: 'transform 0.6s',
  transformStyle: 'preserve-3d',
  cursor: 'pointer'
};

const cardFaceStyle = {
  position: 'absolute',
  width: '100%',
  height: '100%',
  backfaceVisibility: 'hidden',
  display: 'flex',
  flexDirection: 'column',
  justifyContent: 'center',
  alignItems: 'center',
  padding: '24px',
  borderRadius: '12px',
  boxShadow: '0 4px 8px rgba(0,0,0,0.1)',
  border: '1px solid #e2e8f0',
  background: 'white',
  textAlign: 'center',
  fontSize: '18px'
};

const hintStyle = {
  position: 'absolute',
  bottom: '16px',
  fontSize: '12px',
  color: '#94a3b8'
};

const controlsStyle = {
  display: 'flex',
  justifyContent: 'space-between',
  alignItems: 'center',
  width: '100%',
  maxWidth: '300px'
};

const controlBtnStyle = {
  display: 'flex',
  alignItems: 'center',
  gap: '4px',
  padding: '8px 16px',
  background: '#f1f5f9',
  border: 'none',
  borderRadius: '6px',
  cursor: 'pointer'
};
