import {
  LayoutDashboard,
  Search,
  MapPinned,
  Bell,
  Train,
  Activity,
  BrainCircuit,
} from "lucide-react";

function Sidebar({
  activePage,
  setActivePage,
  sidebarOpen,
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
      className={`sidebar ${
        sidebarOpen ? "open" : "collapsed"
      }`}
    >
      {/* BRAND */}
      <div className="brand">

        <div className="brand-icon">
          <Train size={27} />
        </div>

        {sidebarOpen && (
          <div className="brand-text">
            <h2>DynamicTrain</h2>

            <span>
              AI Railway Intelligence
            </span>
          </div>
        )}

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
              className={`nav-item ${
                activePage === item.id
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

      {/* BOTTOM AI CARD */}
      <div className="sidebar-bottom">

        {sidebarOpen && (
          <div className="ai-powered-card">

            <div className="ai-powered-icon">
              <BrainCircuit size={22} />
            </div>

            <div>
              <strong>
                AI Powered
              </strong>

              <span>
                Smart predictions active
              </span>
            </div>

          </div>
        )}

      </div>

    </aside>
  );
}

export default Sidebar;