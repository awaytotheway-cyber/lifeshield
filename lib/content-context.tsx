import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useRef,
  useState,
  type ReactNode,
} from "react";
import { AppState } from "react-native";

import { EMPTY_CONTENT, type AppContent } from "@/lib/app-content";
import { loadAppContent } from "@/lib/load-content";

const REFRESH_MS = 5 * 60 * 1000;

type ContentContextValue = {
  content: AppContent;
  refresh: () => void;
};

const ContentContext = createContext<ContentContextValue>({
  content: EMPTY_CONTENT,
  refresh: () => {},
});

/**
 * Keeps admin-edited wording in sync with a running app.
 *
 * Refreshes on mount, whenever the app returns to the foreground, and on a
 * five-minute tick while it stays foregrounded. loadAppContent polls a single
 * revision row first, so a tick that finds no change costs one tiny query.
 *
 * Never blocks render: until the first load resolves, every resolve* helper
 * falls through to the wording compiled into the screens.
 */
export function ContentProvider({ children }: { children: ReactNode }) {
  const [content, setContent] = useState<AppContent>(EMPTY_CONTENT);
  const mounted = useRef(true);

  const pull = useCallback(async (forceRefresh: boolean) => {
    const next = await loadAppContent({ forceRefresh });
    if (mounted.current) {
      setContent(next);
    }
  }, []);

  useEffect(() => {
    mounted.current = true;
    void pull(false);

    const timer = setInterval(() => {
      void pull(true);
    }, REFRESH_MS);

    const subscription = AppState.addEventListener("change", (state) => {
      if (state === "active") {
        void pull(true);
      }
    });

    return () => {
      mounted.current = false;
      clearInterval(timer);
      subscription.remove();
    };
  }, [pull]);

  const value = useMemo<ContentContextValue>(
    () => ({ content, refresh: () => void pull(true) }),
    [content, pull],
  );

  return (
    <ContentContext.Provider value={value}>{children}</ContentContext.Provider>
  );
}

export function useAppContent(): AppContent {
  return useContext(ContentContext).content;
}

export function useContentRefresh(): () => void {
  return useContext(ContentContext).refresh;
}
