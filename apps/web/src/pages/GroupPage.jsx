import { useEffect, useMemo, useState } from "react";
import { Link, useParams } from "react-router-dom";
import { useApp } from "../state/AppContext.jsx";

export default function GroupPage() {
  const { groupId } = useParams();
  const {
    currentGroup,
    groupLoading,
    groupError,
    setCurrentGroupId,
    refreshGroup,
    apiBase,
  } = useApp();
  const [inviteLink, setInviteLink] = useState(null);
  const [email, setEmail] = useState("");
  const [status, setStatus] = useState(null);

  useEffect(() => {
    if (groupId) {
      setCurrentGroupId(groupId);
    }
  }, [groupId, setCurrentGroupId]);

  const members = currentGroup?.members ?? [];
  const expenses = currentGroup?.expenses ?? [];

  async function handleInvite(sendEmail = false) {
    if (!groupId) return;
    setStatus("Sending invite...");
    try {
      const response = await fetch(`${apiBase}/groups/${groupId}/invite`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(sendEmail ? { email } : {}),
      });
      if (!response.ok) {
        throw new Error("Failed to create invite");
      }
      const data = await response.json();
      setInviteLink(data.link);
      setStatus(sendEmail ? "Email sent!" : "Invite link ready.");
      await navigator.clipboard.writeText(data.link);
    } catch (error) {
      setStatus(error.message);
    }
  }

  return (
    <div className="card">
      <h2>Group</h2>
      {groupLoading && <p>Loading group...</p>}
      {groupError && <p style={{ color: "#ef4444" }}>{groupError}</p>}
      {!groupLoading && !currentGroup && (
        <p style={{ color: "#64748b" }}>
          Enter a valid group ID to load members and expenses.
        </p>
      )}

      {currentGroup && (
        <div style={{ display: "grid", gap: "2rem" }}>
          <section>
            <h3>Members</h3>
            <div className="grid two">
              {members.map((member) => (
                <div
                  key={member.id}
                  style={{
                    border: "1px solid #e2e8f0",
                    borderRadius: "12px",
                    padding: "1rem",
                    background: "#f8fafc",
                  }}
                >
                  <strong>{member.user?.name ?? "Unnamed"}</strong>
                  <p style={{ margin: "0.25rem 0", color: "#475569" }}>
                    {member.user?.email ?? "No email"}
                  </p>
                  <p style={{ fontSize: "0.9rem", color: "#64748b" }}>
                    Wallet: {member.walletAddress ?? "—"}
                  </p>
                  <span className="tag" style={{ marginTop: "0.5rem" }}>
                    {member.role}
                  </span>
                </div>
              ))}
            </div>
          </section>

          <section>
            <h3>Expenses</h3>
            <div
              style={{ display: "flex", flexDirection: "column", gap: "1rem" }}
            >
              {expenses.length === 0 && (
                <p style={{ color: "#64748b" }}>No expenses yet.</p>
              )}
              {expenses.map((expense) => (
                <Link
                  key={expense.id}
                  to={`/expense/${expense.id}`}
                  style={{
                    border: "1px solid #e2e8f0",
                    borderRadius: "12px",
                    padding: "1rem",
                    background: "white",
                    display: "flex",
                    justifyContent: "space-between",
                    alignItems: "center",
                  }}
                >
                  <div>
                    <strong>{expense.merchant}</strong>
                    <p style={{ margin: 0, color: "#475569" }}>
                      {new Date(expense.date).toLocaleDateString()} —{" "}
                      {expense.currency} {Number(expense.total).toFixed(2)}
                    </p>
                  </div>
                  <span className="tag">Items: {expense.items.length}</span>
                </Link>
              ))}
            </div>
          </section>

          <section>
            <h3>Invite</h3>
            <div style={{ display: "flex", gap: "0.5rem", flexWrap: "wrap" }}>
              <button
                className="btn btn-secondary"
                onClick={() => handleInvite(false)}
              >
                Copy invite link
              </button>
              <input
                className="input"
                placeholder="Email (optional)"
                value={email}
                onChange={(event) => setEmail(event.target.value)}
              />
              <button
                className="btn btn-primary"
                onClick={() => handleInvite(true)}
              >
                Email invite
              </button>
            </div>
            {inviteLink && (
              <p style={{ marginTop: "0.75rem", color: "#0b76ff" }}>
                {inviteLink}
              </p>
            )}
            {status && <p style={{ marginTop: "0.5rem" }}>{status}</p>}
          </section>
        </div>
      )}
    </div>
  );
}
