import React, { useEffect, useState } from "react";
import Layout from "../components/Layout";
import axios from "axios";

const CustomerDashboard = () => {
  const [orders, setOrders] = useState([]);
  const [loading, setLoading] = useState(true);

  const token = localStorage.getItem("token");
  const userId = localStorage.getItem("userId");

  useEffect(() => {
    fetchOrders();
  }, []);

  const fetchOrders = async () => {
    try {
      const res = await axios.get(
        `http://localhost:5000/api/orders/customer/${userId}`,
        {
          headers: {
            Authorization: `Bearer ${token}`,
          },
        }
      );

      setOrders(res.data);
    } catch (err) {
      console.error("Error fetching orders", err);
    } finally {
      setLoading(false);
    }
  };

  return (
    <Layout>
      <div style={{ padding: "20px" }}>
        <h2>👋 Welcome to your Dashboard</h2>

        {/* 🔢 STATS */}
        <div style={{ display: "flex", gap: "20px", marginTop: "20px" }}>
          <div className="card">
            <h4>Total Orders</h4>
            <p>{orders.length}</p>
          </div>

          <div className="card">
            <h4>Last Order</h4>
            <p>
              {orders.length > 0
                ? new Date(orders[0].CREATED_AT).toLocaleDateString()
                : "No orders"}
            </p>
          </div>
        </div>

        {/* 📦 RECENT ORDERS */}
        <h3 style={{ marginTop: "30px" }}>Recent Orders</h3>

        {loading ? (
          <p>Loading...</p>
        ) : orders.length === 0 ? (
          <p>No orders found</p>
        ) : (
          <table style={{ width: "100%", marginTop: "10px" }}>
            <thead>
              <tr>
                <th>Order ID</th>
                <th>Total</th>
                <th>Status</th>
                <th>Date</th>
              </tr>
            </thead>
            <tbody>
              {orders.slice(0, 5).map((order) => (
                <tr key={order.ID}>
                  <td>{order.ID}</td>
                  <td>₹{order.TOTAL}</td>
                  <td>{order.STATUS}</td>
                  <td>
                    {new Date(order.CREATED_AT).toLocaleString()}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </div>
    </Layout>
  );
};

export default CustomerDashboard;