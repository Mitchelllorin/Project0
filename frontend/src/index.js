import React from "react";
import ReactDOM from "react-dom/client";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import "@/index.css";
import App from "@/App";
import { buildTimeDeployment } from "@/studio/deployment";

// Set the tab title from the deployment identity before the first render, so a client's
// studio never shows the neutral placeholder (or anyone else's brand) while React starts.
const deployment = buildTimeDeployment();
document.title = [deployment.brand.name, deployment.brand.subtitle].filter(Boolean).join(' — ');

const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      staleTime: 60_000,
      refetchOnWindowFocus: false,
    },
  },
});

const root = ReactDOM.createRoot(document.getElementById("root"));
root.render(
  <React.StrictMode>
    <QueryClientProvider client={queryClient}>
      <App />
    </QueryClientProvider>
  </React.StrictMode>,
);
