import {
  BarChart3,
  FileText,
  LogOut,
  MessageSquareText,
} from "lucide-react";
import { NavLink, useNavigate } from "react-router-dom";

function AppLayout({ children }) {
  const navigate = useNavigate();

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