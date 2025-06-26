"use client";
import { createContext, useContext, RefObject, createRef } from "react";

type LayoutContextType = {
  scrollRef: RefObject<HTMLDivElement | null>;
};

const LayoutContext = createContext<LayoutContextType>({ scrollRef: createRef<HTMLDivElement>() });

export function LayoutProvider({
  children,
  scrollRef,
}: {
  children: React.ReactNode;
  scrollRef: RefObject<HTMLDivElement | null>;
}) {
  return <LayoutContext.Provider value={{ scrollRef }}>{children}</LayoutContext.Provider>;
}

export function useLayoutContext() {
  return useContext(LayoutContext);
}
