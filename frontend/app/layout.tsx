import "./globals.css";
import type { ReactNode } from "react";
import AppShell from "./components/AppShell";
import { ResetPasswordProvider } from "./context/ResetPasswordContext";
import { ThemeProvider } from "./context/ThemeContext";
import { ErrorBoundary } from "../components/ErrorBoundary";

export default function AppLayout({ children }: { children: ReactNode }) {
  return (
    <html lang="pt-BR">
      <body>
        <ThemeProvider>
          <ResetPasswordProvider>
            <ErrorBoundary>
              <AppShell>{children}</AppShell>
            </ErrorBoundary>
          </ResetPasswordProvider>
        </ThemeProvider>
      </body>
    </html>
  );
}
