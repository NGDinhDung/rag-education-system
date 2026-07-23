import React, { useState } from 'react';
import { X, CheckCircle, XCircle } from 'lucide-react';

export default function QuizViewer({ quizzes, onClose }) {
  const [currentIndex, setCurrentIndex] = useState(0);
  const [selectedAnswer, setSelectedAnswer] = useState(null);
  const [score, setScore] = useState(0);
  const [showResults, setShowResults] = useState(false);

  if (!quizzes || quizzes.length === 0) {
    return (
      <div style={overlayStyle}>
        <div style={contentStyle}>
          <header style={headerStyle}>
            <h2>Quiz</h2>
            <button onClick={onClose} style={closeBtnStyle}><X size={20} /></button>
          </header>
          <div style={bodyStyle}>
            <p>Không có quiz nào.</p>
          </div>
        </div>
      </div>
    );
  }

  const currentQuiz = quizzes[currentIndex];

  const handleSelect = (optionKey) => {
    if (selectedAnswer !== null) return; // Prevent changing answer
    setSelectedAnswer(optionKey);
    if (optionKey === currentQuiz.correct_answer || optionKey === currentQuiz.correctAnswer) {
      setScore(prev => prev + 1);
    }
  };

  const handleNext = () => {
    if (currentIndex < quizzes.length - 1) {
      setCurrentIndex(prev => prev + 1);
      setSelectedAnswer(null);
    } else {
      setShowResults(true);
    }
  };

  if (showResults) {
    return (
      <div style={overlayStyle}>
        <div style={contentStyle}>
          <header style={headerStyle}>
            <h2>Kết quả Quiz</h2>
            <button onClick={onClose} style={closeBtnStyle}><X size={20} /></button>
          </header>
          <div style={{...bodyStyle, textAlign: 'center'}}>
            <h1 style={{fontSize: '48px', color: '#2563eb', margin: '20px 0'}}>{score} / {quizzes.length}</h1>
            <p style={{fontSize: '18px', marginBottom: '30px'}}>
              Bạn đã hoàn thành bài quiz!
            </p>
            <button 
              onClick={onClose}
              style={{...primaryBtnStyle, width: 'auto'}}
            >
              Đóng
            </button>
          </div>
        </div>
      </div>
    );
  }

  // Handle formats like { A: "...", B: "..." } or array of options
  const options = currentQuiz.options || {};
  const isArrayOptions = Array.isArray(options);
  const optionEntries = isArrayOptions ? options.map((opt, i) => [String.fromCharCode(65+i), opt]) : Object.entries(options);
  const correctAns = currentQuiz.correct_answer || currentQuiz.correctAnswer;

  return (
    <div style={overlayStyle}>
      <div style={contentStyle}>
        <header style={headerStyle}>
          <h2>Quiz ({currentIndex + 1}/{quizzes.length})</h2>
          <button onClick={onClose} style={closeBtnStyle}><X size={20} /></button>
        </header>
        
        <div style={bodyStyle}>
          <h3 style={questionStyle}>{currentQuiz.question}</h3>
          
          <div style={optionsContainerStyle}>
            {optionEntries.map(([key, value]) => {
              const isSelected = selectedAnswer === key;
              const isCorrect = key === correctAns;
              const showCorrectness = selectedAnswer !== null;
              
              let bg = '#f8fafc';
              let border = '1px solid #e2e8f0';
              if (showCorrectness) {
                if (isCorrect) {
                  bg = '#dcfce3';
                  border = '1px solid #22c55e';
                } else if (isSelected && !isCorrect) {
                  bg = '#fee2e2';
                  border = '1px solid #ef4444';
                }
              } else if (isSelected) {
                bg = '#e0f2fe';
                border = '1px solid #38bdf8';
              }

              return (
                <button 
                  key={key}
                  onClick={() => handleSelect(key)}
                  style={{...optionBtnStyle, backgroundColor: bg, border: border}}
                  disabled={selectedAnswer !== null}
                >
                  <span style={optionKeyStyle}>{key}</span>
                  <span style={{flex: 1, textAlign: 'left'}}>{value}</span>
                  {showCorrectness && isCorrect && <CheckCircle size={20} color="#22c55e" />}
                  {showCorrectness && isSelected && !isCorrect && <XCircle size={20} color="#ef4444" />}
                </button>
              );
            })}
          </div>

          {selectedAnswer !== null && (
            <div style={explanationStyle}>
              <strong>Giải thích:</strong> {currentQuiz.explanation || "Không có giải thích"}
            </div>
          )}

          {selectedAnswer !== null && (
            <button 
              onClick={handleNext}
              style={primaryBtnStyle}
            >
              {currentIndex < quizzes.length - 1 ? 'Câu tiếp theo' : 'Xem kết quả'}
            </button>
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
  boxShadow: '0 4px 6px rgba(0,0,0,0.1)',
  overflow: 'hidden' // So inner scroll works
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
  overflowY: 'auto'
};

const questionStyle = {
  fontSize: '18px',
  marginBottom: '24px',
  lineHeight: '1.5'
};

const optionsContainerStyle = {
  display: 'flex',
  flexDirection: 'column',
  gap: '12px',
  marginBottom: '24px'
};

const optionBtnStyle = {
  display: 'flex',
  alignItems: 'center',
  padding: '16px',
  borderRadius: '8px',
  cursor: 'pointer',
  transition: 'background-color 0.2s',
  fontSize: '16px',
  gap: '12px'
};

const optionKeyStyle = {
  fontWeight: 'bold',
  background: 'rgba(0,0,0,0.05)',
  width: '28px',
  height: '28px',
  display: 'flex',
  alignItems: 'center',
  justifyContent: 'center',
  borderRadius: '4px'
};

const explanationStyle = {
  padding: '16px',
  backgroundColor: '#f1f5f9',
  borderRadius: '8px',
  marginBottom: '24px',
  lineHeight: '1.5'
};

const primaryBtnStyle = {
  width: '100%',
  padding: '12px',
  backgroundColor: '#2563eb',
  color: 'white',
  border: 'none',
  borderRadius: '6px',
  fontSize: '16px',
  cursor: 'pointer'
};
