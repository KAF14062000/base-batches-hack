import { useEffect, useMemo, useState } from "react";
import {
  Chart as ChartJS,
  CategoryScale,
  LinearScale,
  BarElement,
  LineElement,
  PointElement,
  ArcElement,
  Tooltip,
  Legend,
} from "chart.js";
import { Bar, Line, Pie } from "react-chartjs-2";
import { useApp } from "../state/AppContext.jsx";

ChartJS.register(
  CategoryScale,
  LinearScale,
  BarElement,
  LineElement,
  PointElement,
  ArcElement,
  Tooltip,
  Legend,
);

export default function DashboardPage() {
  const { apiBase, currentUser, setRecentCategories } = useApp();
  const [data, setData] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  useEffect(() => {
    async function load() {
      setLoading(true);
      setError(null);
      try {
        const response = await fetch(
          `${apiBase}/users/${currentUser.id}/dashboard`,
        );
        if (!response.ok) {
          throw new Error("Failed to load dashboard data");
        }
        const payload = await response.json();
        setData(payload);
        const categories =
          payload.totalsByCategory
            ?.filter((entry) => entry.total > 0)
            .map((entry) => entry.category) ?? [];
        setRecentCategories(categories);
      } catch (err) {
        setError(err.message);
      } finally {
        setLoading(false);
      }
    }
    load();
  }, [apiBase, currentUser.id, setRecentCategories]);

  const barData = useMemo(() => {
    const months = data?.totalsByMonth ?? [];
    return {
      labels: months.map((entry) => entry.month),
      datasets: [
        {
          label: "Total spend",
          data: months.map((entry) => entry.total),
          backgroundColor: "rgba(11, 118, 255, 0.6)",
        },
      ],
    };
  }, [data]);

  const lineData = useMemo(() => {
    const months = data?.totalsByMonth ?? [];
    return {
      labels: months.map((entry) => entry.month),
      datasets: [
        {
          label: "Monthly trend",
          data: months.map((entry) => entry.total),
          borderColor: "#6f2dff",
          backgroundColor: "rgba(111, 45, 255, 0.2)",
        },
      ],
    };
  }, [data]);

  const pieData = useMemo(() => {
    const categories = data?.totalsByCategory ?? [];
    return {
      labels: categories.map((entry) => entry.category),
      datasets: [
        {
          label: "Category split",
          data: categories.map((entry) => entry.total),
          backgroundColor: [
            "rgba(11, 118, 255, 0.6)",
            "rgba(111, 45, 255, 0.6)",
            "rgba(15, 200, 160, 0.6)",
            "rgba(255, 174, 0, 0.6)",
            "rgba(255, 99, 132, 0.6)",
            "rgba(54, 162, 235, 0.6)",
          ],
        },
      ],
    };
  }, [data]);

  if (loading) {
    return (
      <div className="card">
        <p>Loading dashboard...</p>
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

  if (!data) {
    return (
      <div className="card">
        <p>No data yet. Add expenses to see charts.</p>
      </div>
    );
  }

  return (
    <div className="card" style={{ display: "grid", gap: "2rem" }}>
      <h2>Dashboard</h2>
      <div style={{ display: "grid", gap: "1.5rem" }}>
        <div
          style={{
            display: "grid",
            gap: "1rem",
            gridTemplateColumns: "1fr 1fr",
          }}
        >
          <div className="card" style={{ padding: "1rem" }}>
            <strong>Total spent</strong>
            <p style={{ fontSize: "2rem", margin: 0 }}>
              {data.totalSpent?.toFixed(2) ?? 0}
            </p>
          </div>
        </div>
        <div className="card" style={{ padding: "1rem" }}>
          <Bar data={barData} />
        </div>
        <div className="card" style={{ padding: "1rem" }}>
          <Line data={lineData} />
        </div>
        <div className="card" style={{ padding: "1rem" }}>
          <Pie data={pieData} />
        </div>
      </div>
    </div>
  );
}
