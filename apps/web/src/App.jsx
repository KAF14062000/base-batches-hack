import { Navigate, Route, Routes } from "react-router-dom";
import AppShell from "./components/AppShell.jsx";
import UploadPage from "./pages/UploadPage.jsx";
import GroupPage from "./pages/GroupPage.jsx";
import ExpensePage from "./pages/ExpensePage.jsx";
import DashboardPage from "./pages/DashboardPage.jsx";
import DealsPage from "./pages/DealsPage.jsx";

export default function App() {
  return (
    <AppShell>
      <Routes>
        <Route path="/" element={<Navigate to="/upload" replace />} />
        <Route path="/upload" element={<UploadPage />} />
        <Route path="/group/:groupId" element={<GroupPage />} />
        <Route path="/expense/:expenseId" element={<ExpensePage />} />
        <Route path="/dashboard" element={<DashboardPage />} />
        <Route path="/deals" element={<DealsPage />} />
        <Route path="*" element={<Navigate to="/upload" replace />} />
      </Routes>
    </AppShell>
  );
}
