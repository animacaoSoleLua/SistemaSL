"use client";

import Image from "next/image";
import Link from "next/link";
import { usePathname } from "next/navigation";
import logo from "../../assets/logo.png";

const navItems = [
  {
    label: "Dashboard",
    href: "/",
    icon: (
      <svg viewBox="0 0 20 20" aria-hidden="true">
        <rect x="3" y="3" width="6" height="6" rx="1.5" />
        <rect x="11" y="3" width="6" height="6" rx="1.5" />
        <rect x="3" y="11" width="6" height="6" rx="1.5" />
        <rect x="11" y="11" width="6" height="6" rx="1.5" />
      </svg>
    )
  },
  {
    label: "Relatorios",
    href: "/relatorios",
    icon: (
      <svg viewBox="0 0 20 20" aria-hidden="true">
        <path d="M5 3.5h7l3 3V16a1.5 1.5 0 0 1-1.5 1.5h-8A1.5 1.5 0 0 1 4 16V5A1.5 1.5 0 0 1 5.5 3.5z" />
        <path d="M12 3.5V7h3" />
      </svg>
    )
  },
  {
    label: "Novo Relatorio",
    href: "/relatorios/novo",
    icon: (
      <svg viewBox="0 0 20 20" aria-hidden="true">
        <circle cx="10" cy="10" r="7" />
        <path d="M10 7v6M7 10h6" />
      </svg>
    )
  },
  {
    label: "Novo Curso",
    href: "/cursos/novo",
    icon: (
      <svg viewBox="0 0 20 20" aria-hidden="true">
        <path d="M4 6.5l6-3 6 3-6 3-6-3z" />
        <path d="M6 10.2v3.3c0 .7 1.8 2 4 2s4-1.3 4-2v-3.3" />
        <path d="M16 9.5v3" />
      </svg>
    )
  },
  {
    label: "Usuarios",
    href: "/usuarios",
    icon: (
      <svg viewBox="0 0 20 20" aria-hidden="true">
        <circle cx="10" cy="7.5" r="3.2" />
        <path d="M4.5 16c1-2.5 3.1-4 5.5-4s4.5 1.5 5.5 4" />
      </svg>
    )
  }
];

function isActive(pathname: string, href: string) {
  if (href === "/") {
    return pathname === "/";
  }

  if (href === "/relatorios") {
    return pathname === "/relatorios" || pathname.startsWith("/relatorios/");
  }

  if (href === "/cursos/novo") {
    return pathname.startsWith("/cursos");
  }

  return pathname === href;
}

export default function SidebarNav() {
  const pathname = usePathname();

  return (
    <aside className="app-sidebar">
      <div className="app-brand">
        <Image
          src={logo}
          alt="Sol e Lua Animacao"
          className="app-logo"
          priority
        />
      </div>
      <nav className="app-nav" aria-label="Navegacao principal">
        {navItems.map((item) => {
          const active = isActive(pathname, item.href);
          return (
            <Link
              key={item.href}
              href={item.href}
              className={`nav-link${active ? " active" : ""}`}
            >
              <span className="nav-icon">{item.icon}</span>
              {item.label}
            </Link>
          );
        })}
      </nav>
      <div className="sidebar-section">
        <span className="sidebar-label">Tema</span>
        <button className="theme-toggle" type="button" aria-label="Alternar tema">
          <span className="theme-icon" aria-hidden="true">
            <svg viewBox="0 0 20 20">
              <circle cx="10" cy="10" r="3.5" />
              <path d="M10 2.5v2.2M10 15.3v2.2M2.5 10h2.2M15.3 10h2.2M4.3 4.3l1.6 1.6M14.1 14.1l1.6 1.6M15.7 4.3l-1.6 1.6M4.3 15.7l1.6-1.6" />
            </svg>
          </span>
        </button>
      </div>
      <div className="sidebar-footer">
        <span className="user-avatar">A</span>
        <div className="user-meta">
          <strong>Arthur</strong>
          <span>Admin</span>
        </div>
      </div>
    </aside>
  );
}
