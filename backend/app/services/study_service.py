import json
import random
from typing import List, Dict, Any
from sqlalchemy.orm import Session
from sqlalchemy import func
from app.models.chunk import DocumentChunk
from app.models.document import Document
from app.models.study import FlashcardSet, Flashcard, QuizSet, QuizQuestion, QuizOption
from app.services.llm_service import llm_service

def _extract_list(data: Any) -> List[Dict]:
    if isinstance(data, list):
        return data
    if isinstance(data, dict):
        # Look for a list inside the dict
        for v in data.values():
            if isinstance(v, list):
                return v
        # If it's a single item object
        return [data]
    return []

def generate_flashcards(db: Session, document_id: int) -> int:
    doc = db.query(Document).filter(Document.id == document_id).first()
    if not doc:
        raise ValueError("Document not found")
    
    # Get random chunks for context
    chunks = db.query(DocumentChunk).filter(DocumentChunk.document_id == document_id).order_by(func.random()).limit(10).all()
    context_text = "\n\n".join([chunk.content for chunk in chunks])
    
    prompt = f"""
Dựa vào nội dung tài liệu sau, hãy tạo ra khoảng 20 flashcards (thẻ ghi nhớ) về các khái niệm quan trọng.
Nội dung:
{context_text}

Yêu cầu output PHẢI là một object JSON với cấu trúc:
{{
  "flashcards": [
    {{"front": "Mặt trước (câu hỏi/thuật ngữ)", "back": "Mặt sau (câu trả lời/định nghĩa)"}}
  ]
}}
Chỉ xuất JSON, không xuất văn bản gì thêm.
    """
    
    json_response = llm_service.generate_structured_json(prompt)
    try:
        data = json.loads(json_response)
        items = _extract_list(data)
    except json.JSONDecodeError:
        raise ValueError("LLM did not return valid JSON for flashcards.")
    
    # Create FlashcardSet
    fc_set = FlashcardSet(document_id=document_id, title=f"Flashcards cho {doc.title}")
    db.add(fc_set)
    db.commit()
    db.refresh(fc_set)
    
    for item in items:
        if isinstance(item, dict) and "front" in item and "back" in item:
            fc = Flashcard(set_id=fc_set.id, front=item["front"], back=item["back"])
            db.add(fc)
            
    db.commit()
    return fc_set.id

def generate_quiz(db: Session, document_id: int) -> int:
    doc = db.query(Document).filter(Document.id == document_id).first()
    if not doc:
        raise ValueError("Document not found")
    
    chunks = db.query(DocumentChunk).filter(DocumentChunk.document_id == document_id).order_by(func.random()).limit(10).all()
    context_text = "\n\n".join([chunk.content for chunk in chunks])
    
    prompt = f"""
Dựa vào nội dung tài liệu sau, hãy tạo khoảng 10 câu hỏi trắc nghiệm. Mỗi câu hỏi có 4 lựa chọn, trong đó chỉ có 1 lựa chọn đúng. Kèm theo giải thích tại sao đúng.
Nội dung:
{context_text}

Yêu cầu output PHẢI là một object JSON với cấu trúc:
{{
  "questions": [
    {{
      "question": "Nội dung câu hỏi",
      "explanation": "Giải thích",
      "options": [
        {{"text": "Lựa chọn 1", "is_correct": true}},
        {{"text": "Lựa chọn 2", "is_correct": false}},
        {{"text": "Lựa chọn 3", "is_correct": false}},
        {{"text": "Lựa chọn 4", "is_correct": false}}
      ]
    }}
  ]
}}
Chỉ xuất JSON, không xuất văn bản gì thêm.
    """
    
    json_response = llm_service.generate_structured_json(prompt)
    try:
        data = json.loads(json_response)
        items = _extract_list(data)
    except json.JSONDecodeError:
        raise ValueError("LLM did not return valid JSON for quiz.")
    
    # Create QuizSet
    qz_set = QuizSet(document_id=document_id, title=f"Quiz cho {doc.title}")
    db.add(qz_set)
    db.commit()
    db.refresh(qz_set)
    
    for item in items:
        if isinstance(item, dict) and "question" in item and "options" in item:
            qq = QuizQuestion(
                set_id=qz_set.id,
                question=item["question"],
                explanation=item.get("explanation", "")
            )
            db.add(qq)
            db.commit()
            db.refresh(qq)
            
            for opt in item["options"]:
                qo = QuizOption(
                    question_id=qq.id,
                    text=opt.get("text", ""),
                    is_correct=opt.get("is_correct", False)
                )
                db.add(qo)
                
    db.commit()
    return qz_set.id
