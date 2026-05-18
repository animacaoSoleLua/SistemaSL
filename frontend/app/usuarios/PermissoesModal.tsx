"use client";

import "./PermissoesModal.css";
import { useEffect, useRef, useState } from "react";
import {
  FiAlertTriangle,
  FiBarChart2,
  FiFileText,
  FiGrid,
  FiLock,
  FiMessageSquare,
  FiStar,
} from "react-icons/fi";
import { getMemberPermissions, setMemberPermissions } from "../../lib/api";
import type { Role } from "../../lib/auth";

interface Permission {
  value: string;
  label: string;
  description: string;
  icon: React.ReactNode;
}

const ALL_PERMISSIONS: Permission[] = [
  {
    value: "dashboard",
    label: "Dashboard",
    description: "Métricas e estatísticas gerais de eventos",
    icon: <FiGrid aria-hidden="true" />,
  },
  {
    value: "gerencia",
    label: "Gerência",
    description: "Painel de gestão e exportação de dados",
    icon: <FiBarChart2 aria-hidden="true" />,
  },
  {
    value: "relatorios",
    label: "Relatórios",
    description: "Criar e visualizar relatórios de eventos",
    icon: <FiFileText aria-hidden="true" />,
  },
  {
    value: "advertencias",
    label: "Advertências",
    description: "Registrar e consultar advertências",
    icon: <FiAlertTriangle aria-hidden="true" />,
  },
  {
    value: "feedbacks",
    label: "Feedbacks",
    description: "Gerenciar feedbacks dos clientes",
    icon: <FiMessageSquare aria-hidden="true" />,
  },
  {
    value: "habilidades",
    label: "Habilidades",
    description: "Avaliar e editar habilidades dos membros",
    icon: <FiStar aria-hidden="true" />,
  },
];

const DEFAULT_ROLE_PERMISSIONS: Record<Role, string[]> = {
  admin: ["dashboard", "gerencia", "relatorios", "advertencias", "feedbacks", "habilidades"],
  animador: ["relatorios", "advertencias"],
  recreador: [],
};

const ROLE_LABELS: Record<Role, string> = {
  admin: "Admin",
  animador: "Animador",
  recreador: "Recreador",
};

interface Props {
  member: { id: string; name: string; role: Role };
  onClose: () => void;
  onSaved?: (memberId: string, permissions: string[]) => void;
}

export default function PermissoesModal({ member, onClose, onSaved }: Props) {
  const [selected, setSelected] = useState<string[]>([]);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const dialogRef = useRef<HTMLDivElement>(null);

  const defaultPerms = DEFAULT_ROLE_PERMISSIONS[member.role];
  const firstLetter = member.name.charAt(0).toUpperCase();

  const extrasActive = selected.filter(
    (p) => !defaultPerms.includes(p)
  ).length;

  useEffect(() => {
    getMemberPermissions(member.id)
      .then((res) => setSelected(res.data.permissions))
      .catch(() => setError("Não foi possível carregar as permissões."))
      .finally(() => setLoading(false));
  }, [member.id]);

  useEffect(() => {
    const handleKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") onClose();
    };
    window.addEventListener("keydown", handleKey);
    return () => window.removeEventListener("keydown", handleKey);
  }, [onClose]);

  const toggle = (value: string) => {
    setSelected((prev) =>
      prev.includes(value) ? prev.filter((p) => p !== value) : [...prev, value]
    );
  };

  const handleSave = async () => {
    setSaving(true);
    setError(null);
    try {
      await setMemberPermissions(member.id, selected);
      onSaved?.(member.id, selected);
      onClose();
    } catch {
      setError("Não foi possível salvar as permissões.");
    } finally {
      setSaving(false);
    }
  };

  return (
    <div
      className="modal-backdrop"
      role="dialog"
      aria-modal="true"
      aria-labelledby="permissoes-modal-title"
      onClick={(e) => {
        if (e.target === e.currentTarget) onClose();
      }}
    >
      <div className="modal-card perm-modal" ref={dialogRef}>

        {/* Header */}
        <header className="perm-header">
          <div className="perm-header-avatar" aria-hidden="true">
            {firstLetter}
          </div>
          <div className="perm-header-info">
            <span id="permissoes-modal-title" className="perm-header-name">
              {member.name}
            </span>
            <div className="perm-header-meta">
              <span className={`perm-role-badge ${member.role}`}>
                {ROLE_LABELS[member.role]}
              </span>
              {!loading && (
                <span className="perm-extras-count">
                  <strong>{extrasActive}</strong> extra{extrasActive !== 1 ? "s" : ""} ativa{extrasActive !== 1 ? "s" : ""}
                </span>
              )}
            </div>
          </div>
          <button
            type="button"
            className="perm-close"
            aria-label="Fechar"
            onClick={onClose}
          >
            ×
          </button>
        </header>

        {/* Body */}
        <div className="perm-body">
          {loading ? (
            <div className="perm-skeleton" aria-label="Carregando permissões...">
              {Array.from({ length: 6 }).map((_, i) => (
                <div key={i} className="perm-skeleton-row" />
              ))}
            </div>
          ) : (
            ALL_PERMISSIONS.map(({ value, label, description, icon }) => {
              const isDefault = defaultPerms.includes(value);
              const isActive = isDefault || selected.includes(value);

              return (
                <button
                  key={value}
                  type="button"
                  className={`perm-card${isActive ? " perm-card--active" : ""}${isDefault ? " perm-card--locked" : ""}`}
                  onClick={() => !isDefault && toggle(value)}
                  disabled={isDefault}
                  aria-pressed={isActive}
                  aria-label={`${label}${isDefault ? " — incluso no cargo" : isActive ? " — ativo" : " — inativo"}`}
                >
                  <span className="perm-icon">{icon}</span>
                  <span className="perm-content">
                    <span className="perm-label">{label}</span>
                    <span className="perm-description">{description}</span>
                  </span>
                  <span className="perm-status">
                    {isDefault ? (
                      <span className="perm-badge-locked" aria-hidden="true">
                        <FiLock
                          style={{ width: 10, height: 10, marginRight: 4, verticalAlign: "middle", strokeWidth: 2.2 }}
                          aria-hidden="true"
                        />
                        Cargo
                      </span>
                    ) : (
                      <span className="perm-toggle" aria-hidden="true" />
                    )}
                  </span>
                </button>
              );
            })
          )}

          {error && (
            <p role="alert" className="perm-error">
              {error}
            </p>
          )}
        </div>

        {/* Footer */}
        <footer className="perm-footer">
          <button type="button" className="button secondary" onClick={onClose} disabled={saving}>
            Cancelar
          </button>
          <button
            type="button"
            className="button"
            onClick={handleSave}
            disabled={saving || loading}
          >
            {saving ? "Salvando..." : "Salvar"}
          </button>
        </footer>
      </div>
    </div>
  );
}
