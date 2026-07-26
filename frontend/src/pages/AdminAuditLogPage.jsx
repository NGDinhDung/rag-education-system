import { useEffect, useState } from "react";
import { MessageSquareText, Search, User, FileText, Calendar, ShieldAlert } from "lucide-react";
import axiosClient from "../api/axiosClient";
import AppLayout from "../components/AppLayout";
import "./Dashboard.css"; 

function AdminAuditLogPage() {
  const [conversations, setConversations] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [searchQuery, setSearchQuery] = useState("");
  
  // Selected Conversation details
  const [selectedConv, setSelectedConv] = useState(null);
  const [messages, setMessages] = useState([]);
  const [messagesLoading, setMessagesLoading] = useState(false);

  useEffect(() => {
    fetchConversations();
  }, []);

  const fetchConversations = async () => {
    setLoading(true);
    setError("");
    try {
      const response = await axiosClient.get("/admin/audit/conversations");
      setConversations(response.data);
    } catch (err) {
      setError(
        err.response?.data?.detail || "Không thể tải danh sách cuộc trò chuyện."
      );
    } finally {
      setLoading(false);
    }
  };

  const viewConversation = async (conv) => {
    setSelectedConv(conv);
    setMessagesLoading(true);
    try {
      const response = await axiosClient.get(`/admin/audit/conversations/${conv.id}/messages`);
      setMessages(response.data);
    } catch (err) {
      alert("Lỗi tải tin nhắn: " + (err.response?.data?.detail || ""));
    } finally {
      setMessagesLoading(false);
    }
  };

  const filtered = conversations.filter(c => 
    c.title.toLowerCase().includes(searchQuery.toLowerCase()) ||
    c.user.email.toLowerCase().includes(searchQuery.toLowerCase())
  );

  return (
    <AppLayout>
      <div className="dashboard-page">
        <header className="dashboard-header">
          <div>
            <span className="dashboard-eyebrow">
              <ShieldAlert size={16} /> Kiểm tra hệ thống
            </span>
            <h1>Lịch sử Chat Toàn hệ thống</h1>
            <p>
              Giám sát chất lượng trả lời của AI và xem lại các câu hỏi của người dùng.
            </p>
          </div>
        </header>

        {error && <div className="dashboard-error">{error}</div>}

        <div style={{ display: 'flex', gap: '24px', marginTop: '24px', height: 'calc(100vh - 200px)' }}>
          {/* Cột trái: Danh sách cuộc trò chuyện */}
          <div style={{ width: '350px', display: 'flex', flexDirection: 'column', background: 'white', borderRadius: '12px', border: '1px solid #e2e8f0', overflow: 'hidden' }}>
            <div style={{ padding: '16px', borderBottom: '1px solid #e2e8f0' }}>
              <div style={{ position: 'relative' }}>
                <Search size={16} style={{ position: 'absolute', left: '12px', top: '10px', color: '#94a3b8' }} />
                <input
                  type="text"
                  placeholder="Tìm theo email, tiêu đề..."
                  value={searchQuery}
                  onChange={e => setSearchQuery(e.target.value)}
                  style={{ width: '100%', padding: '8px 12px 8px 36px', borderRadius: '6px', border: '1px solid #cbd5e1' }}
                />
              </div>
            </div>
            
            <div style={{ flex: 1, overflowY: 'auto' }}>
              {loading ? (
                <div style={{ padding: '24px', textAlign: 'center', color: '#64748b' }}>Đang tải...</div>
              ) : filtered.length === 0 ? (
                <div style={{ padding: '24px', textAlign: 'center', color: '#64748b' }}>Không có cuộc trò chuyện nào.</div>
              ) : (
                filtered.map(conv => (
                  <div 
                    key={conv.id} 
                    onClick={() => viewConversation(conv)}
                    style={{ 
                      padding: '16px', 
                      borderBottom: '1px solid #f1f5f9', 
                      cursor: 'pointer',
                      background: selectedConv?.id === conv.id ? '#eff6ff' : 'transparent',
                      borderLeft: selectedConv?.id === conv.id ? '3px solid #3b82f6' : '3px solid transparent'
                    }}
                  >
                    <div style={{ fontWeight: '600', fontSize: '14px', color: '#0f172a', marginBottom: '4px' }}>
                      {conv.title}
                    </div>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '6px', fontSize: '12px', color: '#64748b', marginBottom: '4px' }}>
                      <User size={12} /> {conv.user.email}
                    </div>
                    <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '11px', color: '#94a3b8' }}>
                      <span>{conv.message_count} tin nhắn</span>
                      <span>{new Date(conv.updated_at).toLocaleDateString('vi-VN')}</span>
                    </div>
                  </div>
                ))
              )}
            </div>
          </div>

          {/* Cột phải: Khung chat chi tiết */}
          <div style={{ flex: 1, display: 'flex', flexDirection: 'column', background: 'white', borderRadius: '12px', border: '1px solid #e2e8f0', overflow: 'hidden' }}>
            {selectedConv ? (
              <>
                <div style={{ padding: '20px', borderBottom: '1px solid #e2e8f0', background: '#f8fafc' }}>
                  <h2 style={{ fontSize: '18px', margin: '0 0 8px 0', color: '#0f172a' }}>{selectedConv.title}</h2>
                  <div style={{ display: 'flex', gap: '16px', fontSize: '13px', color: '#64748b' }}>
                    <span style={{ display: 'flex', alignItems: 'center', gap: '4px' }}><User size={14}/> {selectedConv.user.full_name}</span>
                    <span style={{ display: 'flex', alignItems: 'center', gap: '4px' }}><Calendar size={14}/> {new Date(selectedConv.created_at).toLocaleString('vi-VN')}</span>
                  </div>
                </div>
                
                <div style={{ flex: 1, overflowY: 'auto', padding: '24px', background: '#f8fafc' }}>
                  {messagesLoading ? (
                    <div style={{ textAlign: 'center', color: '#64748b' }}>Đang tải tin nhắn...</div>
                  ) : messages.length === 0 ? (
                    <div style={{ textAlign: 'center', color: '#64748b' }}>Chưa có tin nhắn nào.</div>
                  ) : (
                    <div style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
                      {messages.map((msg, idx) => {
                        const isUser = msg.role === 'user';
                        return (
                          <div key={msg.id} style={{
                            alignSelf: isUser ? 'flex-end' : 'flex-start',
                            maxWidth: '80%',
                            background: isUser ? '#3b82f6' : 'white',
                            color: isUser ? 'white' : '#0f172a',
                            padding: '12px 16px',
                            borderRadius: '12px',
                            border: isUser ? 'none' : '1px solid #e2e8f0',
                            boxShadow: '0 1px 2px rgba(0,0,0,0.05)'
                          }}>
                            {/* Nguồn */}
                            {!isUser && msg.sources && msg.sources.length > 0 && (
                              <div style={{ display: 'flex', flexWrap: 'wrap', gap: '8px', marginBottom: '12px' }}>
                                {msg.sources.map(src => (
                                  <span key={src.id} style={{ fontSize: '11px', background: '#f1f5f9', color: '#475569', padding: '4px 8px', borderRadius: '4px' }}>
                                    Nguồn {src.source_number} {src.vector_id?.startsWith('web-') ? '(Web)' : `(${(src.score * 100).toFixed(1)}%)`}
                                  </span>
                                ))}
                              </div>
                            )}
                            <div style={{ whiteSpace: 'pre-wrap', fontSize: '14px', lineHeight: '1.5' }}>
                              {msg.content}
                            </div>
                          </div>
                        );
                      })}
                    </div>
                  )}
                </div>
              </>
            ) : (
              <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', height: '100%', color: '#94a3b8' }}>
                <MessageSquareText size={48} style={{ marginBottom: '16px', opacity: 0.5 }} />
                <p>Chọn một cuộc trò chuyện để xem chi tiết</p>
              </div>
            )}
          </div>
        </div>

      </div>
    </AppLayout>
  );
}

export default AdminAuditLogPage;
