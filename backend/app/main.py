from fastapi import Depends, FastAPI, HTTPException
from sqlalchemy import text
from sqlalchemy.exc import SQLAlchemyError
from sqlalchemy.orm import Session

import app.models
from app.api.auth import router as auth_router
from app.api.users import router as users_router
from app.config import settings
from app.database import Base, engine, get_db
from app.api.documents import router as documents_router
# Tạo bảng nếu chưa tồn tại
Base.metadata.create_all(bind=engine)

app = FastAPI(
    title=settings.app_name,
    description="Hệ thống hỏi đáp tài liệu học tập thông minh",
    version=settings.app_version,
)

# Đăng ký router Authentication
app.include_router(auth_router)
app.include_router(users_router)
app.include_router(documents_router)


@app.get("/")
def root():
    return {
        "message": f"{settings.app_name} API is running!"
    }


@app.get("/health")
def health_check():
    return {
        "status": "ok",
        "message": "Backend đang hoạt động bình thường.",
    }


@app.get("/database/health")
def database_health(db: Session = Depends(get_db)):
    try:
        db.execute(text("SELECT 1"))

        return {
            "status": "ok",
            "database": "PostgreSQL",
            "message": "Kết nối database thành công!",
        }

    except SQLAlchemyError as error:
        raise HTTPException(
            status_code=500,
            detail="Không thể kết nối đến PostgreSQL.",
        ) from error