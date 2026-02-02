"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { createCourse } from "../../lib/api";
import { getDefaultRoute, getStoredUser, isRoleAllowed } from "../../lib/auth";

export default function NovoCursoPage() {
  const router = useRouter();
  const [title, setTitle] = useState("");
  const [description, setDescription] = useState("");
  const [courseDate, setCourseDate] = useState("");
  const [location, setLocation] = useState("");
  const [capacity, setCapacity] = useState("");
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    const user = getStoredUser();
    if (!user) {
      router.push("/login");
      return;
    }
    if (!isRoleAllowed(user.role, ["admin"])) {
      router.push(getDefaultRoute(user.role));
      return;
    }
  }, [router]);

  const handleSubmit = async (event: React.FormEvent) => {
    event.preventDefault();
    setSaving(true);
    setError(null);
    try {
      const parsedCapacity = Number(capacity);
      if (!Number.isInteger(parsedCapacity) || parsedCapacity <= 0) {
        setError("Informe um numero valido de vagas.");
        setSaving(false);
        return;
      }
      await createCourse({
        title: title.trim(),
        description: description.trim() || undefined,
        course_date: courseDate,
        location: location.trim() || undefined,
        capacity: parsedCapacity,
      });
      router.push("/cursos");
    } catch (err: any) {
      setError(err.message || "Erro ao salvar curso.");
    } finally {
      setSaving(false);
    }
  };

  return (
    <main className="app-page">
      <section className="shell reveal">
        <header className="page-header">
          <div>
            <h1 className="hero-title">Novo Curso</h1>
            <p className="hero-copy">Cadastre uma nova turma com informacoes basicas.</p>
          </div>
          <Link className="button secondary" href="/cursos">
            Voltar
          </Link>
        </header>

        <form className="form-layout" onSubmit={handleSubmit}>
          <article className="form-card">
            <div className="form-card-head">
              <h2 className="section-title">Informacoes do curso</h2>
              <p>Dados essenciais para divulgar a turma.</p>
            </div>
            <div className="form-grid">
              <label className="field full">
                <span>Nome do curso</span>
                <input
                  className="input"
                  type="text"
                  placeholder="Ex: Ritmos para iniciantes"
                  value={title}
                  onChange={(e) => setTitle(e.target.value)}
                  required
                  disabled={saving}
                />
              </label>
              <label className="field full">
                <span>Descricao</span>
                <textarea
                  className="input"
                  rows={4}
                  placeholder="Resumo do conteudo do curso"
                  value={description}
                  onChange={(e) => setDescription(e.target.value)}
                  disabled={saving}
                />
              </label>
            </div>
          </article>

          <article className="form-card">
            <div className="form-card-head">
              <h2 className="section-title">Agenda e vagas</h2>
              <p>Data, local e capacidade.</p>
            </div>
            <div className="form-grid">
              <label className="field">
                <span>Data do curso</span>
                <input
                  className="input"
                  type="date"
                  value={courseDate}
                  onChange={(e) => setCourseDate(e.target.value)}
                  required
                  disabled={saving}
                />
              </label>
              <label className="field">
                <span>Vagas disponiveis</span>
                <input
                  className="input"
                  type="number"
                  min={1}
                  placeholder="Ex: 25"
                  value={capacity}
                  onChange={(e) => setCapacity(e.target.value)}
                  required
                  disabled={saving}
                />
              </label>
              <label className="field full">
                <span>Local</span>
                <input
                  className="input"
                  type="text"
                  placeholder="Endereco ou link da sala online"
                  value={location}
                  onChange={(e) => setLocation(e.target.value)}
                  disabled={saving}
                />
              </label>
            </div>
          </article>

          <div className="form-actions">
            <p className="helper">Revise os dados antes de salvar.</p>
            <div className="form-buttons">
              <Link className="button secondary" href="/cursos">
                Cancelar
              </Link>
              <button className="button" type="submit" disabled={saving}>
                {saving ? "Salvando..." : "Publicar curso"}
              </button>
            </div>
            {error && <p className="text-red-500">{error}</p>}
          </div>
        </form>
      </section>
    </main>
  );
}
