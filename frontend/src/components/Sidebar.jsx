import {
  LayoutDashboard,
  Search,
  MapPinned,
  Bell,
  Train,
  Activity,
} from "lucide-react";
import railLogo from "../assets/raildurdrishti-logo.png";

function Sidebar({
  activePage,
  setActivePage,
  sidebarOpen,
  setSidebarOpen,
}) {
  const navItems = [
    {
      id: "home",
      label: "Home",
      icon: LayoutDashboard,
    },
    {
      id: "search",
      label: "Search Train",
      icon: Search,
    },
    {
      id: "dashboard",
      label: "Dashboard",
      icon: Activity,
    },
    {
      id: "map",
      label: "Live Train Map",
      icon: MapPinned,
    },
    {
      id: "alerts",
      label: "Alerts",
      icon: Bell,
    },
  ];

  return (
    <aside
      className={`sidebar ${sidebarOpen ? "open" : "collapsed"
        }`}
    >
      {/* BRAND */}
      <div className="brand" style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', padding: '24px 10px', marginBottom: '10px', textAlign: 'center' }}>
        <img
          src={railLogo}
          alt="RailDurDrishti Branding"
          style={{
            width: '100%',
            maxWidth: sidebarOpen ? '160px' : '65px',
            height: 'auto',
            objectFit: 'contain',
            transition: 'all 0.3s'
          }}
        />
      </div>

      {/* MENU LABEL */}
      <div className="nav-section-label">
        {sidebarOpen && "MAIN MENU"}
      </div>

      {/* NAVIGATION */}
      <nav className="sidebar-nav">

        {navItems.map((item) => {
          const Icon = item.icon;

          return (
            <button
              key={item.id}
              className={`nav-item ${activePage === item.id
                ? "active"
                : ""
                }`}
              onClick={() =>
                setActivePage(item.id)
              }
            >
              <Icon size={20} />

              {sidebarOpen && (
                <span>
                  {item.label}
                </span>
              )}
            </button>
          );
        })}

      </nav>
    </aside>
  );
}

export default Sidebar;