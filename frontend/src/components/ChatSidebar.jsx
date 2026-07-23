import { useEffect, useState } from "react";
import {
  Check,
  LoaderCircle,
  MessageSquare,
  Pencil,
  Plus,
  Trash2,
  X,
} from "lucide-react";

import axiosClient from "../api/axiosClient";
import ConfirmModal from "./common/ConfirmModal";


function ChatSidebar({
  activeSessionId,
  refreshKey,
  onCreateNewChat,
  onSelectSession,
  onDeleteSession,
}) {
  const [sessions, setSessions] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  const [editingSessionId, setEditingSessionId] =
    useState(null);

  const [editingTitle, setEditingTitle] =
    useState("");

  const [savingTitle, setSavingTitle] =
    useState(false);

  const [modalOpen, setModalOpen] = useState(false);
  const [sessionToDelete, setSessionToDelete] = useState(null);


  useEffect(() => {
    const fetchSessions = async () => {
      setLoading(true);
      setError("");

      try {
        const response = await axiosClient.get(
          "/chat/sessions"
        );

        setSessions(
          Array.isArray(response.data)
            ? response.data
            : []
        );
      } catch (requestError) {
        setError(
          requestError.response?.data?.detail ||
            "Không thể tải lịch sử trò chuyện."
        );
      } finally {
        setLoading(false);
      }
    };

    fetchSessions();
  }, [refreshKey]);


  const handleDelete = (event, sessionId) => {
    event.stopPropagation();
    setSessionToDelete(sessionId);
    setModalOpen(true);
  };

  const confirmDelete = async () => {
    if (!sessionToDelete) return;
    const sessionId = sessionToDelete;

    try {
      await axiosClient.delete(
        `/chat/sessions/${sessionId}`
      );

      setSessions((currentSessions) =>
        currentSessions.filter(
          (session) => session.id !== sessionId
        )
      );

      onDeleteSession?.(sessionId);
    } catch (requestError) {
      setError(
        requestError.response?.data?.detail ||
          "Không thể xóa cuộc trò chuyện."
      );
    } finally {
      setModalOpen(false);
      setSessionToDelete(null);
    }
  };


  const startEditing = (
    event,
    session
  ) => {
    event.stopPropagation();

    setEditingSessionId(session.id);
    setEditingTitle(
      session.title || "Cuộc trò chuyện mới"
    );
  };


  const cancelEditing = (event) => {
    event?.stopPropagation();

    setEditingSessionId(null);
    setEditingTitle("");
  };


  const saveTitle = async (
    event,
    sessionId
  ) => {
    event?.stopPropagation();

    const cleanedTitle =
      editingTitle.trim();

    if (!cleanedTitle || savingTitle) {
      return;
    }

    setSavingTitle(true);
    setError("");

    try {
      const response = await axiosClient.patch(
        `/chat/sessions/${sessionId}`,
        {
          title: cleanedTitle,
        }
      );

      setSessions((currentSessions) =>
        currentSessions.map((session) =>
          session.id === sessionId
            ? {
                ...session,
                title:
                  response.data?.title ||
                  cleanedTitle,
              }
            : session
        )
      );

      setEditingSessionId(null);
      setEditingTitle("");
    } catch (requestError) {
      setError(
        requestError.response?.data?.detail ||
          "Không thể đổi tên cuộc trò chuyện."
      );
    } finally {
      setSavingTitle(false);
    }
  };


  const handleEditKeyDown = (
    event,
    sessionId
  ) => {
    event.stopPropagation();

    if (event.key === "Enter") {
      event.preventDefault();
      saveTitle(event, sessionId);
    }

    if (event.key === "Escape") {
      cancelEditing(event);
    }
  };


  return (
    <aside className="chat-sidebar">
      <button
        type="button"
        className="new-chat-button"
        onClick={onCreateNewChat}
      >
        <Plus size={18} />
        Cuộc trò chuyện mới
      </button>


      <div className="chat-sidebar-heading">
        <span>Lịch sử trò chuyện</span>
      </div>


      {error && (
        <div className="sidebar-error">
          {error}
        </div>
      )}


      <div className="chat-session-list">
        {loading ? (
          <div className="sidebar-loading">
            <LoaderCircle
              size={18}
              className="spin"
            />

            Đang tải...
          </div>
        ) : sessions.length === 0 ? (
          <div className="sidebar-empty">
            Chưa có cuộc trò chuyện nào.
          </div>
        ) : (
          sessions.map((session) => {
            const isEditing =
              editingSessionId === session.id;

            return (
              <div
                key={session.id}
                role="button"
                tabIndex={0}
                className={`chat-session-item ${
                  Number(activeSessionId) ===
                  Number(session.id)
                    ? "active"
                    : ""
                }`}
                onClick={() => {
                  if (!isEditing) {
                    onSelectSession(session.id);
                  }
                }}
                onKeyDown={(event) => {
                  if (
                    event.key === "Enter" &&
                    !isEditing
                  ) {
                    onSelectSession(session.id);
                  }
                }}
              >
                <MessageSquare size={17} />


                {isEditing ? (
                  <input
                    className="session-title-input"
                    value={editingTitle}
                    onChange={(event) =>
                      setEditingTitle(
                        event.target.value
                      )
                    }
                    onClick={(event) =>
                      event.stopPropagation()
                    }
                    onKeyDown={(event) =>
                      handleEditKeyDown(
                        event,
                        session.id
                      )
                    }
                    autoFocus
                    maxLength={255}
                  />
                ) : (
                  <span
                    className="session-title"
                    title={session.title}
                  >
                    {session.title ||
                      "Cuộc trò chuyện mới"}
                  </span>
                )}


                <div className="session-actions">
                  {isEditing ? (
                    <>
                      <button
                        type="button"
                        className="session-action-button save"
                        title="Lưu tên"
                        disabled={savingTitle}
                        onClick={(event) =>
                          saveTitle(
                            event,
                            session.id
                          )
                        }
                      >
                        {savingTitle ? (
                          <LoaderCircle
                            size={15}
                            className="spin"
                          />
                        ) : (
                          <Check size={15} />
                        )}
                      </button>

                      <button
                        type="button"
                        className="session-action-button cancel"
                        title="Hủy"
                        onClick={cancelEditing}
                      >
                        <X size={15} />
                      </button>
                    </>
                  ) : (
                    <>
                      <button
                        type="button"
                        className="session-action-button edit"
                        title="Đổi tên"
                        onClick={(event) =>
                          startEditing(
                            event,
                            session
                          )
                        }
                      >
                        <Pencil size={15} />
                      </button>

                      <button
                        type="button"
                        className="session-action-button delete"
                        title="Xóa cuộc trò chuyện"
                        onClick={(event) =>
                          handleDelete(
                            event,
                            session.id
                          )
                        }
                      >
                        <Trash2 size={15} />
                      </button>
                    </>
                  )}
                </div>
              </div>
            );
          })
        )}
      </div>

      <ConfirmModal
        isOpen={modalOpen}
        title="Xóa cuộc trò chuyện"
        message="Bạn có chắc chắn muốn xóa cuộc trò chuyện này? Hành động này không thể hoàn tác."
        confirmText="Xóa"
        cancelText="Hủy bỏ"
        onConfirm={confirmDelete}
        onCancel={() => {
          setModalOpen(false);
          setSessionToDelete(null);
        }}
        variant="danger"
      />
    </aside>
  );
}


export default ChatSidebar;