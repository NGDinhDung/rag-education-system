import { useEffect, useState } from "react";
import { Settings, Save, RefreshCw, Cpu, Database } from "lucide-react";
import axiosClient from "../api/axiosClient";
import AppLayout from "../components/AppLayout";
import "./Dashboard.css"; 

function AdminSettingsPage() {
  const [settings, setSettings] = useState({
    rag_min_score: 0.4,
    rag_top_k: 5,
    ollama_temperature: 0.1
  });
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState("");
  const [success, setSuccess] = useState("");

  const fetchSettings = async () => {
    setLoading(true);
    setError("");
    try {
      const response = await axiosClient.get("/admin/settings/config");
      setSettings(response.data);
    } catch (err) {
      setError(
        err.response?.data?.detail || "Không thể tải cấu hình hệ thống."
      );
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchSettings();
  }, []);

  const handleSave = async () => {
    setSaving(true);
    setError("");
    setSuccess("");
    try {
      await axiosClient.put("/admin/settings/config", settings);
      setSuccess("Lưu cấu hình thành công! Các thay đổi đã được áp dụng ngay lập tức.");
    } catch (err) {
      setError(err.response?.data?.detail || "Lỗi khi lưu cấu hình.");
    } finally {
      setSaving(false);
    }
  };

  const handleChange = (key, value) => {
    setSettings(prev => ({
      ...prev,
      [key]: parseFloat(value)
    }));
  };

  return (
    <AppLayout>
      <div className="dashboard-page">
        <header className="dashboard-header">
          <div>
            <span className="dashboard-eyebrow">
              <Settings size={16} /> Cấu hình Hệ thống
            </span>
            <h1>Cài đặt AI & RAG</h1>
            <p>
              Tuỳ chỉnh các thông số của mô hình AI và công cụ tìm kiếm tài liệu.
            </p>
          </div>
          <button
            onClick={handleSave}
            disabled={saving || loading}
            style={{
              padding: '10px 20px',
              backgroundColor: '#3b82f6',
              color: 'white',
              border: 'none',
              borderRadius: '8px',
              fontWeight: '600',
              cursor: (saving || loading) ? 'not-allowed' : 'pointer',
              display: 'flex',
              alignItems: 'center',
              gap: '8px',
              opacity: (saving || loading) ? 0.7 : 1
            }}
          >
            {saving ? <RefreshCw size={18} className="is-spinning" /> : <Save size={18} />}
            {saving ? 'Đang lưu...' : 'Lưu cài đặt'}
          </button>
        </header>

        {error && <div className="dashboard-error">{error}</div>}
        {success && <div style={{ padding: '16px', background: '#dcfce7', color: '#166534', borderRadius: '8px', marginBottom: '24px', border: '1px solid #bbf7d0', fontWeight: '500' }}>{success}</div>}

        {loading ? (
          <div className="dashboard-loading-state">
            <div className="dashboard-spinner"></div>
            <p>Đang tải cấu hình...</p>
          </div>
        ) : (
          <div style={{ display: 'flex', flexDirection: 'column', gap: '24px' }}>
            
            {/* Cấu hình LLM */}
            <div className="dashboard-panel">
              <div className="dashboard-panel-header" style={{ borderBottom: '1px solid #e2e8f0', paddingBottom: '16px', marginBottom: '24px' }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
                  <div style={{ background: '#eff6ff', padding: '10px', borderRadius: '8px', color: '#3b82f6' }}>
                    <Cpu size={24} />
                  </div>
                  <div>
                    <h2 style={{ fontSize: '18px', margin: '0 0 4px 0' }}>Mô hình Ngôn ngữ (LLM)</h2>
                    <p style={{ margin: 0, color: '#64748b', fontSize: '14px' }}>Tuỳ chỉnh cách AI tạo ra câu trả lời.</p>
                  </div>
                </div>
              </div>

              <div style={{ display: 'flex', flexDirection: 'column', gap: '20px', maxWidth: '600px' }}>
                <div>
                  <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '8px' }}>
                    <label style={{ fontWeight: '600', color: '#0f172a' }}>Độ sáng tạo (Temperature)</label>
                    <span style={{ fontWeight: '700', color: '#3b82f6' }}>{settings.ollama_temperature}</span>
                  </div>
                  <input 
                    type="range" 
                    min="0.0" max="1.0" step="0.1" 
                    value={settings.ollama_temperature} 
                    onChange={e => handleChange('ollama_temperature', e.target.value)}
                    style={{ width: '100%', cursor: 'pointer' }}
                  />
                  <p style={{ margin: '8px 0 0 0', fontSize: '13px', color: '#64748b' }}>
                    Chỉ số từ 0.0 đến 1.0. Mức thấp (0.1 - 0.3) giúp câu trả lời chính xác, bám sát tài liệu. Mức cao (0.7 - 1.0) giúp câu trả lời sáng tạo, đa dạng văn phong.
                  </p>
                </div>
              </div>
            </div>

            {/* Cấu hình RAG */}
            <div className="dashboard-panel">
              <div className="dashboard-panel-header" style={{ borderBottom: '1px solid #e2e8f0', paddingBottom: '16px', marginBottom: '24px' }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
                  <div style={{ background: '#fef3c7', padding: '10px', borderRadius: '8px', color: '#d97706' }}>
                    <Database size={24} />
                  </div>
                  <div>
                    <h2 style={{ fontSize: '18px', margin: '0 0 4px 0' }}>Tìm kiếm Thông tin (RAG)</h2>
                    <p style={{ margin: 0, color: '#64748b', fontSize: '14px' }}>Cấu hình công cụ tìm kiếm ngữ nghĩa và vector.</p>
                  </div>
                </div>
              </div>

              <div style={{ display: 'flex', flexDirection: 'column', gap: '32px', maxWidth: '600px' }}>
                <div>
                  <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '8px' }}>
                    <label style={{ fontWeight: '600', color: '#0f172a' }}>Số lượng tài liệu trích xuất tối đa (Top K)</label>
                    <span style={{ fontWeight: '700', color: '#d97706' }}>{settings.rag_top_k} trang</span>
                  </div>
                  <input 
                    type="range" 
                    min="1" max="15" step="1" 
                    value={settings.rag_top_k} 
                    onChange={e => handleChange('rag_top_k', e.target.value)}
                    style={{ width: '100%', cursor: 'pointer' }}
                  />
                  <p style={{ margin: '8px 0 0 0', fontSize: '13px', color: '#64748b' }}>
                    Giới hạn số lượng đoạn tài liệu được đưa cho AI đọc. Số lượng cao giúp AI biết nhiều thông tin hơn nhưng thời gian xử lý sẽ chậm lại.
                  </p>
                </div>

                <div>
                  <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '8px' }}>
                    <label style={{ fontWeight: '600', color: '#0f172a' }}>Điểm chuẩn tin cậy (Min Score)</label>
                    <span style={{ fontWeight: '700', color: '#d97706' }}>{(settings.rag_min_score * 100).toFixed(0)}%</span>
                  </div>
                  <input 
                    type="range" 
                    min="0.1" max="0.9" step="0.05" 
                    value={settings.rag_min_score} 
                    onChange={e => handleChange('rag_min_score', e.target.value)}
                    style={{ width: '100%', cursor: 'pointer' }}
                  />
                  <p style={{ margin: '8px 0 0 0', fontSize: '13px', color: '#64748b' }}>
                    Chỉ chấp nhận các tài liệu có độ khớp lớn hơn điểm này. Nếu quá cao, hệ thống có thể không tìm thấy tài liệu và chuyển sang Web Search. Khuyến nghị: 35% - 50%.
                  </p>
                </div>
              </div>
            </div>

          </div>
        )}
      </div>
    </AppLayout>
  );
}

export default AdminSettingsPage;
