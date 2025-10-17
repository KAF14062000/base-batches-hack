import { NavLink, useNavigate } from "react-router-dom";
import { useEffect, useState } from "react";
import { useApp } from "../state/AppContext.jsx";

const navItems = [
  { to: "/upload", label: "Upload" },
  { to: "/dashboard", label: "Dashboard" },
  { to: "/deals", label: "Deals" },
];

export default function AppShell({ children }) {
  const { currentGroupId, setCurrentGroupId } = useApp();
  const [inputGroupId, setInputGroupId] = useState(currentGroupId ?? "");
  const navigate = useNavigate();

  useEffect(() => {
    setInputGroupId(currentGroupId ?? "");
  }, [currentGroupId]);

  function handleGroupChange(event) {
    setInputGroupId(event.target.value);
  }

  function handleGroupSubmit(event) {
    event.preventDefault();
    if (!inputGroupId) return;
    setCurrentGroupId(inputGroupId);
    navigate(`/group/${inputGroupId}`);
  }

  return (
    <div>
      <header
        style={{
          background: "rgba(255,255,255,0.85)",
          backdropFilter: "blur(12px)",
          borderBottom: "1px solid #e5e7eb",
        }}
      >
        <div
          className="container"
          style={{
            display: "flex",
            alignItems: "center",
            gap: "1.5rem",
            justifyContent: "space-between",
            flexWrap: "wrap",
          }}
        >
          <div style={{ display: "flex", alignItems: "center", gap: "1rem" }}>
            <span
              style={{
                fontWeight: 800,
                fontSize: "1.25rem",
                color: "#0b76ff",
              }}
            >
              SplitBase
            </span>
            <nav style={{ display: "flex", gap: "1rem" }}>
              {navItems.map((item) => (
                <NavLink
                  key={item.to}
                  to={item.to}
                  className={({ isActive }) =>
                    isActive ? "tag" : "nav-link"
                  }
                  style={({ isActive }) => ({
                    fontWeight: 600,
                    color: isActive ? "#0b76ff" : "#475569",
                  })}
                >
                  {item.label}
                </NavLink>
              ))}
            </nav>
          </div>
          <form
            onSubmit={handleGroupSubmit}
            style={{ display: "flex", gap: "0.5rem", alignItems: "center" }}
          >
            <input
              className="input"
              value={inputGroupId}
              onChange={handleGroupChange}
              placeholder="Group ID"
              style={{ width: "200px" }}
            />
            <button type="submit" className="btn btn-secondary">
              Load Group
            </button>
          </form>
        </div>
      </header>
      <main className="container" style={{ marginTop: "2rem" }}>
        {children}
      </main>
    </div>
  );
}
