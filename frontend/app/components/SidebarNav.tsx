"use client";

import Image from "next/image";
import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import { useState, useEffect } from "react";
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
    href: "/novo-relatorio",
    icon: (
      <svg viewBox="0 0 20 20" aria-hidden="true">
        <circle cx="10" cy="10" r="7" />
        <path d="M10 7v6M7 10h6" />
      </svg>
    )
  },
  {
    label: "Advertências",
    href: "/advertencias",
    icon: (
      <svg viewBox="0 0 20 20" aria-hidden="true">
        <path d="M10 3L3 17h14L10 3zm-1 8h2v5h-2v-5zm0-4h2v2h-2V7z" />
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

interface User {
  id: string;
  name: string;
  role: string;
}

function isActive(pathname: string, href: string) {
  if (href === "/") {
    return pathname === "/";
  }
  if (href === "/relatorios") {
    return pathname.startsWith("/relatorios");
  }
  return pathname.startsWith(href);
}

export default function SidebarNav() {
  const pathname = usePathname();
  const router = useRouter();
  const [user, setUser] = useState<User | null>(null);
  const [showLogout, setShowLogout] = useState(false);

  useEffect(() => {
    const storedUser = localStorage.getItem("user");
    if (storedUser) {
      setUser(JSON.parse(storedUser));
    }
  }, []);

  const handleLogout = () => {
    localStorage.removeItem("authToken");
    localStorage.removeItem("user");
    router.push("/login");
  };

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
      
      {/* User profile section */}
      {user && (
        <div className="sidebar-footer-wrapper">
          {showLogout && (
            <div className="logout-popup">
              <button onClick={handleLogout} className="logout-button">
                Sair
              </button>
            </div>
          )}
          <button className="sidebar-footer" onClick={() => setShowLogout(!showLogout)}>
            <span className="user-avatar">{user.name.charAt(0).toUpperCase()}</span>
            <div className="user-meta">
              <strong>{user.name}</strong>
              <span>{user.role}</span>
            </div>
          </button>
        </div>
      )}
    </aside>
  );
}
