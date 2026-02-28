"use client";

import { createContext, useContext, useRef, type RefObject, type ReactNode } from "react";

type NavSpineContextValue = {
  portalRef: RefObject<HTMLDivElement | null>;
};

const NavSpineContext = createContext<NavSpineContextValue | null>(null);

export function NavSpineProvider({ children }: { children: ReactNode }) {
  const portalRef = useRef<HTMLDivElement | null>(null);
  return (
    <NavSpineContext.Provider value={{ portalRef }}>
      {children}
    </NavSpineContext.Provider>
  );
}

export function useNavSpine() {
  const ctx = useContext(NavSpineContext);
  if (!ctx) throw new Error("useNavSpine must be used within NavSpineProvider");
  return ctx;
}
