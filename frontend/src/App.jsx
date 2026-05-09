import { BrowserRouter, Routes, Route } from "react-router-dom";

import Login from "./pages/Login";
import Register from "./pages/Register";

import Dashboard from "./pages/Dashboard";
import CustomerDashboard from "./pages/CustomerDashboard";
import OrderDetails from "./pages/OrderDetails";

import Inventory from "./pages/Inventory";
import Employees from "./pages/Employees";
import Customers from "./pages/Customers";

import Menu from "./pages/Menu";
import Orders from "./pages/Orders";
import MyOrders from "./pages/MyOrders";

import Payments from "./pages/Payments";
import Profile from "./pages/Profile";
import Cart from "./pages/Cart";

import ProtectedRoute from "./components/ProtectedRoute";

function App() {
  return (
    <BrowserRouter>
      <Routes>

        {/* PUBLIC */}
        <Route path="/" element={<Login />} />
        <Route path="/register" element={<Register />} />

        {/* ADMIN + EMPLOYEE */}
        <Route
          path="/dashboard"
          element={
            <ProtectedRoute allowedRoles={["admin", "employee"]}>
              <Dashboard />
            </ProtectedRoute>
          }
        />

<Route path="/orders/:id" element={
  <ProtectedRoute>
    <OrderDetails />
  </ProtectedRoute>
} />
        <Route
          path="/inventory"
          element={
            <ProtectedRoute allowedRoles={["admin"]}>
              <Inventory />
            </ProtectedRoute>
          }
        />

        <Route
          path="/employees"
          element={
            <ProtectedRoute allowedRoles={["admin"]}>
              <Employees />
            </ProtectedRoute>
          }
        />

        <Route
          path="/customers"
          element={
            <ProtectedRoute allowedRoles={["admin"]}>
              <Customers />
            </ProtectedRoute>
          }
        />

        <Route
          path="/orders"
          element={
            <ProtectedRoute allowedRoles={["admin", "employee"]}>
              <Orders />
            </ProtectedRoute>
          }
        />

        <Route
          path="/payments"
          element={
            <ProtectedRoute allowedRoles={["admin", "employee"]}>
              <Payments />
            </ProtectedRoute>
          }
        />

        {/* CUSTOMER */}
        <Route
          path="/customer-dashboard"
          element={
            <ProtectedRoute allowedRoles={["customer"]}>
              <CustomerDashboard />
            </ProtectedRoute>
          }
        />

        <Route
          path="/my-orders"
          element={
            <ProtectedRoute allowedRoles={["customer"]}>
              <MyOrders />
            </ProtectedRoute>
          }
        />

        {/* COMMON */}
        <Route
          path="/menu"
          element={
            <ProtectedRoute allowedRoles={["admin", "employee", "customer"]}>
              <Menu />
            </ProtectedRoute>
          }
        />

        <Route
          path="/cart"
          element={
            <ProtectedRoute allowedRoles={["admin", "employee","customer"]}>
              <Cart />
            </ProtectedRoute>
          }
        />

        <Route
          path="/profile"
          element={
            <ProtectedRoute allowedRoles={["admin", "employee", "customer"]}>
              <Profile />
            </ProtectedRoute>
          }
        />

      </Routes>
    </BrowserRouter>
  );
}

export default App;