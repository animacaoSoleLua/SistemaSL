"use client";

import { useEffect, useRef, useState } from "react";
import { getMemberPermissions, setMemberPermissions } from "../../lib/api";
import type { Role } from "../../lib/auth";

interface Permission {
  value: string;
  label: string;
}

const ALL_PERMISSIONS: Permission[] = [
  { value: "dashboard", label: "Dashboard" },
  { value: "gerencia", label: "Gerência" },
  { value: "relatorios", label: "Relatórios" },
  { value: "advertencias", label: "Advertências" },
  { value: "feedbacks", label: "Feedbacks" },
  { value: "habilidades", label: "Habilidades" },
];

const DEFAULT_ROLE_PERMISSIONS: Record<Role, string[]> = {
  admin: ["dashboard", "gerencia", "relatorios", "advertencias", "feedbacks", "habilidades"],
  animador: ["relatorios", "advertencias"],
  recreador: [],
};

interface Props {
  member: { id: string; name: string; role: Role };
  onClose: () => void;
}

export default function PermissoesModal({ member, onClose }: Props) {
  const [selected, setSelected] = useState<string[]>([]);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const dialogRef = useRef<HTMLDivElement>(null);

  const defaultPerms = DEFAULT_ROLE_PERMISSIONS[member.role];

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
      <div className="modal-card" ref={dialogRef}>
        <header className="modal-header">
          <h2 id="permissoes-modal-title" className="modal-title">
            Permissões — {member.name}
          </h2>
          <button
            type="button"
            className="modal-close"
            aria-label="Fechar"
            onClick={onClose}
          >
            ×
          </button>
        </header>

        <div className="modal-body">
          {loading ? (
            <p>Carregando...</p>
          ) : (
            <ul style={{ listStyle: "none", padding: 0, margin: 0, display: "flex", flexDirection: "column", gap: 12 }}>
              {ALL_PERMISSIONS.map(({ value, label }) => {
                const isDefault = defaultPerms.includes(value);
                const isChecked = isDefault || selected.includes(value);
                return (
                  <li key={value} style={{ display: "flex", alignItems: "center", gap: 10 }}>
                    <input
                      type="checkbox"
                      id={`perm-${value}`}
                      checked={isChecked}
                      disabled={isDefault}
                      onChange={() => toggle(value)}
                    />
                    <label htmlFor={`perm-${value}`} style={{ opacity: isDefault ? 0.5 : 1 }}>
                      {label}
                      {isDefault && (
                        <span style={{ fontSize: 12, marginLeft: 6, opacity: 0.7 }}>
                          (padrão do role)
                        </span>
                      )}
                    </label>
                  </li>
                );
              })}
            </ul>
          )}
          {error && (
            <p role="alert" style={{ color: "var(--color-danger, red)", marginTop: 12 }}>
              {error}
            </p>
          )}
        </div>

        <footer className="modal-footer">
          <button type="button" className="button secondary" onClick={onClose}>
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
