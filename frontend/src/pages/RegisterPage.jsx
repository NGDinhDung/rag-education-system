import { useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import { Eye, EyeOff } from "lucide-react";

import axiosClient from "../api/axiosClient";

function RegisterPage() {
  const navigate = useNavigate();

  const [form, setForm] = useState({
    full_name: "",
    email: "",
    password: "",
    confirmPassword: "",
  });
  const [showPassword, setShowPassword] = useState(false);
  const [showConfirmPassword, setShowConfirmPassword] = useState(false);

  const getPasswordStrength = (pass) => {
    if (!pass) return { score: 0, label: "", class: "" };
    if (pass.length < 6) return { score: 1, label: "Yếu", class: "weak" };
    if (pass.length < 10 || !/\d/.test(pass)) return { score: 2, label: "Trung bình", class: "medium" };
    return { score: 3, label: "Mạnh", class: "strong" };
  };

  const strength = getPasswordStrength(form.password);

  const [error, setError] = useState("");
  const [success, setSuccess] = useState("");
  const [loading, setLoading] = useState(false);

  const handleChange = (event) => {
    setForm((currentForm) => ({
      ...currentForm,
      [event.target.name]: event.target.value,
    }));
  };

  const handleSubmit = async (event) => {
    event.preventDefault();

    setError("");
    setSuccess("");

    if (form.password !== form.confirmPassword) {
      setError("Mật khẩu xác nhận không khớp.");
      return;
    }

    setLoading(true);

    try {
      await axiosClient.post("/auth/register", form);

      setSuccess("Đăng ký thành công. Đang chuyển đến trang đăng nhập...");

      setTimeout(() => {
        navigate("/login");
      }, 1000);
    } catch (requestError) {
      setError(
        requestError.response?.data?.detail ||
          "Không thể đăng ký tài khoản."
      );
    } finally {
      setLoading(false);
    }
  };

  return (
    <main className="auth-page">
      <section className="auth-card">
        <div className="auth-logo">R</div>

        <h1>Tạo tài khoản</h1>
        <p className="auth-description">
          Đăng ký để quản lý tài liệu và sử dụng hệ thống hỏi đáp RAG.
        </p>

        <form onSubmit={handleSubmit}>
          <label>
            Họ và tên
            <input
              type="text"
              name="full_name"
              value={form.full_name}
              onChange={handleChange}
              placeholder="Nguyễn Văn A"
              required
            />
          </label>

          <label>
            Email
            <input
              type="email"
              name="email"
              value={form.email}
              onChange={handleChange}
              placeholder="example@gmail.com"
              required
            />
          </label>

          <label>
            Mật khẩu
            <div className="password-input-wrapper">
              <input
                type={showPassword ? "text" : "password"}
                name="password"
                value={form.password}
                onChange={handleChange}
                placeholder="Nhập mật khẩu"
                minLength={6}
                required
              />
              <button
                type="button"
                className="password-toggle-btn"
                onClick={() => setShowPassword(!showPassword)}
                tabIndex="-1"
              >
                {showPassword ? <EyeOff size={18} /> : <Eye size={18} />}
              </button>
            </div>
            {form.password && (
              <div className="password-strength">
                <div className="password-strength-bar">
                  <div className={`password-strength-fill ${strength.class}`}></div>
                </div>
                <div className={`password-strength-text ${strength.class}`}>
                  Độ mạnh: {strength.label}
                </div>
              </div>
            )}
          </label>

          <label>
            Xác nhận mật khẩu
            <div className="password-input-wrapper">
              <input
                type={showConfirmPassword ? "text" : "password"}
                name="confirmPassword"
                value={form.confirmPassword}
                onChange={handleChange}
                placeholder="Nhập lại mật khẩu"
                minLength={6}
                required
              />
              <button
                type="button"
                className="password-toggle-btn"
                onClick={() => setShowConfirmPassword(!showConfirmPassword)}
                tabIndex="-1"
              >
                {showConfirmPassword ? <EyeOff size={18} /> : <Eye size={18} />}
              </button>
            </div>
          </label>

          {error && <p className="error-message">{error}</p>}
          {success && <p className="success-message">{success}</p>}

          <button type="submit" disabled={loading}>
            {loading ? "Đang đăng ký..." : "Đăng ký"}
          </button>
        </form>

        <p className="auth-switch">
          Đã có tài khoản? <Link to="/login">Đăng nhập</Link>
        </p>
      </section>
    </main>
  );
}

export default RegisterPage;