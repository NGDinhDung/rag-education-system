import React, { useState, useEffect } from 'react';
import { ChevronLeft, ChevronRight, X, Brain } from 'lucide-react';
import axiosClient from '../../api/axiosClient';

export default function FlashcardViewer({ flashcards, documentId, onClose }) {
  const [localCards, setLocalCards] = useState(flashcards || []);
  
  const now = new Date();
  const dueCards = localCards.filter(c => !c.next_review_date || new Date(c.next_review_date) <= now);
  
  const [isStudyMode, setIsStudyMode] = useState(dueCards.length > 0);
  const [currentIndex, setCurrentIndex] = useState(0);
  const [isFlipped, setIsFlipped] = useState(false);

  const displayCards = isStudyMode ? dueCards : localCards;

  useEffect(() => {
    if (currentIndex >= displayCards.length) {
      setCurrentIndex(Math.max(0, displayCards.length - 1));
    }
  }, [displayCards.length, currentIndex]);

  if (!localCards || localCards.length === 0) {
    return (
      <div className="study-modal-overlay" style={overlayStyle}>
        <div className="study-modal-content" style={contentStyle}>
          <header className="study-modal-header" style={headerStyle}>
            <h2>Flashcards</h2>
            <button onClick={onClose} style={closeBtnStyle}><X size={20} /></button>
          </header>
          <div className="study-modal-body" style={bodyStyle}>
            <p>Không có flashcard nào.</p>
          </div>
        </div>
      </div>
    );
  }

  const currentCard = displayCards[currentIndex];

  const handleNext = () => {
    setIsFlipped(false);
    setTimeout(() => {
      setCurrentIndex((prev) => (prev + 1) % displayCards.length);
    }, 150);
  };

  const handlePrev = () => {
    setIsFlipped(false);
    setTimeout(() => {
      setCurrentIndex((prev) => (prev - 1 + displayCards.length) % displayCards.length);
    }, 150);
  };

  const handleReview = async (quality) => {
    if (!documentId) return;
    
    try {
      const res = await axiosClient.post(`/documents/${documentId}/flashcards/${currentCard.id}/review`, { quality });
      // Update localCards with new next_review_date
      setLocalCards(prev => prev.map(c => 
        c.id === currentCard.id 
          ? { ...c, next_review_date: res.data.next_review_date } 
          : c
      ));
      setIsFlipped(false);
      // The card will disappear from dueCards, so currentIndex stays same to point to the next card
      // unless it was the last card.
    } catch (err) {
      console.error("Lỗi cập nhật SRS", err);
    }
  };

  return (
    <div className="study-modal-overlay" style={overlayStyle}>
      <div className="study-modal-content" style={contentStyle}>
        <header className="study-modal-header" style={headerStyle}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
            <h2>Flashcards</h2>
            <div style={tabContainerStyle}>
              <button 
                style={isStudyMode ? activeTabStyle : inactiveTabStyle}
                onClick={() => { setIsStudyMode(true); setCurrentIndex(0); setIsFlipped(false); }}
              >
                <Brain size={16} /> Ôn tập ({dueCards.length})
              </button>
              <button 
                style={!isStudyMode ? activeTabStyle : inactiveTabStyle}
                onClick={() => { setIsStudyMode(false); setCurrentIndex(0); setIsFlipped(false); }}
              >
                Tất cả ({localCards.length})
              </button>
            </div>
          </div>
          <button onClick={onClose} style={closeBtnStyle}><X size={20} /></button>
        </header>
        
        <div className="study-modal-body" style={bodyStyle}>
          {displayCards.length === 0 ? (
            <div style={{ textAlign: 'center', padding: '40px', color: '#64748b' }}>
              <Brain size={48} style={{ margin: '0 auto 16px', opacity: 0.5 }} />
              <h3>Chúc mừng! Bạn đã ôn tập xong.</h3>
              <p>Không còn thẻ nào đến hạn trong hôm nay.</p>
            </div>
          ) : (
            <>
              <div className="flashcard-container" style={containerStyle}>
                <div 
                  className={`flashcard-inner ${isFlipped ? 'flipped' : ''}`} 
                  style={{...innerStyle, transform: isFlipped ? 'rotateY(180deg)' : 'rotateY(0)'}}
                  onClick={() => setIsFlipped(!isFlipped)}
                >
                  <div className="flashcard-front" style={{...cardFaceStyle}}>
                    <h3>Câu hỏi:</h3>
                    <p>{currentCard.question || currentCard.front}</p>
                    <span style={hintStyle}>Bấm để lật xem đáp án</span>
                  </div>
                  <div className="flashcard-back" style={{...cardFaceStyle, transform: 'rotateY(180deg)', background: '#f8fafc'}}>
                    <h3>Trả lời:</h3>
                    <p>{currentCard.answer || currentCard.back}</p>
                  </div>
                </div>
              </div>
              
              {isStudyMode && isFlipped ? (
                <div style={srsControlsStyle}>
                  <button onClick={() => handleReview(1)} style={{...srsBtnStyle, background: '#ef4444'}}>Lại (1)</button>
                  <button onClick={() => handleReview(3)} style={{...srsBtnStyle, background: '#f97316'}}>Khó (3)</button>
                  <button onClick={() => handleReview(4)} style={{...srsBtnStyle, background: '#3b82f6'}}>Tốt (4)</button>
                  <button onClick={() => handleReview(5)} style={{...srsBtnStyle, background: '#22c55e'}}>Dễ (5)</button>
                </div>
              ) : (
                <div className="flashcard-controls" style={controlsStyle}>
                  <button onClick={handlePrev} style={controlBtnStyle}><ChevronLeft size={20} /> Trước</button>
                  <span>{currentIndex + 1} / {displayCards.length}</span>
                  <button onClick={handleNext} style={controlBtnStyle}>Sau <ChevronRight size={20} /></button>
                </div>
              )}
            </>
          )}
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

const tabContainerStyle = {
  display: 'flex',
  gap: '8px',
  background: '#f1f5f9',
  padding: '4px',
  borderRadius: '8px',
  marginLeft: '16px'
};

const activeTabStyle = {
  background: 'white',
  border: 'none',
  padding: '6px 12px',
  borderRadius: '6px',
  boxShadow: '0 1px 3px rgba(0,0,0,0.1)',
  fontWeight: '600',
  color: '#334155',
  cursor: 'pointer',
  display: 'flex',
  alignItems: 'center',
  gap: '6px',
  fontSize: '14px'
};

const inactiveTabStyle = {
  background: 'transparent',
  border: 'none',
  padding: '6px 12px',
  color: '#64748b',
  cursor: 'pointer',
  display: 'flex',
  alignItems: 'center',
  gap: '6px',
  fontSize: '14px'
};

const closeBtnStyle = {
  background: 'none',
  border: 'none',
  cursor: 'pointer',
  color: '#64748b'
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
  cursor: 'pointer',
  fontWeight: '500',
  color: '#334155'
};

const srsControlsStyle = {
  display: 'flex',
  justifyContent: 'center',
  alignItems: 'center',
  width: '100%',
  gap: '12px'
};

const srsBtnStyle = {
  padding: '10px 16px',
  border: 'none',
  borderRadius: '6px',
  color: 'white',
  fontWeight: '600',
  cursor: 'pointer',
  fontSize: '14px',
  flex: 1,
  boxShadow: '0 2px 4px rgba(0,0,0,0.1)'
};
