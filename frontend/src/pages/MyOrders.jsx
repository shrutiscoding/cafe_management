import React, { useEffect, useState } from "react";
import Layout from "../components/Layout";
import { useNavigate } from "react-router-dom";

const MyOrders = () => {
  const [orders, setOrders] = useState([]);
  const token = localStorage.getItem("token");
  const navigate = useNavigate();

  const fetchOrders = async () => {
    try {
      const res = await fetch("http://localhost:5000/api/orders/my", {
        headers: {
          Authorization: "Bearer " + token,
        },
      });

      const data = await res.json();
      setOrders(data);
    } catch (err) {
      console.log(err);
    }
  };

  useEffect(() => {
    fetchOrders();
  }, []);

  return (
    <Layout>
      <h2>📦 My Orders</h2>

      <table style={tableStyle}>
        <thead>
          <tr>
            <th>Order ID</th>
            <th>Total</th>
            <th>Status</th>
            <th>Date</th>
            <th>Action</th>
          </tr>
        </thead>

        <tbody>
          {orders.map((o) => (
            <tr key={o.ID}>
              <td>{o.ID}</td>
              <td>₹{o.TOTAL}</td>

              <td>
                <span style={{
                  padding: "5px 10px",
                  borderRadius: "10px",
                  background:
                    o.STATUS === "completed" ? "#d4edda" : "#fff3cd",
                  color:
                    o.STATUS === "completed" ? "green" : "orange"
                }}>
                  {o.STATUS}
                </span>
              </td>

              <td>{new Date(o.CREATED_AT).toLocaleDateString()}</td>

              <td>
                <button
                  onClick={() => navigate(`/orders/${o.ID}`)}
                >
                  View
                </button>
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </Layout>
  );
};

const tableStyle = {
  width: "100%",
  borderCollapse: "collapse",
  marginTop: "10px",
};

export default MyOrders;