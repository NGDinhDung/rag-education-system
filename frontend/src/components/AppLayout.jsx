import { useEffect, useState } from "react";
import {
  BarChart3,
  FileText,
  LogOut,
  MessageSquareText,
  Users,
  ShieldAlert,
  Settings,
} from "lucide-react";
import { NavLink, useNavigate } from "react-router-dom";
import axiosClient from "../api/axiosClient";

function AppLayout({ children }) {
  const navigate = useNavigate();
  const [userRole, setUserRole] = useState(null);

  useEffect(() => {
    const fetchUser = async () => {
      try {
        const response = await axiosClient.get("/users/me");
        setUserRole(response.data.role);
      } catch (error) {
        console.error("Lỗi lấy thông tin người dùng", error);
      }
    };
    fetchUser();
  }, []);

  const handleLogout = () => {
    localStorage.removeItem("access_token");
    localStorage.removeItem("token_type");
    navigate("/login");
  };

  return (
    <div className="app-layout">
      <aside className="sidebar">
        <div className="sidebar-brand">
          <div className="sidebar-logo">
            R
          </div>

          <div>
            <strong>RAG Education</strong>

            <span>Trợ lý học tập AI</span>
          </div>
        </div>

        <nav className="sidebar-nav">
          
          {userRole === "admin" && (
            <div style={{ marginBottom: '16px' }}>
              <div style={{ fontSize: '11px', fontWeight: 'bold', color: '#94a3b8', padding: '0 16px', marginBottom: '8px', letterSpacing: '0.05em' }}>
                QUẢN TRỊ VIÊN
              </div>
              <NavLink
                to="/dashboard"
                className={({ isActive }) =>
                  isActive
                    ? "nav-item active"
                    : "nav-item"
                }
              >
                <BarChart3 size={20} />
                Dashboard
              </NavLink>
              <NavLink
                to="/admin/users"
                className={({ isActive }) =>
                  isActive
                    ? "nav-item active"
                    : "nav-item"
                }
              >
                <Users size={20} />
                Quản lý người dùng
              </NavLink>
              <NavLink
                to="/admin/audit"
                className={({ isActive }) =>
                  isActive
                    ? "nav-item active"
                    : "nav-item"
                }
              >
                <ShieldAlert size={20} />
                Lịch sử Chat
              </NavLink>
              <NavLink
                to="/admin/settings"
                className={({ isActive }) =>
                  isActive
                    ? "nav-item active"
                    : "nav-item"
                }
              >
                <Settings size={20} />
                Cài đặt Hệ thống
              </NavLink>
            </div>
          )}

          <div style={{ fontSize: '11px', fontWeight: 'bold', color: '#94a3b8', padding: '0 16px', marginBottom: '8px', letterSpacing: '0.05em' }}>
            HỌC TẬP
          </div>
          <NavLink
            to="/documents"
            className={({ isActive }) =>
              isActive
                ? "nav-item active"
                : "nav-item"
            }
          >
            <FileText size={20} />
            Tài liệu
          </NavLink>

          <NavLink
            to="/chat"
            className={({ isActive }) =>
              isActive
                ? "nav-item active"
                : "nav-item"
            }
          >
            <MessageSquareText size={20} />
            Hỏi đáp RAG
          </NavLink>

        </nav>

        <button
          className="logout-button"
          onClick={handleLogout}
        >
          <LogOut size={20} />
          Đăng xuất
        </button>

      </aside>

      <main className="main-content">
        {children}
      </main>
    </div>
  );
}

export default AppLayout;