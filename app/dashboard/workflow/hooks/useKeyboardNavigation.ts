import { useCallback, useEffect } from "react";

interface UseKeyboardNavigationProps {
  onSearch: () => void;
  onEscape: () => void;
  onRefresh: () => void;
  enabled?: boolean;
}

export function useKeyboardNavigation({
  onSearch,
  onEscape,
  onRefresh,
  enabled = true,
}: UseKeyboardNavigationProps) {
  const handleKeyDown = useCallback(
    (event: KeyboardEvent) => {
      if (!enabled) return;

      // Ignore if user is typing in an input
      const target = event.target as HTMLElement;
      if (
        target.tagName === "INPUT" ||
        target.tagName === "TEXTAREA" ||
        target.contentEditable === "true"
      ) {
        return;
      }

      switch (event.key) {
        case "/":
          event.preventDefault();
          onSearch();
          break;
        case "Escape":
          onEscape();
          break;
        case "r":
          if (event.ctrlKey || event.metaKey) {
            event.preventDefault();
            onRefresh();
          }
          break;
        case "?":
          event.preventDefault();
          // Show keyboard shortcuts help (could be implemented later)
          console.log("Keyboard shortcuts:", {
            "/": "Focus search",
            "Escape": "Clear search/close dialogs",
            "Ctrl/Cmd + R": "Refresh data",
          });
          break;
      }
    },
    [onSearch, onEscape, onRefresh, enabled]
  );

  useEffect(() => {
    if (!enabled) return;

    window.addEventListener("keydown", handleKeyDown);
    return () => {
      window.removeEventListener("keydown", handleKeyDown);
    };
  }, [handleKeyDown, enabled]);

  return {
    enabled,
  };
}
