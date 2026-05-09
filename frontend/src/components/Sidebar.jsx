import React, { useEffect, useState } from "react";
import { useNavigate, useLocation } from "react-router-dom";

const Sidebar = () => {
  const role = localStorage.getItem("role");
  const navigate = useNavigate();
  const location = useLocation();

  const [user, setUser] = useState(null);

  // ✅ Fetch logged-in user
  useEffect(() => {
    fetch("http://localhost:5000/api/customer/profile", {
      headers: {
        Authorization: "Bearer " + localStorage.getItem("token"),
      },
    })
      .then((res) => res.json())
      .then((data) => setUser(data))
      .catch((err) => console.log(err));
  }, []);

  return (
    <div
      className="sidebar"
      style={{ display: "flex", flexDirection: "column", height: "100vh" }}
    >
      {/* TOP SECTION */}
      <div>
        <h3 style={{ marginBottom: "20px", color: "#000000" }}>
          ☕ Artisan Cafe
        </h3>

        {/* ✅ DASHBOARD (FIXED ACTIVE STATE) */}
        <div
          className={`nav-item ${
            location.pathname.includes("dashboard") ? "active" : ""
          }`}
          onClick={() => {
            if (role === "customer") {
              navigate("/customer-dashboard");
            } else {
              navigate("/dashboard");
            }
          }}
        >
          Dashboard
        </div>

        {/* ✅ ADMIN */}
        {role === "admin" && (
          <>
            <div
              className={`nav-item ${
                location.pathname === "/inventory" ? "active" : ""
              }`}
              onClick={() => navigate("/inventory")}
            >
              Inventory
            </div>

            <div
              className={`nav-item ${
                location.pathname === "/employees" ? "active" : ""
              }`}
              onClick={() => navigate("/employees")}
            >
              Employees
            </div>

            <div
              className={`nav-item ${
                location.pathname === "/customers" ? "active" : ""
              }`}
              onClick={() => navigate("/customers")}
            >
              Customers
            </div>
          </>
        )}

        {/* ✅ CUSTOMER (FIXED NAVIGATION) */}
        {role === "customer" && (
          <>
            <div
              className={`nav-item ${
                location.pathname === "/my-orders" ? "active" : ""
              }`}
              onClick={() => navigate("/my-orders")}
            >
              My Orders
            </div>

            <div
              className={`nav-item ${
                location.pathname === "/profile" ? "active" : ""
              }`}
              onClick={() => navigate("/profile")}
            >
              Profile
            </div>
          </>
        )}

        {/* ✅ COMMON */}
        <div
          className={`nav-item ${
            location.pathname === "/menu" ? "active" : ""
          }`}
          onClick={() => navigate("/menu")}
        >
          Menu
        </div>

        {/* ✅ ORDERS (ROLE-BASED) */}
          {(role === "admin" || role === "employee") && (
          <div
            className={`nav-item ${
              location.pathname === "/orders" ? "active" : ""
            }`}
            onClick={() => navigate("/orders")}
          >
          Orders
        </div>
          )}

        {/* ✅ PAYMENTS */}
        {(role === "admin" || role === "employee") && (
          <div
            className={`nav-item ${
              location.pathname === "/payments" ? "active" : ""
            }`}
            onClick={() => navigate("/payments")}
          >
            Payments
          </div>
        )}

        <div className="nav-item">Feedback</div>
      </div>

      {/* 🔥 PROFILE SECTION */}
      <div
        style={{
          marginTop: "auto",
          padding: "12px",
          borderTop: "1px solid #ddd",
          cursor: "pointer",
        }}
        onClick={() => navigate("/profile")}
      >
        {user ? (
          <div style={{ display: "flex", alignItems: "center", gap: "10px" }}>
            {/* Avatar */}
            <div
              style={{
                width: "40px",
                height: "40px",
                borderRadius: "50%",
                background: "#333",
                color: "#fff",
                display: "flex",
                alignItems: "center",
                justifyContent: "center",
                fontWeight: "bold",
              }}
            >
              {user.name?.charAt(0)}
            </div>

            {/* Info */}
            <div>
              <div style={{ fontSize: "14px", fontWeight: "bold" }}>
                {user.name}
              </div>
              <div style={{ fontSize: "12px", color: "#666" }}>
                {user.email}
              </div>
            </div>
          </div>
        ) : (
          <div style={{ fontSize: "12px" }}>Loading profile...</div>
        )}
      </div>
    </div>
  );
};

export default Sidebar;