"use client";

import Image from "next/image";
import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import { useId, useState, useEffect } from "react";
import logo from "../../assets/logo.png";
import { getMember, resolveApiAssetUrl } from "../../lib/api";
import { getStoredUser, roleLabels, type Role } from "../../lib/auth";

const navItems = [
  // {
  //   label: "Dashboard",
  //   href: "/",
  //   roles: ["admin"],
  //   icon: (
  //     <svg viewBox="0 0 20 20" aria-hidden="true">
  //       <rect x="3" y="3" width="6" height="6" rx="1.5" />
  //       <rect x="11" y="3" width="6" height="6" rx="1.5" />
  //       <rect x="3" y="11" width="6" height="6" rx="1.5" />
  //       <rect x="11" y="11" width="6" height="6" rx="1.5" />
  //     </svg>
  //   )
  // },
  // {
  //   label: "Relatorios",
  //   href: "/relatorios",
  //   roles: ["admin", "animador"],
  //   icon: (
  //     <svg viewBox="0 0 20 20" aria-hidden="true">
  //       <path d="M5 3.5h7l3 3V16a1.5 1.5 0 0 1-1.5 1.5h-8A1.5 1.5 0 0 1 4 16V5A1.5 1.5 0 0 1 5.5 3.5z" />
  //       <path d="M12 3.5V7h3" />
  //     </svg>
  //   )
  // },
  {
    label: "Cursos",
    href: "/cursos",
    roles: ["admin", "animador", "recreador"],
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
    roles: ["admin", "animador"],
    icon: (
      <svg viewBox="0 0 20 20" aria-hidden="true">
        <path d="M10 3L3 17h14L10 3zm-1 8h2v5h-2v-5zm0-4h2v2h-2V7z" />
      </svg>
    )
  },
  {
    label: "Membros",
    href: "/usuarios",
    roles: ["admin", "animador", "recreador"],
    icon: (
      <svg viewBox="0 0 20 20" aria-hidden="true">
        <circle cx="10" cy="7.5" r="3.2" />
        <path d="M4.5 16c1-2.5 3.1-4 5.5-4s4.5 1.5 5.5 4" />
      </svg>
    )
  },
  {
    label: "Perfil",
    href: "/perfil",
    roles: ["admin", "animador", "recreador"],
    icon: (
      <svg viewBox="0 0 20 20" aria-hidden="true">
        <circle cx="10" cy="7.5" r="3.2" />
        <path d="M4.5 16c1-2.5 3.1-4 5.5-4s4.5 1.5 5.5 4" />
      </svg>
    )
  },
];

interface User {
  id: string;
  name: string;
  role: Role;
  photo_url?: string | null;
}

function isActive(pathname: string, href: string) {
  if (href === "/") {
    return pathname === "/";
  }
  if (href === "/relatorios") {
    return pathname.startsWith("/relatorios");
  }
  if (href === "/cursos") {
    return pathname.startsWith("/cursos") || pathname.startsWith("/novo-curso");
  }
  if (href === "/perfil") {
    return pathname.startsWith("/perfil");
  }
  return pathname.startsWith(href);
}

export default function SidebarNav() {
  const pathname = usePathname();
  const router = useRouter();
  const [user, setUser] = useState<User | null>(null);
  const [showLogout, setShowLogout] = useState(false);
  const logoutMenuId = useId();

  useEffect(() => {
    const refreshUser = () => {
      setUser(getStoredUser());
    };
    refreshUser();
    window.addEventListener("storage", refreshUser);
    window.addEventListener("user-updated", refreshUser);
    return () => {
      window.removeEventListener("storage", refreshUser);
      window.removeEventListener("user-updated", refreshUser);
    };
  }, []);

  useEffect(() => {
    if (!user || user.photo_url) {
      return;
    }
    let cancelled = false;
    getMember(user.id)
      .then((response) => {
        if (cancelled) return;
        const photoUrl = response?.data?.photo_url ?? null;
        if (!photoUrl) return;
        localStorage.setItem(
          "user",
          JSON.stringify({
            ...user,
            photo_url: photoUrl,
          })
        );
        setUser((current) =>
          current ? { ...current, photo_url: photoUrl } : current
        );
      })
      .catch(() => {});
    return () => {
      cancelled = true;
    };
  }, [user]);

  const handleLogout = () => {
    localStorage.removeItem("authToken");
    localStorage.removeItem("user");
    router.push("/login");
  };

  useEffect(() => {
    if (!showLogout) return;
    const handleKeyDown = (event: KeyboardEvent) => {
      if (event.key === "Escape") {
        setShowLogout(false);
      }
    };
    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, [showLogout]);

  return (
    <header className="app-navbar">
      <div className="app-brand">
        <Image src={logo} alt="Sol e Lua Animação" className="app-logo" priority />
      </div>
      <nav className="app-nav" aria-label="Navegação principal">
        {navItems
          .filter((item) => (user ? item.roles.includes(user.role) : false))
          .map((item) => {
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
      {user ? (
        <div className="sidebar-footer-wrapper">
          {showLogout && (
            <div className="logout-popup" role="menu" id={logoutMenuId}>
              <button
                type="button"
                onClick={handleLogout}
                className="logout-button"
                role="menuitem"
              >
                Sair
              </button>
            </div>
          )}
          <button
            className="sidebar-footer"
            onClick={() => setShowLogout(!showLogout)}
            type="button"
            aria-haspopup="menu"
            aria-expanded={showLogout}
            aria-controls={logoutMenuId}
          >
            {user.photo_url ? (
              <img
                className="user-avatar avatar-image"
                src={resolveApiAssetUrl(user.photo_url)}
                alt={`Foto de ${user.name}`}
              />
            ) : (
              <span className="user-avatar">
                {user.name.charAt(0).toUpperCase()}
              </span>
            )}
            <div className="user-meta">
              <strong>{user.name}</strong>
              <span>{roleLabels[user.role]}</span>
            </div>
          </button>
        </div>
      ) : (
        <div className="sidebar-footer-wrapper" />
      )}
    </header>
  );
}
