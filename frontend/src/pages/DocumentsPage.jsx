import { useCallback, useEffect, useState } from "react";
import {
  File,
  FileText,
  LoaderCircle,
  RefreshCw,
  Search,
  Trash2,
  UploadCloud,
} from "lucide-react";

import axiosClient from "../api/axiosClient";
import AppLayout from "../components/AppLayout";
import ConfirmModal from "../components/common/ConfirmModal";
import FlashcardViewer from "../components/study/FlashcardViewer";
import QuizViewer from "../components/study/QuizViewer";


function formatFileSize(size) {
  const bytes = Number(size);

  if (!Number.isFinite(bytes) || bytes <= 0) {
    return "Không xác định";
  }

  const units = ["B", "KB", "MB", "GB"];
  const unitIndex = Math.min(
    Math.floor(Math.log(bytes) / Math.log(1024)),
    units.length - 1
  );

  const value = bytes / 1024 ** unitIndex;

  return `${value.toFixed(unitIndex === 0 ? 0 : 2)} ${units[unitIndex]}`;
}


function getFileIcon(fileType) {
  const normalizedType = String(fileType || "").toLowerCase();

  if (["pdf", "docx", "txt"].includes(normalizedType)) {
    return <FileText size={24} />;
  }

  return <File size={24} />;
}


function DocumentsPage() {
  const [documents, setDocuments] = useState([]);
  const [searchQuery, setSearchQuery] = useState("");
  const [currentPage, setCurrentPage] = useState(1);
  const itemsPerPage = 6;

  const [modalOpen, setModalOpen] = useState(false);
  const [documentToDelete, setDocumentToDelete] = useState(null);

  const [title, setTitle] = useState("");
  const [selectedFile, setSelectedFile] = useState(null);

  const [loadingDocuments, setLoadingDocuments] = useState(true);
  const [uploading, setUploading] = useState(false);
  const [deletingId, setDeletingId] = useState(null);

  const [error, setError] = useState("");
  const [success, setSuccess] = useState("");

  const [generatingStudy, setGeneratingStudy] = useState(null);
  const [flashcards, setFlashcards] = useState(null);
  const [quizzes, setQuizzes] = useState(null);

  const filteredDocuments = documents.filter(doc => 
    doc.title.toLowerCase().includes(searchQuery.toLowerCase())
  );
  
  const totalPages = Math.ceil(filteredDocuments.length / itemsPerPage);
  const paginatedDocuments = filteredDocuments.slice(
    (currentPage - 1) * itemsPerPage,
    currentPage * itemsPerPage
  );

  useEffect(() => {
    setCurrentPage(1);
  }, [searchQuery]);


  const fetchDocuments = useCallback(async () => {
    setLoadingDocuments(true);
    setError("");

    try {
      const response = await axiosClient.get("/documents");

      const responseDocuments =
        response.data?.documents ??
        response.data ??
        [];

      setDocuments(
        Array.isArray(responseDocuments)
          ? responseDocuments
          : []
      );
    } catch (requestError) {
      setError(
        requestError.response?.data?.detail ||
          "Không thể tải danh sách tài liệu."
      );
    } finally {
      setLoadingDocuments(false);
    }
  }, []);


  useEffect(() => {
    fetchDocuments();
  }, [fetchDocuments]);


  const handleFileChange = (event) => {
    const file = event.target.files?.[0] || null;

    setSelectedFile(file);
    setError("");
    setSuccess("");

    if (file && !title.trim()) {
      const titleFromFileName = file.name.replace(
        /\.[^/.]+$/,
        ""
      );

      setTitle(titleFromFileName);
    }
  };


  const handleUpload = async (event) => {
    event.preventDefault();

    setError("");
    setSuccess("");

    if (!title.trim()) {
      setError("Vui lòng nhập tiêu đề tài liệu.");
      return;
    }

    if (!selectedFile) {
      setError("Vui lòng chọn file cần upload.");
      return;
    }

    const extension = selectedFile.name
      .split(".")
      .pop()
      ?.toLowerCase();

    if (!["pdf", "docx", "txt"].includes(extension)) {
      setError("Chỉ hỗ trợ file PDF, DOCX và TXT.");
      return;
    }

    const formData = new FormData();

    formData.append("title", title.trim());
    formData.append("file", selectedFile);

    setUploading(true);

    try {
      await axiosClient.post(
        "/documents/upload",
        formData
      );

      setSuccess(
        "Upload và xử lý tài liệu thành công."
      );

      setTitle("");
      setSelectedFile(null);

      const fileInput =
        document.getElementById("document-file");

      if (fileInput) {
        fileInput.value = "";
      }

      await fetchDocuments();
    } catch (requestError) {
      setError(
        requestError.response?.data?.detail ||
          "Không thể upload tài liệu."
      );
    } finally {
      setUploading(false);
    }
  };


  const handleDeleteClick = (documentItem) => {
    setDocumentToDelete(documentItem);
    setModalOpen(true);
  };

  const confirmDelete = async () => {
    if (!documentToDelete) return;

    setError("");
    setSuccess("");
    setDeletingId(documentToDelete.id);
    const idToDelete = documentToDelete.id;

    try {
      await axiosClient.delete(`/documents/${idToDelete}`);

      setDocuments((currentDocuments) =>
        currentDocuments.filter((item) => item.id !== idToDelete)
      );

      setSuccess("Xóa tài liệu thành công.");
      
      if (paginatedDocuments.length === 1 && currentPage > 1) {
        setCurrentPage(prev => prev - 1);
      }
    } catch (requestError) {
      setError(
        requestError.response?.data?.detail || "Không thể xóa tài liệu."
      );
    } finally {
      setDeletingId(null);
      setModalOpen(false);
      setDocumentToDelete(null);
    }
  };


  const handleGenerateFlashcards = async (docId) => {
    setGeneratingStudy(docId);
    setError("");
    try {
      const response = await axiosClient.post(`/documents/${docId}/flashcards`);
      setFlashcards(response.data.flashcards || response.data);
    } catch (err) {
      setError(err.response?.data?.detail || "Lỗi tạo flashcards.");
    } finally {
      setGeneratingStudy(null);
    }
  };

  const handleGenerateQuiz = async (docId) => {
    setGeneratingStudy(docId);
    setError("");
    try {
      const response = await axiosClient.post(`/documents/${docId}/quizzes`);
      setQuizzes(response.data.questions || response.data);
    } catch (err) {
      setError(err.response?.data?.detail || "Lỗi tạo quiz.");
    } finally {
      setGeneratingStudy(null);
    }
  };


  return (
    <AppLayout>
      <section className="page-header documents-header">
        <div>
          <p className="page-eyebrow">
            Quản lý dữ liệu
          </p>

          <h1>Tài liệu học tập</h1>

          <p>
            Upload PDF, DOCX hoặc TXT để hệ thống đọc,
            chia chunk và lập chỉ mục tìm kiếm.
          </p>
        </div>

        <button
          type="button"
          className="secondary-button"
          onClick={fetchDocuments}
          disabled={loadingDocuments}
        >
          <RefreshCw
            size={18}
            className={
              loadingDocuments ? "spin" : ""
            }
          />

          Làm mới
        </button>
      </section>


      {error && (
        <div className="page-message error-message">
          {error}
        </div>
      )}

      {success && (
        <div className="page-message success-message">
          {success}
        </div>
      )}


      <section className="document-upload-card">
        <div className="upload-card-heading">
          <div className="upload-card-icon">
            <UploadCloud size={26} />
          </div>

          <div>
            <h2>Upload tài liệu mới</h2>
            <p>
              Hệ thống sẽ tự động trích xuất nội dung,
              tạo chunk, embedding và lưu vào ChromaDB.
            </p>
          </div>
        </div>

        <form
          className="document-upload-form"
          onSubmit={handleUpload}
        >
          <label className="form-field">
            <span>Tiêu đề tài liệu</span>

            <input
              type="text"
              value={title}
              onChange={(event) =>
                setTitle(event.target.value)
              }
              placeholder="Ví dụ: Giáo trình thương mại điện tử"
              disabled={uploading}
            />
          </label>

          <label className="form-field">
            <span>Chọn file</span>

            <input
              id="document-file"
              type="file"
              accept=".pdf,.docx,.txt"
              onChange={handleFileChange}
              disabled={uploading}
            />
          </label>

          {selectedFile && (
            <div className="selected-file">
              <FileText size={20} />

              <div>
                <strong>{selectedFile.name}</strong>
                <span>
                  {formatFileSize(selectedFile.size)}
                </span>
              </div>
            </div>
          )}

          <button
            type="submit"
            className="primary-button upload-button"
            disabled={uploading}
          >
            {uploading ? (
              <>
                <LoaderCircle
                  size={19}
                  className="spin"
                />

                Đang upload và xử lý...
              </>
            ) : (
              <>
                <UploadCloud size={19} />
                Upload tài liệu
              </>
            )}
          </button>
        </form>
      </section>


      <section className="documents-section">
        <div className="section-heading">
          <div>
            <h2>Danh sách tài liệu</h2>

            <p>
              Tổng cộng {filteredDocuments.length} tài liệu.
            </p>
          </div>
        </div>

        <div className="search-bar-container">
          <Search size={18} className="search-icon" />
          <input
            type="text"
            className="search-bar-input"
            placeholder="Tìm kiếm tài liệu theo tiêu đề..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
          />
        </div>

        {loadingDocuments ? (
          <div className="documents-loading">
            <LoaderCircle
              size={30}
              className="spin"
            />

            <p>Đang tải danh sách tài liệu...</p>
          </div>
        ) : documents.length === 0 ? (
          <div className="documents-empty">
            <FileText size={42} />

            <h3>Chưa có tài liệu</h3>

            <p>
              Upload tài liệu đầu tiên để bắt đầu hỏi đáp
              bằng hệ thống RAG.
            </p>
          </div>
        ) : (
          <div className="documents-grid">
            {paginatedDocuments.map((documentItem) => (
              <article
                className="document-card"
                key={documentItem.id}
              >
                <div className="document-card-icon">
                  {getFileIcon(
                    documentItem.file_type
                  )}
                </div>

                <div className="document-card-body">
                  <h3>{documentItem.title}</h3>

                  <p className="document-file-name">
                    {documentItem.original_file_name ||
                      documentItem.stored_file_name ||
                      "Không có tên file"}
                  </p>

                  <div className="document-meta">
                    <span>
                      {String(
                        documentItem.file_type || "file"
                      ).toUpperCase()}
                    </span>

                    <span>
                      {formatFileSize(
                        documentItem.file_size
                      )}
                    </span>

                    <span>
                      ID: {documentItem.id}
                    </span>
                  </div>
                </div>

                <div style={{ display: 'flex', gap: '8px', padding: '12px 16px', borderTop: '1px solid #e2e8f0', background: '#f8fafc' }}>
                  <button 
                    onClick={() => handleGenerateFlashcards(documentItem.id)}
                    disabled={generatingStudy === documentItem.id}
                    style={{ flex: 1, padding: '8px', borderRadius: '4px', border: '1px solid #cbd5e1', background: 'white', cursor: 'pointer', fontSize: '13px' }}
                  >
                    {generatingStudy === documentItem.id ? <LoaderCircle size={14} className="spin" style={{marginRight: '4px'}}/> : null}
                    Tạo Flashcards
                  </button>
                  <button 
                    onClick={() => handleGenerateQuiz(documentItem.id)}
                    disabled={generatingStudy === documentItem.id}
                    style={{ flex: 1, padding: '8px', borderRadius: '4px', border: '1px solid #cbd5e1', background: 'white', cursor: 'pointer', fontSize: '13px' }}
                  >
                    {generatingStudy === documentItem.id ? <LoaderCircle size={14} className="spin" style={{marginRight: '4px'}}/> : null}
                    Tạo Quiz
                  </button>
                </div>

                <button
                  type="button"
                  className="delete-document-button"
                  onClick={() => handleDeleteClick(documentItem)}
                  disabled={
                    deletingId === documentItem.id
                  }
                  aria-label={`Xóa ${documentItem.title}`}
                  title="Xóa tài liệu"
                >
                  {deletingId === documentItem.id ? (
                    <LoaderCircle
                      size={19}
                      className="spin"
                    />
                  ) : (
                    <Trash2 size={19} />
                  )}
                </button>
              </article>
            ))}
          </div>
        )}

        {totalPages > 1 && (
          <div className="pagination-container">
            <button
              className="pagination-btn"
              disabled={currentPage === 1}
              onClick={() => setCurrentPage(prev => prev - 1)}
            >
              Trước
            </button>
            <span className="pagination-info">
              Trang {currentPage} / {totalPages}
            </span>
            <button
              className="pagination-btn"
              disabled={currentPage === totalPages}
              onClick={() => setCurrentPage(prev => prev + 1)}
            >
              Sau
            </button>
          </div>
        )}
      </section>

      <ConfirmModal
        isOpen={modalOpen}
        title="Xóa tài liệu"
        message={`Bạn có chắc muốn xóa tài liệu "${documentToDelete?.title}" không? Hành động này không thể hoàn tác.`}
        confirmText="Xóa"
        cancelText="Hủy bỏ"
        onConfirm={confirmDelete}
        onCancel={() => {
          setModalOpen(false);
          setDocumentToDelete(null);
        }}
        variant="danger"
      />

      {flashcards && (
        <FlashcardViewer flashcards={flashcards} onClose={() => setFlashcards(null)} />
      )}

      {quizzes && (
        <QuizViewer quizzes={quizzes} onClose={() => setQuizzes(null)} />
      )}
    </AppLayout>
  );
}


export default DocumentsPage;