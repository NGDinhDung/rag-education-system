import { Navigate } from "react-router-dom";

function isTokenValid() {
  const token = localStorage.getItem("access_token");
  if (!token) return false;

  try {
    const payload = JSON.parse(atob(token.split(".")[1]));
    const expiry = payload.exp * 1000;
    if (Date.now() >= expiry) {
      localStorage.removeItem("access_token");
      localStorage.removeItem("token_type");
      return false;
    }
    return true;
  } catch {
    localStorage.removeItem("access_token");
    localStorage.removeItem("token_type");
    return false;
  }
}

export default function ProtectedRoute({ children }) {
  return isTokenValid() ? children : <Navigate to="/login" />;
}