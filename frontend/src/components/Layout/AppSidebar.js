import React from "react";
import { Link } from "react-router-dom";

const AppSidebar = ({ user, navLinks, sidebarOpen, setSidebarOpen, logout }) => {
  return (
    <>
      <div
        className={`sidebar-overlay${sidebarOpen ? " active" : ""}`}
        onClick={() => setSidebarOpen(false)}
      />

      <aside className={`app-sidebar${sidebarOpen ? " open" : ""}`}>
        <div className="sidebar-header">
          <div className="sidebar-brand">
            <svg
              xmlns="http://www.w3.org/2000/svg"
              fill="none"
              stroke="currentColor"
              strokeWidth="2"
              className="nav-brand-icon"
              viewBox="0 0 24 24"
            >
              <path d="M4 6h16M4 12h16M4 18h16" strokeLinecap="round" />
            </svg>
            <span className="sidebar-brand-name">DOIT</span>
          </div>
          <button className="sidebar-close-btn" onClick={() => setSidebarOpen(false)}>
            <svg
              width="18"
              height="18"
              fill="none"
              stroke="currentColor"
              strokeWidth="2"
              strokeLinecap="round"
              strokeLinejoin="round"
              viewBox="0 0 24 24"
            >
              <line x1="18" y1="6" x2="6" y2="18" />
              <line x1="6" y1="6" x2="18" y2="18" />
            </svg>
          </button>
        </div>

        <div className="sidebar-user">
          <div className="sidebar-avatar">{user.name.charAt(0).toUpperCase()}</div>
          <div className="sidebar-user-info">
            <div className="sidebar-user-name">{user.name}</div>
            <div className="sidebar-user-role">
              {user.role === "super-admin"
                ? "Super Admin"
                : user.role.charAt(0).toUpperCase() + user.role.slice(1)}
            </div>
          </div>
        </div>

        <nav className="sidebar-nav">
          {navLinks.map((link) => (
            <Link
              key={link.path}
              to={link.path}
              className="sidebar-nav-link"
              onClick={() => setSidebarOpen(false)}
            >
              <span className="sidebar-nav-icon">{link.icon}</span>
              <span>{link.label}</span>
            </Link>
          ))}
        </nav>

        <div className="sidebar-footer">
          <button className="sidebar-logout-btn" onClick={logout}>
            <svg
              width="16"
              height="16"
              fill="none"
              stroke="currentColor"
              strokeWidth="2"
              strokeLinecap="round"
              strokeLinejoin="round"
              viewBox="0 0 24 24"
            >
              <path d="M9 21H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h4" />
              <polyline points="16 17 21 12 16 7" />
              <line x1="21" y1="12" x2="9" y2="12" />
            </svg>
            Logout
          </button>
        </div>
      </aside>
    </>
  );
};

export default AppSidebar;
