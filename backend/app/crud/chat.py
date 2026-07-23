from sqlalchemy.orm import Session

from app.models.chat_session import ChatSession


def create_chat_session(db: Session, user_id: int, title: str = "Cuộc trò chuyện mới"):
    session = ChatSession(
        title=title,
        user_id=user_id,
    )

    db.add(session)
    db.commit()
    db.refresh(session)

    return session


def get_chat_sessions(db: Session, user_id: int):
    return (
        db.query(ChatSession)
        .filter(ChatSession.user_id == user_id)
        .order_by(ChatSession.updated_at.desc())
        .all()
    )