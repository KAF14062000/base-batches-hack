import { useEffect, useState } from "react";
import { useApp } from "../state/AppContext.jsx";

export default function DealsPage() {
  const { apiBase, recentCategories } = useApp();
  const [deals, setDeals] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  useEffect(() => {
    async function loadDeals() {
      setLoading(true);
      setError(null);
      try {
        const params = new URLSearchParams();
        if (recentCategories?.length) {
          params.set("categories", recentCategories.join(","));
        }
        const response = await fetch(
          `${apiBase}/deals${params.toString() ? `?${params}` : ""}`,
        );
        if (!response.ok) throw new Error("Failed to load deals");
        const data = await response.json();
        setDeals(data);
      } catch (err) {
        setError(err.message);
      } finally {
        setLoading(false);
      }
    }
    loadDeals();
  }, [apiBase, recentCategories]);

  if (loading) {
    return (
      <div className="card">
        <p>Loading curated deals...</p>
      </div>
    );
  }

  if (error) {
    return (
      <div className="card">
        <p style={{ color: "#ef4444" }}>{error}</p>
      </div>
    );
  }

  if (deals.length === 0) {
    return (
      <div className="card">
        <p>No deals right now. Check back soon!</p>
      </div>
    );
  }

  return (
    <div className="card">
      <h2>Smart Deals</h2>
      <p style={{ color: "#64748b" }}>
        Tailored offers based on what your crew spent on recently.
      </p>
      <div className="grid two" style={{ marginTop: "1.5rem" }}>
        {deals.map((deal) => (
          <a
            key={deal.id}
            href={deal.link}
            target="_blank"
            rel="noreferrer"
            style={{
              border: "1px solid #e2e8f0",
              borderRadius: "12px",
              padding: "1rem",
              background: "#f8fafc",
              display: "flex",
              flexDirection: "column",
              gap: "0.5rem",
            }}
          >
            <span className="tag" style={{ alignSelf: "flex-start" }}>
              {deal.category}
            </span>
            <strong>{deal.title}</strong>
            <p style={{ margin: 0, color: "#475569" }}>{deal.description}</p>
          </a>
        ))}
      </div>
    </div>
  );
}
