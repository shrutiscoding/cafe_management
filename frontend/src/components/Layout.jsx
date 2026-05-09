import React from "react";
import Topbar from "./Topbar";
import Sidebar from "./Sidebar";
import "../styles/layout.css";

const Layout = ({ children }) => {
  return (
    <div className="layout">

      <Sidebar />
      <Topbar />

      <div className="main-content">
        {children}
      </div>

    </div>
  );
};

export default Layout;