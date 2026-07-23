import { AlertTriangle, X } from "lucide-react";

export default function ConfirmModal({
  isOpen,
  title = "Xác nhận",
  message = "Bạn có chắc chắn muốn thực hiện hành động này?",
  confirmText = "Xác nhận",
  cancelText = "Hủy",
  onConfirm,
  onCancel,
  variant = "danger",
}) {
  if (!isOpen) return null;

  return (
    <div className="confirm-modal-overlay" onClick={onCancel}>
      <div
        className="confirm-modal-container"
        onClick={(e) => e.stopPropagation()}
      >
        <button className="confirm-modal-close" onClick={onCancel}>
          <X size={18} />
        </button>

        <div className={`confirm-modal-icon ${variant}`}>
          <AlertTriangle size={28} />
        </div>

        <h3 className="confirm-modal-title">{title}</h3>
        <p className="confirm-modal-message">{message}</p>

        <div className="confirm-modal-actions">
          <button
            className="confirm-modal-btn cancel"
            onClick={onCancel}
          >
            {cancelText}
          </button>
          <button
            className={`confirm-modal-btn ${variant}`}
            onClick={onConfirm}
          >
            {confirmText}
          </button>
        </div>
      </div>
    </div>
  );
}
