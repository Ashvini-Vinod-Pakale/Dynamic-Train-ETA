import {
  Menu,
  Bell,
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

        <div className="system-online">
          <span></span>
          System Online
        </div>

        <button
          className="notification-btn"
          onClick={() =>
            setActivePage("alerts")
          }
        >
          <Bell size={20} />
        </button>

      </div>

    </header>
  );
}

export default Topbar;