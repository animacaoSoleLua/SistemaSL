"use client";

import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import { useEffect } from "react";
import { getDefaultRoute, getStoredUser, isRoleAllowed } from "../../lib/auth";
import "./layout.css";

const tabs = [
  { label: "Dados", href: "/configuracoes/perfil" },
  { label: "Segurança", href: "/configuracoes/seguranca" },
  { label: "Cursos", href: "/configuracoes/cursos" },
  { label: "Advertências", href: "/configuracoes/advertencias" },
];

export default function ConfiguracoesLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const router = useRouter();
  const pathname = usePathname();

  useEffect(() => {
    const user = getStoredUser();
    if (!user) {
      router.push("/login");
      return;
    }
    if (!isRoleAllowed(user.role, ["recreador", "animador", "admin"])) {
      router.push(getDefaultRoute(user.role));
    }
  }, [router]);

  return (
    <main className="app-page">
      <section className="shell reveal">
        <header className="page-header">
          <div>
            <h1 className="hero-title">Configurações</h1>
          </div>
        </header>
        <nav className="settings-tabs" aria-label="Seções de configurações">
          {tabs.map((tab) => (
            <Link
              key={tab.href}
              href={tab.href}
              className={`settings-tab${pathname === tab.href ? " active" : ""}`}
              aria-current={pathname === tab.href ? "page" : undefined}
            >
              {tab.label}
            </Link>
          ))}
        </nav>
        {children}
      </section>
    </main>
  );
}
