import type { ReactNode } from "react";
import "./globals.css";

export const metadata = {
  title: "Sol e Lua",
  description: "Base do projeto Sol e Lua"
};

export default function RootLayout({
  children
}: {
  children: ReactNode;
}) {
  return (
    <html lang="pt-BR">
      <body>{children}</body>
    </html>
  );
}
