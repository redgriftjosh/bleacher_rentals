"use client";

import dynamic from "next/dynamic";

export const DynamicSystemProvider = dynamic(() => import("./SystemProvider"), {
  ssr: false,
});
