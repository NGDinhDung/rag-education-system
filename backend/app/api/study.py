from typing import List
from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.orm import Session
from app.database import get_db
from app.core.dependencies import get_current_user
from app.models.user import User
from app.models.study import FlashcardSet, QuizSet
from app.schemas.study import FlashcardSetResponse, QuizSetResponse
from app.services.study_service import generate_flashcards, generate_quiz

router = APIRouter(prefix="/documents", tags=["Study"])

@router.post("/{document_id}/flashcards", response_model=FlashcardSetResponse)
def create_flashcards(document_id: int, db: Session = Depends(get_db), current_user: User = Depends(get_current_user)):
    try:
        fc_set_id = generate_flashcards(db, document_id)
        db.expire_all()
        fc_set = db.query(FlashcardSet).filter(FlashcardSet.id == fc_set_id).first()
        return fc_set
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))

@router.get("/{document_id}/flashcards", response_model=List[FlashcardSetResponse])
def get_flashcards(document_id: int, db: Session = Depends(get_db), current_user: User = Depends(get_current_user)):
    fc_sets = db.query(FlashcardSet).filter(FlashcardSet.document_id == document_id).all()
    return fc_sets

@router.post("/{document_id}/quizzes", response_model=QuizSetResponse)
def create_quiz(document_id: int, db: Session = Depends(get_db), current_user: User = Depends(get_current_user)):
    try:
        qz_set_id = generate_quiz(db, document_id)
        db.expire_all()
        qz_set = db.query(QuizSet).filter(QuizSet.id == qz_set_id).first()
        return qz_set
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))

@router.get("/{document_id}/quizzes", response_model=List[QuizSetResponse])
def get_quizzes(document_id: int, db: Session = Depends(get_db), current_user: User = Depends(get_current_user)):
    qz_sets = db.query(QuizSet).filter(QuizSet.document_id == document_id).all()
    return qz_sets

from datetime import datetime, timedelta
from app.schemas.study import FlashcardReviewRequest
from app.models.study import Flashcard

@router.post("/{document_id}/flashcards/{flashcard_id}/review")
def review_flashcard(document_id: int, flashcard_id: int, req: FlashcardReviewRequest, db: Session = Depends(get_db), current_user: User = Depends(get_current_user)):
    fc = db.query(Flashcard).filter(Flashcard.id == flashcard_id).first()
    if not fc:
        raise HTTPException(status_code=404, detail="Flashcard not found")

    q = req.quality
    if q < 1 or q > 5:
        raise HTTPException(status_code=400, detail="Quality must be between 1 and 5")

    # SM-2 algorithm
    if q >= 3:
        if fc.repetition == 0:
            fc.interval = 1
        elif fc.repetition == 1:
            fc.interval = 6
        else:
            fc.interval = round(fc.interval * fc.ease_factor)
        fc.repetition += 1
    else:
        fc.repetition = 0
        fc.interval = 1

    fc.ease_factor = fc.ease_factor + (0.1 - (5 - q) * (0.08 + (5 - q) * 0.02))
    if fc.ease_factor < 1.3:
        fc.ease_factor = 1.3

    fc.next_review_date = datetime.now() + timedelta(days=fc.interval)
    
    db.commit()
    return {"message": "ok", "next_review_date": fc.next_review_date}
