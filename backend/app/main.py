from fastapi import Depends, FastAPI, HTTPException
from fastapi.middleware.cors import CORSMiddleware
from fastapi.responses import JSONResponse
from sqlalchemy import text
from sqlalchemy.exc import SQLAlchemyError
from sqlalchemy.orm import Session

import app.models
from app.api.auth import router as auth_router
from app.api.chat import router as chat_router
from app.api.documents import router as documents_router
from app.api.users import router as users_router
from app.config import settings
from app.database import Base, engine, get_db
from app.routers import chat_history
from app.api.dashboard import router as dashboard_router
from app.api.study import router as study_router
# Tạo các bảng chưa tồn tại trong PostgreSQL
Base.metadata.create_all(bind=engine)


app = FastAPI(
    title=settings.app_name,
    description="Hệ thống hỏi đáp tài liệu học tập thông minh",
    version=settings.app_version,
)


# Cho phép frontend React kết nối với backend FastAPI
app.add_middleware(
    CORSMiddleware,
    allow_origins=settings.cors_origins_list,
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)


# Đăng ký router
app.include_router(auth_router)
app.include_router(users_router)
app.include_router(documents_router)
app.include_router(chat_router)
app.include_router(chat_history.router)
app.include_router(dashboard_router)
app.include_router(study_router)

import logging

logger = logging.getLogger(__name__)


@app.exception_handler(Exception)
async def global_exception_handler(request, exc):
    logger.error(
        f"Lỗi không xử lý: {type(exc).__name__}: {exc}"
    )
    return JSONResponse(
        status_code=500,
        content={
            "detail": "Đã xảy ra lỗi hệ thống."
        },
    )


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
def database_health(
    db: Session = Depends(get_db),
):
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