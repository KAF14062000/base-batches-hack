import { useEffect, useMemo, useState } from "react";
import { useNavigate, useParams } from "react-router-dom";
import { ethers } from "ethers";
import { useApp } from "../state/AppContext.jsx";
import abi from "../abi/GroupSplit.json";
import { CONTRACT_ADDRESS } from "../config.js";

export default function ExpensePage() {
  const { expenseId } = useParams();
  const { apiBase, refreshGroup } = useApp();
  const [expense, setExpense] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [selection, setSelection] = useState({});
  const [walletOverrides, setWalletOverrides] = useState({});
  const [savingAllocations, setSavingAllocations] = useState(false);
  const [savingSplitId, setSavingSplitId] = useState(false);
  const navigate = useNavigate();

  useEffect(() => {
    async function fetchExpense() {
      if (!expenseId) return;
      setLoading(true);
      setError(null);
      try {
        const response = await fetch(`${apiBase}/expenses/${expenseId}`);
        if (!response.ok) {
          throw new Error("Unable to load expense");
        }
        const data = await response.json();
        setExpense(data);
        const initialSelection = {};
        (data.items || []).forEach((item) => {
          initialSelection[item.id] = new Set(
            item.allocations?.map((allocation) => allocation.memberId) ?? [],
          );
        });
        setSelection(initialSelection);
        await refreshGroup(data.groupId);
      } catch (err) {
        setError(err.message);
      } finally {
        setLoading(false);
      }
    }

    fetchExpense();
  }, [apiBase, expenseId, refreshGroup]);

  const members = expense?.group?.members ?? [];

  const memberTotals = useMemo(() => {
    if (!expense) return {};
    const totals = {};
    const items = expense.items ?? [];
    members.forEach((member) => {
      let total = 0;
      items.forEach((item) => {
        const selected = selection[item.id];
        if (selected && selected.has(member.id)) {
          const price = Number(item.price ?? 0);
          const qty = Number(item.quantity ?? 1);
          const share = price * qty / (selected.size || 1);
          total += share;
        }
      });
      totals[member.id] = Number(total.toFixed(2));
    });
    return totals;
  }, [expense, members, selection]);

  function toggleMember(itemId, memberId) {
    setSelection((prev) => {
      const next = { ...prev };
      const selected = new Set(next[itemId] ?? []);
      if (selected.has(memberId)) {
        selected.delete(memberId);
      } else {
        selected.add(memberId);
      }
      next[itemId] = selected;
      return next;
    });
  }

  async function saveAllocations() {
    if (!expense) return;
    setSavingAllocations(true);
    setError(null);
    try {
      const payload = {
        allocations: Object.entries(selection).map(([itemId, set]) => ({
          itemId,
          memberIds: Array.from(set),
        })),
      };

      const response = await fetch(
        `${apiBase}/expenses/${expense.id}/allocate`,
        {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify(payload),
        },
      );
      if (!response.ok) {
        throw new Error("Failed to save allocations");
      }
      const updated = await response.json();
      setExpense(updated);
    } catch (err) {
      setError(err.message);
    } finally {
      setSavingAllocations(false);
    }
  }

  async function saveSplitId() {
    if (!expense?.splitId) {
      window.alert("Enter a split ID first.");
      return;
    }
    setSavingSplitId(true);
    try {
      const response = await fetch(`${apiBase}/expenses/${expense.id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ splitId: expense.splitId }),
      });
      if (!response.ok) {
        throw new Error("Failed to save split ID");
      }
      const updated = await response.json();
      setExpense(updated);
    } catch (err) {
      setError(err.message);
    } finally {
      setSavingSplitId(false);
    }
  }

  async function settle(member) {
    if (!expense) return;
    const suggested = memberTotals[member.id] ?? 0;
    const input = window.prompt(
      `Amount in ETH to settle with ${member.user?.name ?? "member"}`,
      suggested.toFixed(4),
    );
    if (!input) return;
    const amount = Number(input);
    if (Number.isNaN(amount) || amount <= 0) {
      window.alert("Enter a valid amount");
      return;
    }

    const recipient =
      walletOverrides[member.id] ||
      member.walletAddress ||
      window.prompt("Enter recipient wallet address");

    if (!recipient) {
      window.alert("Recipient address required");
      return;
    }

    let splitIdValue = expense.splitId;
    if (!splitIdValue) {
      splitIdValue = window.prompt(
        "Enter on-chain split ID created on GroupSplit contract",
      );
      if (!splitIdValue) {
        window.alert("Split ID required for settlement");
        return;
      }
    }

    if (!window.ethereum) {
      window.alert("Install a wallet like MetaMask to settle on-chain.");
      return;
    }

    try {
      const provider = new ethers.BrowserProvider(window.ethereum);
      await provider.send("eth_requestAccounts", []);
      const signer = await provider.getSigner();
      const contract = new ethers.Contract(CONTRACT_ADDRESS, abi, signer);

      const tx = await contract.settle(BigInt(splitIdValue), recipient, {
        value: ethers.parseEther(amount.toString()),
      });
      await tx.wait();
      window.alert("Settlement broadcast to Base Sepolia!");
    } catch (err) {
      window.alert(err.message);
    }
  }

  if (loading) {
    return (
      <div className="card">
        <p>Loading expense...</p>
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

  if (!expense) {
    return (
      <div className="card">
        <p>No expense found.</p>
      </div>
    );
  }

  return (
    <div className="card">
      <div style={{ display: "flex", justifyContent: "space-between" }}>
        <div>
          <h2>{expense.merchant}</h2>
          <p style={{ color: "#475569" }}>
            {new Date(expense.date).toLocaleString()} — {expense.currency}{" "}
            {Number(expense.total).toFixed(2)}
          </p>
        </div>
        <div style={{ display: "flex", gap: "0.5rem", alignItems: "center" }}>
          <input
            className="input"
            placeholder="On-chain split ID"
            value={expense.splitId ?? ""}
            onChange={(event) =>
              setExpense((prev) => ({ ...prev, splitId: event.target.value }))
            }
            style={{ width: "180px" }}
          />
          <button
            className="btn btn-secondary"
            onClick={saveSplitId}
            disabled={savingSplitId}
          >
            {savingSplitId ? "Saving..." : "Save Split ID"}
          </button>
        </div>
      </div>

      <table className="table" style={{ marginTop: "1.5rem" }}>
        <thead>
          <tr>
            <th>Item</th>
            {members.map((member) => (
              <th key={member.id}>{member.user?.name ?? "Member"}</th>
            ))}
          </tr>
        </thead>
        <tbody>
          {expense.items.map((item) => (
            <tr key={item.id}>
              <td>
                <div>
                  <strong>{item.name}</strong>
                  <p style={{ margin: 0, color: "#64748b", fontSize: "0.9rem" }}>
                    {item.quantity} × {Number(item.price).toFixed(2)} —{" "}
                    {item.category}
                  </p>
                </div>
              </td>
              {members.map((member) => {
                const selected = selection[item.id]?.has(member.id) ?? false;
                return (
                  <td key={member.id} style={{ textAlign: "center" }}>
                    <input
                      type="checkbox"
                      checked={selected}
                      onChange={() => toggleMember(item.id, member.id)}
                    />
                  </td>
                );
              })}
            </tr>
          ))}
        </tbody>
      </table>

      <div style={{ display: "flex", justifyContent: "space-between" }}>
        <button
          className="btn btn-primary"
          onClick={saveAllocations}
          disabled={savingAllocations}
        >
          {savingAllocations ? "Saving..." : "Save Allocations"}
        </button>
      </div>

      <section style={{ marginTop: "2rem" }}>
        <h3>Settle on Base</h3>
        <p style={{ color: "#64748b" }}>
          Suggested totals are based on equal splits per item. Adjust ETH amount
          when sending on-chain.
        </p>
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
              <strong>{member.user?.name ?? "Member"}</strong>
              <p style={{ margin: "0.25rem 0", color: "#475569" }}>
                Suggested: {memberTotals[member.id]?.toFixed(2)}{" "}
                {expense.currency}
              </p>
              <input
                className="input"
                placeholder="Wallet override (optional)"
                value={walletOverrides[member.id] ?? member.walletAddress ?? ""}
                onChange={(event) =>
                  setWalletOverrides((prev) => ({
                    ...prev,
                    [member.id]: event.target.value,
                  }))
                }
              />
              <button
                style={{ marginTop: "0.75rem" }}
                className="btn btn-primary"
                onClick={() => settle(member)}
              >
                Settle on Base
              </button>
            </div>
          ))}
        </div>
      </section>
    </div>
  );
}
