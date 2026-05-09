import React, { useEffect, useRef, useState } from "react";
import Layout from "../components/Layout";
import "../styles/orders.css";

const Orders = () => {
  const role = localStorage.getItem("role");
  const userId = localStorage.getItem("userId");

  const [orders, setOrders] = useState([]);
  const [kitchenMode, setKitchenMode] = useState(false);
  const [soundEnabled, setSoundEnabled] = useState(false);

  const prevLastIdRef = useRef(null);
  const audioRef = useRef(null);

  // ================= ENABLE SOUND AFTER USER CLICK =================
  useEffect(() => {
    const enableSound = () => {
      setSoundEnabled(true);
      document.removeEventListener("click", enableSound);
    };

    document.addEventListener("click", enableSound);

    return () => document.removeEventListener("click", enableSound);
  }, []);

  // ================= FETCH =================
  const fetchOrders = async () => {
    try {
      let url =
        role === "customer"
          ? `http://localhost:5000/api/orders/customer/${userId}`
          : `http://localhost:5000/api/orders`;

      const token = localStorage.getItem("token");

      if (!token) {
        console.log("❌ No token found");
        return;
      }

      const res = await fetch(url, {
        headers: {
          Authorization: `Bearer ${token}`
        }
      });

      if (res.status === 401) {
        console.log("❌ Unauthorized - login again");
        return;
      }

      const data = await res.json();
      const safeData = Array.isArray(data) ? data : [];

      // 🔔 SOUND LOGIC (better than count)
      if (role !== "customer" && soundEnabled && safeData.length > 0) {
        const latestId = safeData[0]?.ID;

        if (prevLastIdRef.current && latestId !== prevLastIdRef.current) {
          console.log("🔔 New order → playing sound");

          audioRef.current.currentTime = 0;
          audioRef.current.play().catch(() => {});
        }

        prevLastIdRef.current = latestId;
      }

      setOrders(safeData);

    } catch (err) {
      console.error("Fetch orders error:", err);
    }
  };

  // ================= AUTO REFRESH =================
  useEffect(() => {
    fetchOrders();
    const interval = setInterval(fetchOrders, 5000);
    return () => clearInterval(interval);
  }, []);

  // ================= STATUS UPDATE =================
  const updateStatus = async (id, status) => {
    try {
      await fetch(`http://localhost:5000/api/orders/status/${id}`, {
        method: "PUT",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${localStorage.getItem("token")}`
        },
        body: JSON.stringify({ status })
      });

      fetchOrders();

    } catch (err) {
      console.error("Status update error:", err);
    }
  };

  // ================= GROUP =================
  const grouped = {
    new: [],
    preparing: [],
    ready: [],
    served: []
  };

  if (Array.isArray(orders)) {
    orders.forEach((o) => {
      const status = o.STATUS?.toLowerCase() || "new";
      if (grouped[status]) grouped[status].push(o);
    });
  }

  // ================= UI =================
  const Content = () => (
    <>
      {/* 🔔 AUDIO (Reliable Source + Fallback) */}
      <audio ref={audioRef} preload="auto">
        <source src="/sounds/preview.mp3" type="audio/mpeg" />
        <source src="https://actions.google.com/sounds/v1/alarms/beep_short.ogg" type="audio/ogg" />
      </audio>

      <div className="orders-header">
        <h2>🍽 Orders Dashboard</h2>

        {role !== "customer" && (
          <>
            <button
              className="kitchen-btn"
              onClick={() => setKitchenMode(!kitchenMode)}
            >
              {kitchenMode ? "Exit Kitchen Mode" : "Kitchen Mode"}
            </button>

            {/* 🔊 Enable Sound Button */}
            {!soundEnabled && (
              <button onClick={() => setSoundEnabled(true)}>
                🔊 Enable Sound
              </button>
            )}
          </>
        )}
      </div>

      <div className={`orders-container ${kitchenMode ? "kitchen" : ""}`}>
        {Object.keys(grouped).map((status) => (
          <div key={status} className="order-column">

            <h3>
              {status.toUpperCase()} ({grouped[status].length})
            </h3>

            {grouped[status].length === 0 ? (
              <p className="empty">—</p>
            ) : (
              grouped[status].map((o) => (
                <div key={o.ID} className="order-card">

                  <p className="order-id">
                    #{o.ID?.slice(0, 6)}
                  </p>

                  <h4>{o.CUSTOMER_NAME}</h4>

                  <p className="price">₹ {o.TOTAL}</p>

                  {/* 📦 ITEMS */}
                  <div className="items">
                    {Array.isArray(o.ITEMS || o.items) &&
                      (o.ITEMS || o.items).map((item, i) => (
                        <div key={i} className="item-row">
                          <span>{item.ITEM_NAME}</span>
                          <span>x{item.QUANTITY}</span>
                        </div>
                      ))}
                  </div>

                  {/* 🔄 ACTIONS */}
                  {role !== "customer" && (
                    <div className="actions">

                      {status === "new" && (
                        <button onClick={() => updateStatus(o.ID, "preparing")}>
                          → Preparing
                        </button>
                      )}

                      {status === "preparing" && (
                        <button onClick={() => updateStatus(o.ID, "ready")}>
                          → Ready
                        </button>
                      )}

                      {status === "ready" && (
                        <button onClick={() => updateStatus(o.ID, "served")}>
                          → Served
                        </button>
                      )}

                    </div>
                  )}

                </div>
              ))
            )}

          </div>
        ))}
      </div>
    </>
  );

  return kitchenMode ? (
    <div className="kitchen-fullscreen">
      <Content />
    </div>
  ) : (
    <Layout>
      <Content />
    </Layout>
  );
};

export default Orders;