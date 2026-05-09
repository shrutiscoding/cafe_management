import React, { useEffect, useState } from "react";
import { FaBell, FaShoppingCart, FaSignOutAlt } from "react-icons/fa";
import { useNavigate } from "react-router-dom";
import "../styles/topbar.css";

const Topbar = () => {
  const navigate = useNavigate();

  const [notifications] = useState(3);
  const [cartCount, setCartCount] = useState(0);

  // ================= LOGOUT =================
  const handleLogout = () => {
    // ✅ clear all auth data
    localStorage.removeItem("token");
    localStorage.removeItem("role");
    localStorage.removeItem("userId");

    // optional: clear everything
    // localStorage.clear();

    navigate("/");
  };

  // ================= FETCH CART COUNT =================
  const fetchCartCount = async () => {
    try {
      const customerId = localStorage.getItem("userId");

      if (!customerId) return;

      const res = await fetch(
        `http://localhost:5000/api/cart/${customerId}`
      );

      const data = await res.json();

      const totalQty = data.reduce((sum, item) => sum + item.QUANTITY, 0);
      const uniqueItems = data.length;
      setCartCount(uniqueItems);
    } catch (err) {
      console.error("Error fetching cart count:", err);
    }
  };

  // ================= EFFECT =================
  useEffect(() => {
    fetchCartCount();

    // 🔥 update when cart changes
    const handleCartUpdate = () => fetchCartCount();
    window.addEventListener("cartUpdated", handleCartUpdate);

    return () => {
      window.removeEventListener("cartUpdated", handleCartUpdate);
    };
  }, []);

  return (
    <div className="topbar">
      <div className="topbar-right">

        {/* 🔔 Notifications */}
        <div
          className="icon-wrapper"
          onClick={() => navigate("/notifications")}
        >
          <FaBell className="icon" />
          {notifications > 0 && (
            <span className="badge">{notifications}</span>
          )}
        </div>

        {/* 🛒 Cart */}
        <div
          className="icon-wrapper"
          onClick={() => navigate("/cart")}
        >
          <FaShoppingCart className="icon" />
          {cartCount > 0 && (
  <span className="badge">{cartCount}</span>
)}
        </div>

        {/* 🚪 Logout */}
        <div
          className="icon-wrapper logout"
          onClick={handleLogout}
          title="Logout"
        >
          <FaSignOutAlt className="icon" />
        </div>

      </div>
    </div>
  );
};

export default Topbar;