"use client";

import Image from "next/image";
import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import { useId, useRef, useState, useEffect } from "react";
import {
  FiAlertTriangle,
  FiBarChart2,
  FiBookOpen,
  FiFileText,
  FiGrid,
  FiMenu,
  FiMessageSquare,
  FiMoon,
  FiSun,
  FiUser,
  FiUsers,
  FiX,
} from "react-icons/fi";
import logo from "../../assets/logo.png";
import { getMember, resolveApiAssetUrl } from "../../lib/api";
import { getStoredUser, roleLabels, type Role } from "../../lib/auth";
import { useTheme } from "../context/ThemeContext";

const navItems = [
  {
    label: "Dashboard",
    href: "/dashboard",
    roles: ["admin"],
    icon: <FiGrid aria-hidden="true" />
  },
  {
    label: "Gerência",
    href: "/gerencia",
    roles: ["admin"],
    icon: <FiBarChart2 aria-hidden="true" />
  },
  {
    label: "Relatorios",
    href: "/relatorios",
    roles: ["admin", "animador"],
    icon: <FiFileText aria-hidden="true" />
  },
  {
    label: "Cursos",
    href: "/cursos",
    roles: ["admin", "animador", "recreador"],
    icon: <FiBookOpen aria-hidden="true" />
  },
  {
    label: "Advertências",
    href: "/advertencias",
    roles: ["admin", "animador"],
    icon: <FiAlertTriangle aria-hidden="true" />
  },
  {
    label: "Feedbacks",
    href: "/feedbacks",
    roles: ["admin"],
    icon: <FiMessageSquare aria-hidden="true" />
  },
  {
    label: "Membros",
    href: "/usuarios",
    roles: ["admin", "animador", "recreador"],
    icon: <FiUsers aria-hidden="true" />
  },
  {
    label: "Perfil",
    href: "/perfil",
    roles: ["admin", "animador", "recreador"],
    icon: <FiUser aria-hidden="true" />
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
  if (href === "/gerencia") {
    return pathname.startsWith("/gerencia");
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
  const { theme, toggle: toggleTheme } = useTheme();
  const [user, setUser] = useState<User | null>(null);
  const [showLogout, setShowLogout] = useState(false);
  const [menuOpen, setMenuOpen] = useState(false);
  const logoutMenuId = useId();
  const mobileMenuId = useId();
  const sidebarFooterRef = useRef<HTMLButtonElement>(null);
  const sidebarFooterWrapperRef = useRef<HTMLDivElement>(null);
  const logoutButtonRef = useRef<HTMLButtonElement>(null);
  const logoutWasOpen = useRef(false);

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
        sessionStorage.setItem(
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

  const handleLogout = async () => {
    try {
      const { logout } = await import("../../lib/api");
      await logout(); // limpa cookie no backend + sessionStorage
    } catch {
      sessionStorage.removeItem("authToken");
      sessionStorage.removeItem("user");
    }
    router.push("/login");
  };

  useEffect(() => {
    if (showLogout) {
      logoutWasOpen.current = true;
      logoutButtonRef.current?.focus();
    } else if (logoutWasOpen.current) {
      // foco retorna ao botão-gatilho quando o menu fecha
      sidebarFooterRef.current?.focus();
    }
  }, [showLogout]);

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

  useEffect(() => {
    if (!showLogout) return;
    const handleClickOutside = (event: MouseEvent) => {
      if (
        sidebarFooterWrapperRef.current &&
        !sidebarFooterWrapperRef.current.contains(event.target as Node)
      ) {
        setShowLogout(false);
      }
    };
    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, [showLogout]);

  useEffect(() => {
    if (!menuOpen) return;
    const handleKeyDown = (event: KeyboardEvent) => {
      if (event.key === "Escape") {
        setMenuOpen(false);
      }
    };
    const originalOverflow = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    window.addEventListener("keydown", handleKeyDown);
    return () => {
      document.body.style.overflow = originalOverflow;
      window.removeEventListener("keydown", handleKeyDown);
    };
  }, [menuOpen]);

  useEffect(() => {
    setMenuOpen(false);
  }, [pathname]);

  return (
    <>
      <header className="app-navbar">
        <button
          type="button"
          className="menu-toggle"
          aria-label="Abrir menu"
          aria-haspopup="dialog"
          aria-expanded={menuOpen}
          aria-controls={mobileMenuId}
          onClick={() => setMenuOpen(true)}
        >
          <FiMenu aria-hidden="true" />
        </button>
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
                  aria-current={active ? "page" : undefined}
                >
                  <span className="nav-icon">{item.icon}</span>
                  {item.label}
                </Link>
              );
            })}
        </nav>
        {/* theme-toggle temporariamente oculto */}
        {user ? (
          <div className="sidebar-footer-wrapper" ref={sidebarFooterWrapperRef}>
            {showLogout && (
              <div className="logout-popup" role="menu" id={logoutMenuId}>
                <button
                  type="button"
                  ref={logoutButtonRef}
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
              ref={sidebarFooterRef}
              onClick={() => setShowLogout(!showLogout)}
              type="button"
              aria-haspopup="menu"
              aria-expanded={showLogout}
              aria-controls={logoutMenuId}
            >
              {user.photo_url ? (
                <Image
                  className="user-avatar avatar-image"
                  src={resolveApiAssetUrl(user.photo_url)}
                  alt={`Foto de ${user.name}`}
                  width={36}
                  height={36}
                  style={{ width: '100%', height: '100%' }}
                  unoptimized
                />
              ) : (
                <span className="user-avatar" aria-hidden="true">
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
      {menuOpen ? (
        <div
          className="mobile-menu-overlay"
          role="presentation"
          onClick={() => setMenuOpen(false)}
        >
          <aside
            className="mobile-menu"
            role="dialog"
            aria-modal="true"
            aria-label="Menu principal"
            id={mobileMenuId}
            onClick={(event) => event.stopPropagation()}
          >
            <div className="mobile-menu-header">
              <Image src={logo} alt="Sol e Lua Animação" className="app-logo" priority />
              <button
                type="button"
                className="mobile-menu-close"
                aria-label="Fechar menu"
                onClick={() => setMenuOpen(false)}
              >
                <FiX aria-hidden="true" />
              </button>
            </div>
            <nav className="mobile-nav" aria-label="Navegação principal">
              {navItems
                .filter((item) => (user ? item.roles.includes(user.role) : false))
                .map((item) => {
                  const active = isActive(pathname, item.href);
                  return (
                    <Link
                      key={item.href}
                      href={item.href}
                      className={`nav-link mobile-nav-link${active ? " active" : ""}`}
                      aria-current={active ? "page" : undefined}
                      onClick={() => setMenuOpen(false)}
                    >
                      <span className="nav-icon">{item.icon}</span>
                      {item.label}
                    </Link>
                  );
                })}
            </nav>
            {user ? (
              <div className="mobile-user-area">
                <div className="mobile-user">
                  {user.photo_url ? (
                    <Image
                      className="user-avatar avatar-image"
                      src={resolveApiAssetUrl(user.photo_url)}
                      alt={`Foto de ${user.name}`}
                      width={36}
                      height={36}
                      unoptimized
                    />
                  ) : (
                    <span className="user-avatar" aria-hidden="true">
                      {user.name.charAt(0).toUpperCase()}
                    </span>
                  )}
                  <div className="user-meta">
                    <strong>{user.name}</strong>
                    <span>{roleLabels[user.role]}</span>
                  </div>
                </div>
                {/* mobile-theme-toggle temporariamente oculto */}
                <button
                  type="button"
                  className="mobile-logout"
                  onClick={handleLogout}
                >
                  Sair
                </button>
              </div>
            ) : null}
          </aside>
        </div>
      ) : null}
    </>
  );
}
