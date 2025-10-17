import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useState,
} from "react";

const AppContext = createContext(null);

export function AppProvider({ children }) {
  const apiBase = import.meta.env.VITE_API_BASE_URL || "http://localhost:4000";
  const [currentUser, setCurrentUser] = useState({
    id: "demo-user",
    name: "Demo User",
    email: "demo@example.com",
  });
  const [currentGroupId, setCurrentGroupId] = useState(null);
  const [currentGroup, setCurrentGroup] = useState(null);
  const [groupLoading, setGroupLoading] = useState(false);
  const [groupError, setGroupError] = useState(null);
  const [recentCategories, setRecentCategories] = useState([]);

  const refreshGroup = useCallback(
    async (groupId = currentGroupId) => {
      if (!groupId) {
        setCurrentGroup(null);
        return;
      }

      setGroupLoading(true);
      setGroupError(null);
      try {
        const response = await fetch(`${apiBase}/groups/${groupId}`);
        if (!response.ok) {
          throw new Error(`Failed to fetch group ${groupId}`);
        }
        const data = await response.json();
        setCurrentGroup(data);
      } catch (error) {
        setGroupError(error.message);
      } finally {
        setGroupLoading(false);
      }
    },
    [apiBase, currentGroupId],
  );

  useEffect(() => {
    if (currentGroupId) {
      refreshGroup(currentGroupId);
    } else {
      setCurrentGroup(null);
    }
  }, [currentGroupId, refreshGroup]);

  const value = useMemo(
    () => ({
      apiBase,
      currentUser,
      setCurrentUser,
      currentGroup,
      currentGroupId,
      setCurrentGroupId,
      groupLoading,
      groupError,
      refreshGroup,
      recentCategories,
      setRecentCategories,
    }),
    [
      apiBase,
      currentUser,
      currentGroup,
      currentGroupId,
      groupLoading,
      groupError,
      refreshGroup,
      recentCategories,
    ],
  );

  return <AppContext.Provider value={value}>{children}</AppContext.Provider>;
}

export function useApp() {
  const context = useContext(AppContext);
  if (!context) {
    throw new Error("useApp must be used within AppProvider");
  }
  return context;
}
