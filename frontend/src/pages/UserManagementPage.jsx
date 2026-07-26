import { useEffect, useState } from "react";
import { Search, ShieldAlert, ShieldCheck, Trash2, User, UserPlus, Eye, X, FileText, MessageSquare, Calendar } from "lucide-react";

import axiosClient from "../api/axiosClient";
import AppLayout from "../components/AppLayout";
import "./Dashboard.css"; 

function UserManagementPage() {
  const [users, setUsers] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [searchQuery, setSearchQuery] = useState("");
  
  // Activity Modal State
  const [selectedUser, setSelectedUser] = useState(null);
  const [activityData, setActivityData] = useState(null);
  const [activityLoading, setActivityLoading] = useState(false);
  const [activityError, setActivityError] = useState("");

  const formatFileSize = (bytes) => {
    if (!bytes) return "0 KB";
    const mb = bytes / (1024 * 1024);
    if (mb >= 1) return mb.toFixed(2) + " MB";
    return (bytes / 1024).toFixed(2) + " KB";
  };

  const fetchUsers = async () => {
    setLoading(true);
    setError("");
    try {
      const response = await axiosClient.get("/users");
      setUsers(response.data);
    } catch (err) {
      setError(
        err.response?.data?.detail || "Không thể tải danh sách người dùng."
      );
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchUsers();
  }, []);

  const toggleUserStatus = async (userId, currentStatus) => {
    try {
      await axiosClient.patch(`/users/${userId}/status`, {
        is_active: !currentStatus,
      });
      fetchUsers();
    } catch (err) {
      alert(err.response?.data?.detail || "Lỗi cập nhật trạng thái");
    }
  };

  const deleteUser = async (userId) => {
    if (!window.confirm("Bạn có chắc chắn muốn xoá người dùng này? Mọi dữ liệu liên quan cũng sẽ bị xoá.")) return;
    try {
      await axiosClient.delete(`/users/${userId}`);
      fetchUsers();
    } catch (err) {
      alert(err.response?.data?.detail || "Lỗi xoá người dùng");
    }
  };

  const promoteToAdmin = async (userId) => {
    if (!window.confirm("CẢNH BÁO: Bạn chuẩn bị cấp quyền Admin cho người này. Họ sẽ có toàn quyền truy cập như bạn. Tiếp tục?")) return;
    try {
      await axiosClient.patch(`/users/${userId}/role`, {
        role: "admin",
      });
      fetchUsers();
    } catch (err) {
      alert(err.response?.data?.detail || "Lỗi cập nhật quyền");
    }
  };

  const demoteToUser = async (userId) => {
    if (!window.confirm("Bạn muốn huỷ quyền Admin của người này?")) return;
    try {
      await axiosClient.patch(`/users/${userId}/role`, {
        role: "user",
      });
      fetchUsers();
    } catch (err) {
      alert(err.response?.data?.detail || "Lỗi hạ quyền");
    }
  };

  const viewUserActivity = async (user) => {
    setSelectedUser(user);
    setActivityLoading(true);
    setActivityError("");
    try {
      const response = await axiosClient.get(`/users/${user.id}/activity`);
      setActivityData(response.data);
    } catch (err) {
      setActivityError(err.response?.data?.detail || "Lỗi lấy dữ liệu hoạt động");
    } finally {
      setActivityLoading(false);
    }
  };

  const closeModal = () => {
    setSelectedUser(null);
    setActivityData(null);
  };

  const filteredUsers = users.filter(
    (u) =>
      u.email.toLowerCase().includes(searchQuery.toLowerCase()) ||
      u.full_name.toLowerCase().includes(searchQuery.toLowerCase())
  );

  return (
    <AppLayout>
      <div className="dashboard-page">
        <header className="dashboard-header">
          <div>
            <span className="dashboard-eyebrow">
              <User size={16} /> Quản trị viên
            </span>
            <h1>Quản lý người dùng</h1>
            <p>
              Xem danh sách, phân quyền và quản lý tài khoản người dùng trong hệ thống.
            </p>
          </div>
        </header>

        {error && <div className="dashboard-error">{error}</div>}

        <div className="dashboard-panel" style={{ marginTop: '24px' }}>
          <div className="dashboard-panel-header" style={{ marginBottom: '20px' }}>
            <div style={{ position: 'relative', width: '300px' }}>
              <Search size={18} style={{ position: 'absolute', left: '12px', top: '10px', color: '#94a3b8' }} />
              <input
                type="text"
                placeholder="Tìm kiếm người dùng..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                style={{ width: '100%', padding: '10px 12px 10px 40px', borderRadius: '8px', border: '1px solid #cbd5e1' }}
              />
            </div>
            <div>
              <span className="dashboard-total-chip" style={{ background: '#f1f5f9', color: '#475569' }}>
                Tổng cộng: {filteredUsers.length} tài khoản
              </span>
            </div>
          </div>

          {loading ? (
            <div className="dashboard-loading-state" style={{ minHeight: '300px' }}>
              <div className="dashboard-spinner"></div>
              <p style={{ marginTop: '16px' }}>Đang tải dữ liệu...</p>
            </div>
          ) : (
            <div style={{ overflowX: 'auto' }}>
              <table style={{ width: '100%', borderCollapse: 'collapse', textAlign: 'left' }}>
                <thead>
                  <tr style={{ borderBottom: '2px solid #e2e8f0', color: '#475569', fontSize: '14px' }}>
                    <th style={{ padding: '12px 16px', fontWeight: '600' }}>ID</th>
                    <th style={{ padding: '12px 16px', fontWeight: '600' }}>Tên người dùng</th>
                    <th style={{ padding: '12px 16px', fontWeight: '600' }}>Email</th>
                    <th style={{ padding: '12px 16px', fontWeight: '600' }}>Vai trò</th>
                    <th style={{ padding: '12px 16px', fontWeight: '600' }}>Trạng thái</th>
                    <th style={{ padding: '12px 16px', fontWeight: '600' }}>Thao tác</th>
                  </tr>
                </thead>
                <tbody>
                  {filteredUsers.length === 0 ? (
                    <tr>
                      <td colSpan="6" style={{ padding: '32px', textAlign: 'center', color: '#64748b' }}>
                        Không tìm thấy người dùng nào.
                      </td>
                    </tr>
                  ) : (
                    filteredUsers.map((user) => (
                      <tr key={user.id} style={{ borderBottom: '1px solid #e2e8f0', fontSize: '14px' }}>
                        <td style={{ padding: '16px' }}>#{user.id}</td>
                        <td style={{ padding: '16px', fontWeight: '500' }}>{user.full_name}</td>
                        <td style={{ padding: '16px', color: '#64748b' }}>{user.email}</td>
                        <td style={{ padding: '16px' }}>
                          <span style={{ 
                            padding: '4px 8px', 
                            borderRadius: '999px', 
                            fontSize: '12px',
                            fontWeight: '600',
                            backgroundColor: user.role === 'admin' ? '#fef08a' : '#f1f5f9',
                            color: user.role === 'admin' ? '#854d0e' : '#475569'
                          }}>
                            {user.role.toUpperCase()}
                          </span>
                        </td>
                        <td style={{ padding: '16px' }}>
                          <span style={{ 
                            padding: '4px 8px', 
                            borderRadius: '999px', 
                            fontSize: '12px',
                            fontWeight: '600',
                            backgroundColor: user.is_active ? '#dcfce7' : '#fee2e2',
                            color: user.is_active ? '#166534' : '#991b1b'
                          }}>
                            {user.is_active ? "Hoạt động" : "Bị khoá"}
                          </span>
                        </td>
                        <td style={{ padding: '16px' }}>
                          <div style={{ display: 'flex', gap: '8px', flexWrap: 'wrap' }}>
                            <button
                              onClick={() => viewUserActivity(user)}
                              style={{ 
                                padding: '6px 12px', 
                                borderRadius: '6px', 
                                border: '1px solid #bfdbfe', 
                                background: '#eff6ff',
                                color: '#1d4ed8',
                                cursor: 'pointer',
                                display: 'flex',
                                alignItems: 'center',
                                gap: '6px',
                              }}
                              title="Xem chi tiết hoạt động"
                            >
                              <Eye size={16} /> Chi tiết
                            </button>
                            {user.role !== 'admin' ? (
                              <button
                                onClick={() => promoteToAdmin(user.id)}
                                style={{ 
                                  padding: '6px 12px', 
                                  borderRadius: '6px', 
                                  border: '1px solid #fef08a', 
                                  background: '#fef9c3',
                                  color: '#a16207',
                                  cursor: 'pointer',
                                  display: 'flex',
                                  alignItems: 'center',
                                  gap: '6px',
                                }}
                                title="Thăng cấp lên Quản trị viên"
                              >
                                <UserPlus size={16} /> Thăng cấp
                              </button>
                            ) : (
                               <button
                                onClick={() => demoteToUser(user.id)}
                                style={{ 
                                  padding: '6px 12px', 
                                  borderRadius: '6px', 
                                  border: '1px solid #cbd5e1', 
                                  background: '#f8fafc',
                                  color: '#475569',
                                  cursor: 'pointer',
                                  display: 'flex',
                                  alignItems: 'center',
                                  gap: '6px',
                                }}
                                title="Hạ cấp xuống Người dùng thường"
                              >
                                <User size={16} /> Hạ cấp
                              </button>
                            )}
                            <button
                              onClick={() => toggleUserStatus(user.id, user.is_active)}
                              style={{ 
                                padding: '6px 12px', 
                                borderRadius: '6px', 
                                border: '1px solid #e2e8f0', 
                                background: 'white',
                                cursor: 'pointer',
                                display: 'flex',
                                alignItems: 'center',
                                gap: '6px',
                              }}
                            >
                              {user.is_active ? <ShieldAlert size={16} color="#ef4444" /> : <ShieldCheck size={16} color="#10b981" />}
                              {user.is_active ? "Khoá" : "Mở"}
                            </button>
                            <button
                              onClick={() => deleteUser(user.id)}
                              style={{ 
                                padding: '6px 12px', 
                                borderRadius: '6px', 
                                border: '1px solid #fee2e2', 
                                background: '#fef2f2',
                                color: '#ef4444',
                                cursor: 'pointer',
                                display: 'flex',
                                alignItems: 'center',
                                gap: '6px',
                              }}
                            >
                              <Trash2 size={16} /> Xoá
                            </button>
                          </div>
                        </td>
                      </tr>
                    ))
                  )}
                </tbody>
              </table>
            </div>
          )}
        </div>
        
        {/* Modal Hoạt động người dùng */}
        {selectedUser && (
          <div style={{
            position: 'fixed', top: 0, left: 0, right: 0, bottom: 0,
            backgroundColor: 'rgba(15, 23, 42, 0.7)',
            display: 'flex', alignItems: 'center', justifyContent: 'center',
            zIndex: 1000, padding: '20px'
          }}>
            <div style={{
              background: 'white', borderRadius: '12px', width: '100%', maxWidth: '800px',
              maxHeight: '90vh', display: 'flex', flexDirection: 'column',
              boxShadow: '0 20px 25px -5px rgba(0, 0, 0, 0.1)'
            }}>
              {/* Modal Header */}
              <div style={{
                padding: '20px 24px', borderBottom: '1px solid #e2e8f0',
                display: 'flex', justifyContent: 'space-between', alignItems: 'center'
              }}>
                <div>
                  <h2 style={{ fontSize: '18px', fontWeight: '600', margin: 0, color: '#0f172a' }}>
                    Chi tiết tài khoản: {selectedUser.full_name}
                  </h2>
                  <p style={{ margin: '4px 0 0 0', fontSize: '14px', color: '#64748b' }}>
                    Email: {selectedUser.email} &bull; Tham gia từ: {new Date(selectedUser.created_at).toLocaleDateString("vi-VN")}
                  </p>
                </div>
                <button onClick={closeModal} style={{
                  background: 'none', border: 'none', cursor: 'pointer', color: '#64748b', padding: '4px'
                }}>
                  <X size={24} />
                </button>
              </div>

              {/* Modal Body */}
              <div style={{ padding: '24px', overflowY: 'auto' }}>
                {activityLoading ? (
                  <div style={{ textAlign: 'center', padding: '40px' }}>
                    <div className="dashboard-spinner" style={{ margin: '0 auto' }}></div>
                    <p style={{ marginTop: '16px', color: '#64748b' }}>Đang tải dữ liệu...</p>
                  </div>
                ) : activityError ? (
                  <div style={{ padding: '16px', background: '#fef2f2', color: '#b91c1c', borderRadius: '8px' }}>
                    {activityError}
                  </div>
                ) : activityData && (
                  <div style={{ display: 'flex', flexDirection: 'column', gap: '24px' }}>
                    
                    {/* Stats Grid */}
                    <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: '16px' }}>
                      <div style={{ background: '#f8fafc', padding: '16px', borderRadius: '8px', border: '1px solid #e2e8f0' }}>
                        <div style={{ display: 'flex', alignItems: 'center', gap: '8px', color: '#64748b', marginBottom: '8px' }}>
                          <FileText size={18} />
                          <span style={{ fontSize: '14px', fontWeight: '500' }}>Tài liệu đã tải lên</span>
                        </div>
                        <div style={{ fontSize: '24px', fontWeight: '700', color: '#0f172a' }}>
                          {activityData.total_documents}
                        </div>
                      </div>
                      <div style={{ background: '#f8fafc', padding: '16px', borderRadius: '8px', border: '1px solid #e2e8f0' }}>
                        <div style={{ display: 'flex', alignItems: 'center', gap: '8px', color: '#64748b', marginBottom: '8px' }}>
                          <MessageSquare size={18} />
                          <span style={{ fontSize: '14px', fontWeight: '500' }}>Số cuộc trò chuyện</span>
                        </div>
                        <div style={{ fontSize: '24px', fontWeight: '700', color: '#0f172a' }}>
                          {activityData.total_conversations}
                        </div>
                      </div>
                      <div style={{ background: '#f8fafc', padding: '16px', borderRadius: '8px', border: '1px solid #e2e8f0' }}>
                        <div style={{ display: 'flex', alignItems: 'center', gap: '8px', color: '#64748b', marginBottom: '8px' }}>
                          <User size={18} />
                          <span style={{ fontSize: '14px', fontWeight: '500' }}>Số câu hỏi AI</span>
                        </div>
                        <div style={{ fontSize: '24px', fontWeight: '700', color: '#0f172a' }}>
                          {activityData.total_questions}
                        </div>
                      </div>
                    </div>

                    <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '24px' }}>
                      {/* Recent Documents */}
                      <div>
                        <h3 style={{ fontSize: '16px', fontWeight: '600', marginBottom: '12px', display: 'flex', alignItems: 'center', gap: '6px' }}>
                          <Calendar size={18} color="#3b82f6" />
                          Tài liệu mới tải lên
                        </h3>
                        <div style={{ background: '#fff', border: '1px solid #e2e8f0', borderRadius: '8px', overflow: 'hidden' }}>
                          {activityData.recent_documents.length === 0 ? (
                            <div style={{ padding: '16px', textAlign: 'center', color: '#94a3b8', fontSize: '14px' }}>
                              Chưa có tài liệu nào
                            </div>
                          ) : (
                            <ul style={{ listStyle: 'none', margin: 0, padding: 0 }}>
                              {activityData.recent_documents.map(doc => (
                                <li key={doc.id} style={{ padding: '12px 16px', borderBottom: '1px solid #f1f5f9', fontSize: '14px' }}>
                                  <div style={{ fontWeight: '500', color: '#1e293b', marginBottom: '4px', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>
                                    {doc.title}
                                  </div>
                                  <div style={{ display: 'flex', justifyContent: 'space-between', color: '#64748b', fontSize: '12px' }}>
                                    <span>{formatFileSize(doc.file_size_bytes)}</span>
                                    <span>{new Date(doc.created_at).toLocaleDateString("vi-VN")}</span>
                                  </div>
                                </li>
                              ))}
                            </ul>
                          )}
                        </div>
                      </div>

                      {/* Recent Questions */}
                      <div>
                        <h3 style={{ fontSize: '16px', fontWeight: '600', marginBottom: '12px', display: 'flex', alignItems: 'center', gap: '6px' }}>
                          <MessageSquare size={18} color="#3b82f6" />
                          Lịch sử Chat gần đây
                        </h3>
                        <div style={{ background: '#fff', border: '1px solid #e2e8f0', borderRadius: '8px', overflow: 'hidden' }}>
                          {activityData.recent_questions.length === 0 ? (
                            <div style={{ padding: '16px', textAlign: 'center', color: '#94a3b8', fontSize: '14px' }}>
                              Chưa có câu hỏi nào
                            </div>
                          ) : (
                            <ul style={{ listStyle: 'none', margin: 0, padding: 0 }}>
                              {activityData.recent_questions.map(msg => (
                                <li key={msg.id} style={{ padding: '12px 16px', borderBottom: '1px solid #f1f5f9', fontSize: '14px' }}>
                                  <div style={{ fontWeight: '500', color: '#1e293b', marginBottom: '4px', display: '-webkit-box', WebkitLineClamp: 2, WebkitBoxOrient: 'vertical', overflow: 'hidden' }}>
                                    "{msg.content}"
                                  </div>
                                  <div style={{ display: 'flex', justifyContent: 'space-between', color: '#64748b', fontSize: '12px' }}>
                                    <span>Phiên: #{msg.conversation_id}</span>
                                    <span>{new Date(msg.created_at).toLocaleString("vi-VN")}</span>
                                  </div>
                                </li>
                              ))}
                            </ul>
                          )}
                        </div>
                      </div>
                    </div>

                  </div>
                )}
              </div>
            </div>
          </div>
        )}
      </div>
    </AppLayout>
  );
}

export default UserManagementPage;
