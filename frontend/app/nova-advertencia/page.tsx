"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";

// Mock data, replace with API calls
const members = [
  { id: 1, name: "João da Silva" },
  { id: 2, name: "Maria Oliveira" },
];

export default function NewWarningPage() {
  const router = useRouter();
  const [selectedMember, setSelectedMember] = useState("");
  const [description, setDescription] = useState("");
  const [date, setDate] = useState("");

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    // Here you would typically make an API call to save the new warning
    console.log({
      memberId: selectedMember,
      description,
      date,
    });
    router.push("/advertencias");
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
                >
                  <option value="" disabled>
                    Selecione um membro
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
              <button type="submit" className="button">
                Salvar
              </button>
            </div>
          </div>
        </form>
      </section>
    </main>
  );
}
