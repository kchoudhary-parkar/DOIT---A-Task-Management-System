import React from "react";
import { NavLink } from "react-router-dom";

const AppSidebar = ({ user, navLinks, sidebarOpen, setSidebarOpen, logout, onPrefetchRoute }) => {
  const handleNavClick = () => {
    if (typeof window !== "undefined" && window.innerWidth <= 992) {
      setSidebarOpen(false);
    }
  };

  const prefetchRoute = (path) => {
    if (typeof onPrefetchRoute === "function") {
      onPrefetchRoute(path);
    }
  };

  return (
    <>
      <div
        className={`sidebar-overlay${sidebarOpen ? " active" : ""}`}
        onClick={() => setSidebarOpen(false)}
      />

      <aside className={`app-sidebar ${sidebarOpen ? "expanded" : "collapsed"}`}>
        <div className="sidebar-header">
          <div className="sidebar-brand">
            <span className="sidebar-brand-name">DOIT</span>
          </div>

          <button
            className="sidebar-toggle-btn"
            onClick={() => setSidebarOpen((prev) => !prev)}
            aria-label={sidebarOpen ? "Collapse sidebar" : "Expand sidebar"}
            title={sidebarOpen ? "Collapse sidebar" : "Expand sidebar"}
          >
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
              <path d="M4 6h16M4 12h16M4 18h16" />
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
            <NavLink
              key={link.path}
              to={link.path}
              end={link.path === "/"}
              className={({ isActive }) =>
                `sidebar-nav-link${isActive ? " active" : ""}`
              }
              onClick={() => {
                prefetchRoute(link.path);
                handleNavClick();
              }}
              onMouseDown={() => prefetchRoute(link.path)}
              onMouseEnter={() => prefetchRoute(link.path)}
              onFocus={() => prefetchRoute(link.path)}
              onTouchStart={() => prefetchRoute(link.path)}
            >
              <span className="sidebar-nav-icon">{link.icon}</span>
              <span className="sidebar-nav-label">{link.label}</span>
            </NavLink>
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
            <span className="sidebar-logout-text">Logout</span>
          </button>
        </div>
      </aside>
    </>
  );
};

export default AppSidebar;
