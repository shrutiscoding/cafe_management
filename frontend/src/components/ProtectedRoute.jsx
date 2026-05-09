import { Navigate, useLocation } from "react-router-dom";

const ProtectedRoute = ({ children, allowedRoles }) => {
  const token = localStorage.getItem("token");
  const role = localStorage.getItem("role");
  const location = useLocation();

  // ❌ Not logged in
  if (!token) {
    return <Navigate to="/" />;
  }

  // ❌ Role not allowed
  if (allowedRoles && !allowedRoles.includes(role)) {
    // 🔁 Smart redirect based on role
    if (role === "customer") {
      return <Navigate to="/customer-dashboard" />;
    } else {
      return <Navigate to="/dashboard" />;
    }
  }

  // ✅ Allowed
  return children;
};

export default ProtectedRoute;