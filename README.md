# Hệ thống RAG Education thông minh

Dự án này là một nền tảng hỗ trợ học tập thông minh dựa trên kỹ thuật **RAG** (Retrieval-Augmented Generation). Người dùng có thể tải lên các tài liệu học tập của mình (PDF, DOCX) và đặt câu hỏi trực tiếp với AI. AI sẽ tìm kiếm thông tin trong tài liệu đã tải lên để trả lời một cách chính xác nhất.

## 🌟 Các tính năng nổi bật
- **Upload Tài liệu**: Hỗ trợ chia nhỏ (chunk) và lưu trữ vector vào ChromaDB tự động.
- **Hỏi đáp AI (RAG)**: Chatbot thông minh, tự động truy xuất tài liệu liên quan để trả lời, giảm thiểu "ảo giác" (hallucination) của AI.
- **Quản trị hệ thống (Admin)**: 
  - Xem Dashboard thống kê hệ thống.
  - Quản lý người dùng, Khóa/Mở tài khoản, Cấp quyền Admin.
  - Theo dõi hoạt động (Audit/Activity tracking) của từng người dùng.
- **Giao diện hiện đại**: Sử dụng React (Vite) với thiết kế tối giản, trực quan và các biểu đồ thống kê.

## 🚀 Công nghệ sử dụng
- **Backend**: FastAPI (Python), SQLAlchemy (PostgreSQL), ChromaDB (Vector Database), LangChain (RAG Pipeline).
- **Frontend**: React (Vite), React Router, Lucide Icons, Axios.
- **AI Models**: OpenAI (GPT-4o-mini) hoặc Local LLMs qua Ollama.

## 🛠️ Hướng dẫn Cài đặt

### 1. Backend (FastAPI)
- Cài đặt Python 3.10+
- Tạo môi trường ảo và cài thư viện:
```bash
cd backend
python -m venv .venv
# Kích hoạt venv tuỳ hệ điều hành
.venv\Scripts\activate # (Windows)
pip install -r requirements.txt
```
- Copy file `.env.example` thành `.env` và điền cấu hình Database & API Key.
- Khởi động Backend:
```bash
uvicorn app.main:app --reload
```

### 2. Frontend (React)
- Cài đặt Node.js.
```bash
cd frontend
npm install
npm run dev
```

Truy cập trang web tại: `http://localhost:5173`

---
*Phát triển bởi Nguyễn Đình Dũng.*
