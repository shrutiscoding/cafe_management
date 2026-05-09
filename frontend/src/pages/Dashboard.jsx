import React, { useEffect, useState } from "react";
import Layout from "../components/Layout";
import { useNavigate } from "react-router-dom";

// icons
import {
  FaMoneyBillWave,
  FaShoppingCart,
  FaUsers,
  FaBoxes,
  FaUtensils,
} from "react-icons/fa";

// charts
import {
  LineChart,
  Line,
  XAxis,
  YAxis,
  Tooltip,
  BarChart,
  Bar,
  CartesianGrid,
  ResponsiveContainer,
} from "recharts";

const Dashboard = () => {
  const navigate = useNavigate();
  const role = localStorage.getItem("role");

  const [stats, setStats] = useState({
    revenue: 0,
    todayRevenue: 0,
    totalOrders: 0,
    customers: 0,
    lowStock: 0,
    totalMenus: 0,
    topItems: [],
    recentOrders: [],
    dailyRevenue: [],
  });

  const [loading, setLoading] = useState(true);

  // =========================
  // FETCH DASHBOARD
  // =========================
  useEffect(() => {
    const token = localStorage.getItem("token");

    if (!token) {
      navigate("/");
      return;
    }

    const fetchDashboard = async () => {
      try {
        setLoading(true);

        const res = await fetch("http://localhost:5000/api/dashboard", {
          headers: {
            Authorization: "Bearer " + token,
          },
        });

        if (!res.ok) {
          localStorage.removeItem("token");
          localStorage.removeItem("role");
          navigate("/");
          return;
        }

        const data = await res.json();

        setStats({
          revenue: data.revenue || 0,
          todayRevenue: data.todayRevenue || 0,
          totalOrders: data.totalOrders || 0,
          customers: data.customers || 0,
          lowStock: data.lowStock || 0,
          totalMenus: data.totalMenus || 0,
          topItems: data.topItems || [],
          recentOrders: data.recentOrders || [],
          dailyRevenue: data.dailyRevenue || [],
        });
      } catch (err) {
        console.error("Dashboard error:", err);
      } finally {
        setLoading(false);
      }
    };

    fetchDashboard();
  }, [navigate]);

  // =========================
  // LOADING
  // =========================
  if (loading) {
    return (
      <Layout>
        <h2>Loading dashboard...</h2>
      </Layout>
    );
  }

  // =========================
  // CUSTOMER VIEW
  // =========================
  if (role === "customer") {
    return (
      <Layout>
        <h1 className="page-title">Customer Dashboard</h1>
        <p>Welcome! Browse menu and place orders.</p>
      </Layout>
    );
  }

  // =========================
  // ADMIN / EMPLOYEE VIEW
  // =========================
  return (
    <Layout>
      <h1 className="page-title">
        {role === "admin" && "Admin Dashboard"}
        {role === "employee" && "Employee Dashboard"}
      </h1>

      {/* =========================
          STAT CARDS
      ========================= */}
      <div className="stat-grid">

        <div className="stat-card">
          <FaMoneyBillWave />
          <p>Total Revenue</p>
          <h2>₹{stats.revenue}</h2>
        </div>

        <div className="stat-card">
          <FaMoneyBillWave />
          <p>Today Revenue</p>
          <h2>₹{stats.todayRevenue}</h2>
        </div>

        <div className="stat-card">
          <FaShoppingCart />
          <p>Total Orders</p>
          <h2>{stats.totalOrders}</h2>
        </div>

        <div className="stat-card">
          <FaUsers />
          <p>Customers</p>
          <h2>{stats.customers}</h2>
        </div>

        <div className="stat-card">
          <FaBoxes />
          <p>Low Stock</p>
          <h2>{stats.lowStock}</h2>
        </div>

        <div className="stat-card">
          <FaUtensils />
          <p>Total Menus</p>
          <h2>{stats.totalMenus}</h2>
        </div>

      </div>

      {/* =========================
          CHARTS SECTION
      ========================= */}
      <div className="charts-grid">

        {/* 📈 DAILY REVENUE */}
        <div className="chart-card">
          <h3>Daily Revenue</h3>

          <ResponsiveContainer width="100%" height={300}>
            <LineChart data={stats.dailyRevenue}>
              <CartesianGrid strokeDasharray="3 3" />
              <XAxis dataKey="date" />
              <YAxis />
              <Tooltip />
              <Line type="monotone" dataKey="revenue" stroke="#4f46e5" />
            </LineChart>
          </ResponsiveContainer>
        </div>

        {/* 📊 TOP ITEMS */}
        <div className="chart-card">
          <h3>Top Selling Items</h3>

          <ResponsiveContainer width="100%" height={300}>
            <BarChart data={stats.topItems}>
              <CartesianGrid strokeDasharray="3 3" />
              <XAxis dataKey="NAME" />
              <YAxis />
              <Tooltip />
              <Bar dataKey="QTY" fill="#10b981" />
            </BarChart>
          </ResponsiveContainer>
        </div>

      </div>

      {/* =========================
          RECENT ORDERS
      ========================= */}
      <div className="table-card">
        <h3>Recent Orders</h3>

        <table>
          <thead>
            <tr>
              <th>ID</th>
              <th>Total</th>
              <th>Status</th>
              <th>Date</th>
            </tr>
          </thead>

          <tbody>
            {stats.recentOrders.map((o, i) => (
              <tr key={i}>
                <td>{o[0]}</td>
                <td>₹{o[1]}</td>
                <td>{o[2]}</td>
                <td>{o[3]}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

    </Layout>
  );
};

export default Dashboard;