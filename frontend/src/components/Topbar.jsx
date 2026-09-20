import {
  Menu,
  Bell,
  ChevronDown,
} from "lucide-react";

function Topbar({
  currentPageTitle,
  setSidebarOpen,
  sidebarOpen,
  setActivePage,
}) {
  return (
    <header className="topbar">

      {/* MENU BUTTON */}
      <button
        className="menu-toggle"
        onClick={() =>
          setSidebarOpen(!sidebarOpen)
        }
      >
        <Menu size={21} />
      </button>

      {/* PAGE NAME */}
      <div className="topbar-page-name">
        <span>Dynamic Train ETA</span>
        <strong>{currentPageTitle}</strong>
      </div>

      {/* RIGHT SECTION */}
      <div className="topbar-right">

        <button
          className="notification-btn"
          onClick={() =>
            setActivePage("alerts")
          }
          aria-label="View notifications"
        >
          <Bell size={20} />
        </button>

        {/* USER PROFILE */}
        <div className="topbar-user-profile">
          <div className="topbar-avatar">
            <span>AT</span>
          </div>
          <div className="topbar-user-info">
            <span className="topbar-user-name">Alex Turner</span>
          </div>
          <ChevronDown size={15} className="topbar-dropdown-arrow" />
        </div>

      </div>

    </header>
  );
}

export default Topbar;