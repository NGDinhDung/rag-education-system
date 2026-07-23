from typing import List
from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.orm import Session
from app.database import get_db
from app.core.dependencies import get_current_user
from app.models.user import User
from app.models.study import FlashcardSet, QuizSet
from app.schemas.study import FlashcardSetResponse, QuizSetResponse
from app.services.study_service import generate_flashcards, generate_quiz

router = APIRouter(prefix="/api/documents", tags=["Study"])

@router.post("/{document_id}/flashcards", response_model=FlashcardSetResponse)
def create_flashcards(document_id: int, db: Session = Depends(get_db), current_user: User = Depends(get_current_user)):
    try:
        fc_set_id = generate_flashcards(db, document_id)
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
        qz_set = db.query(QuizSet).filter(QuizSet.id == qz_set_id).first()
        return qz_set
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))

@router.get("/{document_id}/quizzes", response_model=List[QuizSetResponse])
def get_quizzes(document_id: int, db: Session = Depends(get_db), current_user: User = Depends(get_current_user)):
    qz_sets = db.query(QuizSet).filter(QuizSet.document_id == document_id).all()
    return qz_sets
