"use client";

import dynamic from "next/dynamic";

// Dynamically import the client-only app to avoid SSR using document/window
const ClientApp = dynamic(() => import("./ClientApp"), { ssr: false });

export default function Page() {
  return <ClientApp />;
}
