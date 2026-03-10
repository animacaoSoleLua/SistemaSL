import "./globals.css";
import type { ReactNode } from "react";
import AppShell from "./components/AppShell";
import { ResetPasswordProvider } from "./context/ResetPasswordContext";
import { ErrorBoundary } from "../components/ErrorBoundary";

export default function AppLayout({ children }: { children: ReactNode }) {
  return (
    <html lang="pt-BR">
      <body>
        <ResetPasswordProvider>
          <ErrorBoundary>
            <AppShell>{children}</AppShell>
          </ErrorBoundary>
        </ResetPasswordProvider>
      </body>
    </html>
  );
}
