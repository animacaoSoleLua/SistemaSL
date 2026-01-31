"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { createWarning, getMembers } from "../../lib/api";
import { getDefaultRoute, getStoredUser, isRoleAllowed } from "../../lib/auth";

export default function NewWarningPage() {
  const router = useRouter();
  const [members, setMembers] = useState<{ id: string; name: string }[]>([]);
  const [selectedMember, setSelectedMember] = useState("");
  const [description, setDescription] = useState("");
  const [date, setDate] = useState("");
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    const user = getStoredUser();
    if (!user) {
      router.push("/login");
      return;
    }
    if (!isRoleAllowed(user.role, ["admin", "animador"])) {
      router.push(getDefaultRoute(user.role));
      return;
    }
    const loadMembers = async () => {
      setLoading(true);
      setError(null);
      try {
        const response = await getMembers();
        setMembers(response.data);
      } catch (err: any) {
        setError(err.message || "Erro ao carregar membros.");
      } finally {
        setLoading(false);
      }
    };
    loadMembers();
  }, [router]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setSaving(true);
    setError(null);
    try {
      await createWarning({
        member_id: selectedMember,
        reason: description.trim(),
        warning_date: date,
      });
      router.push("/advertencias");
    } catch (err: any) {
      setError(err.message || "Erro ao salvar advertencia.");
    } finally {
      setSaving(false);
    }
  };

  return (
    <main className="app-page">
      <section className="shell reveal">
        <header className="page-header">
          <div>
            <h1 className="hero-title">Nova Advertencia</h1>
            <p className="hero-copy">Registre uma ocorrencia do membro.</p>
          </div>
          <Link className="button secondary" href="/advertencias">
            Voltar
          </Link>
        </header>

        <form className="form-layout" onSubmit={handleSubmit}>
          <article className="form-card">
            <div className="form-card-head">
              <h2 className="section-title">Detalhes da advertencia</h2>
              <p>Escolha o membro e descreva o que aconteceu.</p>
            </div>
            <div className="form-grid">
              <label className="field full" htmlFor="member">
                <span>Membro</span>
                <select
                  id="member"
                  className="input"
                  value={selectedMember}
                  onChange={(e) => setSelectedMember(e.target.value)}
                  required
                  disabled={loading || saving}
                >
                  <option value="" disabled>
                    {loading ? "Carregando membros..." : "Selecione um membro"}
                  </option>
                  {members.map((member) => (
                    <option key={member.id} value={member.id}>
                      {member.name}
                    </option>
                  ))}
                </select>
              </label>

              <label className="field full" htmlFor="description">
                <span>Descricao</span>
                <textarea
                  id="description"
                  className="input"
                  rows={6}
                  value={description}
                  onChange={(e) => setDescription(e.target.value)}
                  required
                  disabled={saving}
                />
              </label>

              <label className="field" htmlFor="date">
                <span>Data da ocorrencia</span>
                <input
                  type="date"
                  id="date"
                  className="input"
                  value={date}
                  onChange={(e) => setDate(e.target.value)}
                  required
                  disabled={saving}
                />
              </label>
            </div>
          </article>

          <div className="form-actions">
            <p className="helper">Revise os dados antes de salvar.</p>
            <div className="form-buttons">
              <Link className="button secondary" href="/advertencias">
                Cancelar
              </Link>
              <button type="submit" className="button" disabled={saving}>
                {saving ? "Salvando..." : "Salvar"}
              </button>
            </div>
            {error && <p className="text-red-500">{error}</p>}
          </div>
        </form>
      </section>
    </main>
  );
}
