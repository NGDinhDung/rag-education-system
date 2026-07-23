from datetime import datetime
from typing import List, Optional
from pydantic import BaseModel


class FlashcardBase(BaseModel):
    front: str
    back: str

class FlashcardCreate(FlashcardBase):
    pass

class FlashcardResponse(FlashcardBase):
    id: int
    set_id: int
    interval: int
    repetition: int
    ease_factor: float
    next_review_date: datetime

    class Config:
        orm_mode = True
        from_attributes = True

class FlashcardReviewRequest(BaseModel):
    quality: int  # 1 to 5


class FlashcardSetBase(BaseModel):
    title: str

class FlashcardSetCreate(FlashcardSetBase):
    document_id: int

class FlashcardSetResponse(FlashcardSetBase):
    id: int
    document_id: int
    created_at: datetime
    flashcards: List[FlashcardResponse] = []

    class Config:
        orm_mode = True
        from_attributes = True


class QuizOptionBase(BaseModel):
    text: str
    is_correct: bool

class QuizOptionCreate(QuizOptionBase):
    pass

class QuizOptionResponse(QuizOptionBase):
    id: int
    question_id: int

    class Config:
        orm_mode = True
        from_attributes = True


class QuizQuestionBase(BaseModel):
    question: str
    explanation: Optional[str] = None

class QuizQuestionCreate(QuizQuestionBase):
    options: List[QuizOptionCreate]

class QuizQuestionResponse(QuizQuestionBase):
    id: int
    set_id: int
    options: List[QuizOptionResponse] = []

    class Config:
        orm_mode = True
        from_attributes = True


class QuizSetBase(BaseModel):
    title: str

class QuizSetCreate(QuizSetBase):
    document_id: int

class QuizSetResponse(QuizSetBase):
    id: int
    document_id: int
    created_at: datetime
    questions: List[QuizQuestionResponse] = []

    class Config:
        orm_mode = True
        from_attributes = True
