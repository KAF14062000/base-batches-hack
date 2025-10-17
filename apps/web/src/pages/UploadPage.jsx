import { useEffect, useMemo, useState } from "react";
import { useNavigate } from "react-router-dom";
import { useApp } from "../state/AppContext.jsx";

const categories = [
  "food",
  "drinks",
  "utilities",
  "transport",
  "entertainment",
  "other",
];

export default function UploadPage() {
  const { apiBase, currentUser, currentGroupId, setCurrentGroupId, refreshGroup } =
    useApp();
  const [selectedGroupId, setSelectedGroupId] = useState(currentGroupId ?? "");
  const [filePreview, setFilePreview] = useState(null);
  const [base64Image, setBase64Image] = useState(null);
  const [ocrResult, setOcrResult] = useState(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);
  const navigate = useNavigate();

  useEffect(() => {
    setSelectedGroupId(currentGroupId ?? "");
  }, [currentGroupId]);

  function handleFile(event) {
    const file = event.target.files?.[0];
    if (!file) return;

    setError(null);
    const previewUrl = URL.createObjectURL(file);
    setFilePreview(previewUrl);

    const reader = new FileReader();
    reader.onload = () => {
      const result = reader.result;
      if (typeof result === "string") {
        const base64 = result.split(",")[1];
        setBase64Image(base64);
      }
    };
    reader.readAsDataURL(file);
  }

  async function runOcr() {
    if (!base64Image) {
      setError("Select a receipt image first.");
      return;
    }

    setLoading(true);
    setError(null);
    try {
      const response = await fetch(`${apiBase}/ocr`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ image: base64Image }),
      });
      if (!response.ok) {
        throw new Error("OCR failed");
      }
      const data = await response.json();
      setOcrResult({
        merchant: data.merchant ?? "",
        date: data.date ?? "",
        currency: data.currency ?? "USD",
        subtotal: data.subtotal ?? 0,
        tax: data.tax ?? 0,
        total: data.total ?? 0,
        items: Array.isArray(data.items)
          ? data.items.map((item, index) => ({
              id: index,
              name: item.name ?? "",
              qty: item.qty ?? 1,
              price: item.price ?? 0,
              category: categories.includes(item.category)
                ? item.category
                : "other",
            }))
          : [],
      });
    } catch (err) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  }

  function updateItem(index, field, value) {
    setOcrResult((prev) => {
      if (!prev) return prev;
      const nextItems = [...prev.items];
      nextItems[index] = { ...nextItems[index], [field]: value };
      return { ...prev, items: nextItems };
    });
  }

  async function saveExpense() {
    if (!ocrResult) return;
    if (!selectedGroupId) {
      setError("Enter a group ID to save the expense.");
      return;
    }
    setLoading(true);
    setError(null);

    try {
      const payload = {
        groupId: selectedGroupId,
        createdById: currentUser.id,
        merchant: ocrResult.merchant,
        date: ocrResult.date,
        currency: ocrResult.currency,
        subtotal: Number(ocrResult.subtotal),
        tax: Number(ocrResult.tax),
        total: Number(ocrResult.total),
        items: ocrResult.items.map((item) => ({
          name: item.name,
          qty: Number(item.qty),
          price: Number(item.price),
          category: item.category,
        })),
      };

      const response = await fetch(`${apiBase}/expenses`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
      });
      if (!response.ok) {
        throw new Error("Failed to save expense");
      }
      const expense = await response.json();

      if (!currentGroupId || currentGroupId !== selectedGroupId) {
        setCurrentGroupId(selectedGroupId);
      } else {
        await refreshGroup(selectedGroupId);
      }
      navigate(`/expense/${expense.id}`);
    } catch (err) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="card">
      <h2>Receipt OCR</h2>
      <p>
        Upload a receipt, let qwen3-vl parse it, tweak the fields, then save the
        expense for your group.
      </p>

      <div className="grid two" style={{ marginTop: "1.5rem" }}>
        <div>
          <label>
            Group ID
            <input
              className="input"
              value={selectedGroupId}
              onChange={(event) => setSelectedGroupId(event.target.value)}
              placeholder="Enter group id"
            />
          </label>
          <label style={{ marginTop: "1rem" }}>
            Receipt Image
            <input type="file" accept="image/*" onChange={handleFile} />
          </label>
          {filePreview && (
            <img
              src={filePreview}
              alt="Receipt preview"
              style={{
                marginTop: "1rem",
                borderRadius: "12px",
                maxWidth: "100%",
                border: "1px solid #e2e8f0",
              }}
            />
          )}
          <div style={{ display: "flex", gap: "0.5rem", marginTop: "1.25rem" }}>
            <button
              className="btn btn-secondary"
              onClick={runOcr}
              disabled={!base64Image || loading}
            >
              {loading ? "Processing..." : "Run OCR"}
            </button>
            <button
              className="btn btn-primary"
              onClick={saveExpense}
              disabled={!ocrResult || loading}
            >
              Save to Expense
            </button>
          </div>
          {error && (
            <p style={{ color: "#ef4444", marginTop: "0.75rem" }}>{error}</p>
          )}
        </div>
        <div>
          {ocrResult ? (
            <div>
              <div className="grid two">
                <label>
                  Merchant
                  <input
                    className="input"
                    value={ocrResult.merchant}
                    onChange={(event) =>
                      setOcrResult((prev) => ({
                        ...prev,
                        merchant: event.target.value,
                      }))
                    }
                  />
                </label>
                <label>
                  Date
                  <input
                    className="input"
                    type="date"
                    value={ocrResult.date}
                    onChange={(event) =>
                      setOcrResult((prev) => ({
                        ...prev,
                        date: event.target.value,
                      }))
                    }
                  />
                </label>
                <label>
                  Currency
                  <input
                    className="input"
                    value={ocrResult.currency}
                    onChange={(event) =>
                      setOcrResult((prev) => ({
                        ...prev,
                        currency: event.target.value,
                      }))
                    }
                  />
                </label>
                <label>
                  Subtotal
                  <input
                    className="input"
                    type="number"
                    step="0.01"
                    value={ocrResult.subtotal}
                    onChange={(event) =>
                      setOcrResult((prev) => ({
                        ...prev,
                        subtotal: event.target.value,
                      }))
                    }
                  />
                </label>
                <label>
                  Tax
                  <input
                    className="input"
                    type="number"
                    step="0.01"
                    value={ocrResult.tax}
                    onChange={(event) =>
                      setOcrResult((prev) => ({
                        ...prev,
                        tax: event.target.value,
                      }))
                    }
                  />
                </label>
                <label>
                  Total
                  <input
                    className="input"
                    type="number"
                    step="0.01"
                    value={ocrResult.total}
                    onChange={(event) =>
                      setOcrResult((prev) => ({
                        ...prev,
                        total: event.target.value,
                      }))
                    }
                  />
                </label>
              </div>
              <table className="table">
                <thead>
                  <tr>
                    <th>Item</th>
                    <th>Qty</th>
                    <th>Price</th>
                    <th>Category</th>
                  </tr>
                </thead>
                <tbody>
                  {ocrResult.items.map((item, index) => (
                    <tr key={index}>
                      <td>
                        <input
                          className="input"
                          value={item.name}
                          onChange={(event) =>
                            updateItem(index, "name", event.target.value)
                          }
                        />
                      </td>
                      <td>
                        <input
                          className="input"
                          type="number"
                          min={1}
                          value={item.qty}
                          onChange={(event) =>
                            updateItem(index, "qty", event.target.value)
                          }
                        />
                      </td>
                      <td>
                        <input
                          className="input"
                          type="number"
                          step="0.01"
                          value={item.price}
                          onChange={(event) =>
                            updateItem(index, "price", event.target.value)
                          }
                        />
                      </td>
                      <td>
                        <select
                          className="input"
                          value={item.category}
                          onChange={(event) =>
                            updateItem(index, "category", event.target.value)
                          }
                        >
                          {categories.map((option) => (
                            <option key={option} value={option}>
                              {option}
                            </option>
                          ))}
                        </select>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          ) : (
            <p style={{ color: "#64748b" }}>
              OCR results will appear here after processing.
            </p>
          )}
        </div>
      </div>
    </div>
  );
}
