"use client";

import { useState } from "react";
import { SessionProvider } from "next-auth/react";
import { Provider } from "react-redux";
import { makeStore } from "@/lib/store";

export default function Providers({ children }: { children: React.ReactNode }) {
  const [store] = useState(makeStore);
  return (
    <SessionProvider>
      <Provider store={store}>{children}</Provider>
    </SessionProvider>
  );
}
