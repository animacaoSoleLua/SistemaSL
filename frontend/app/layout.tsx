import "./globals.css";
import type { ReactNode } from "react";
import AppShell from "./components/AppShell";
import { ResetPasswordProvider } from "./context/ResetPasswordContext";

export default function AppLayout({ children }: { children: ReactNode }) {
  return (
    <html lang="pt-BR">
      <body>
        <ResetPasswordProvider>
          <AppShell>{children}</AppShell>
        </ResetPasswordProvider>
      </body>
    </html>
  );
}
