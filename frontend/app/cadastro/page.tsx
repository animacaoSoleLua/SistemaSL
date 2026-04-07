"use client";

import './page.css';
import Image from "next/image";
import { useRouter } from "next/navigation";
import { useEffect, useState } from "react";
import { getErrorMessage, registerUser } from "../../lib/api";
import { isStrongPassword, isValidCPF } from "../../lib/validators";
import { formatDateInput, isValidBirthDate } from "../../lib/dateValidators";
import logo from "../../assets/logo.png";

export default function CadastroPage() {
  const router = useRouter();
  const [formData, setFormData] = useState({
    name: "",
    last_name: "",
    cpf: "",
    email: "",
    birth_date: "",
    region: "",
    phone: "",
    pix: "",
    emergency_contact_name: "",
    emergency_contact_phone: "",
    role: "recreador",
    password: "",
    confirmPassword: "",
  });
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);

  useEffect(() => {
    if (!success) return;
    const timer = setTimeout(() => router.push("/login"), 1200);
    return () => clearTimeout(timer);
  }, [success, router]);

  const formatPhone = (value: string) => {
    const digits = value.replace(/\D/g, "").slice(0, 11);

    if (digits.length <= 2) return digits ? `(${digits}` : "";
    if (digits.length <= 6) {
      return `(${digits.slice(0, 2)}) ${digits.slice(2)}`;
    }
    if (digits.length <= 10) {
      return `(${digits.slice(0, 2)}) ${digits.slice(2, 6)}-${digits.slice(6)}`;
    }
    return `(${digits.slice(0, 2)}) ${digits.slice(2, 7)}-${digits.slice(7)}`;
  };

  const formatCpf = (value: string) => {
    const digits = value.replace(/\D/g, "").slice(0, 11);

    if (digits.length <= 3) return digits;
    if (digits.length <= 6) {
      return `${digits.slice(0, 3)}.${digits.slice(3)}`;
    }
    if (digits.length <= 9) {
      return `${digits.slice(0, 3)}.${digits.slice(3, 6)}.${digits.slice(6)}`;
    }
    return `${digits.slice(0, 3)}.${digits.slice(3, 6)}.${digits.slice(6, 9)}-${digits.slice(9)}`;
  };

  const handleChange = (field: string, value: string) => {
    setFormData((prev) => ({ ...prev, [field]: value }));
  };

  const handleSubmit = async (event: React.FormEvent) => {
    event.preventDefault();
    if (loading) return;

    setError(null);
    setSuccess(null);

    if (!formData.name.trim()) { setError("Nome é obrigatório."); return; }
    if (!formData.last_name.trim()) { setError("Sobrenome é obrigatório."); return; }
    if (!formData.cpf.trim()) { setError("CPF é obrigatório."); return; }
    if (!formData.birth_date) { setError("Data de nascimento é obrigatória."); return; }
    if (!formData.region.trim()) { setError("Região / Cidade é obrigatória."); return; }
    if (!formData.phone.trim()) { setError("Telefone é obrigatório."); return; }
    if (!formData.pix.trim()) { setError("Chave Pix é obrigatória."); return; }
    if (!formData.email.trim()) { setError("E-mail é obrigatório."); return; }
    if (!formData.password.trim()) { setError("Senha é obrigatória."); return; }
    if (!formData.confirmPassword.trim()) { setError("Confirme a senha."); return; }

    if (!isValidCPF(formData.cpf)) {
      setError("CPF inválido. Verifique os dígitos.");
      return;
    }

    if (!isValidBirthDate(formData.birth_date)) {
      setError("Data de nascimento inválida. Verifique o formato DD/MM/AAAA.");
      return;
    }

    const pwdError = isStrongPassword(formData.password);
    if (pwdError) {
      setError(pwdError);
      return;
    }

    if (formData.password !== formData.confirmPassword) {
      setError("As senhas não conferem.");
      return;
    }

    setLoading(true);
    try {
      await registerUser({
        name: formData.name.trim(),
        last_name: formData.last_name.trim(),
        cpf: formData.cpf.trim(),
        email: formData.email.trim(),
        birth_date: formData.birth_date.split('/').reverse().join('-'),
        region: formData.region.trim(),
        phone: formData.phone.trim(),
        pix: formData.pix.trim(),
        emergency_contact_name: formData.emergency_contact_name.trim() || undefined,
        emergency_contact_phone: formData.emergency_contact_phone.trim() || undefined,
        role: formData.role,
        password: formData.password,
      });
      setSuccess("Cadastro feito! Agora você pode entrar.");
    } catch (err: unknown) {
      setError(getErrorMessage(err, "Não foi possível concluir o cadastro."));
    } finally {
      setLoading(false);
    }
  };

  return (
    <main className="page login-page">
      <div className="login-card reveal">
        <div className="login-brand">
          <Image src={logo} alt="Sol e Lua Animação" className="login-logo" priority />
        </div>
        <h1 className="login-title">Crie sua conta</h1>
        <p className="login-subtitle">
          Preencha os dados para se cadastrar.
        </p>
        <form className="login-form register-form" onSubmit={handleSubmit}>
          <fieldset className="register-fieldset">
            <legend className="register-legend">Dados pessoais</legend>
            <label className="login-field" htmlFor="reg-name">
              Nome
              <input
                id="reg-name"
                type="text"
                name="name"
                placeholder="Primeiro nome"
                required
                aria-required="true"
                value={formData.name}
                onChange={(e) => handleChange("name", e.target.value)}
                disabled={loading}
              />
            </label>
            <label className="login-field" htmlFor="reg-last-name">
              Sobrenome
              <input
                id="reg-last-name"
                type="text"
                name="last_name"
                placeholder="Sobrenome"
                required
                aria-required="true"
                value={formData.last_name}
                onChange={(e) => handleChange("last_name", e.target.value)}
                disabled={loading}
              />
            </label>
            <label className="login-field" htmlFor="reg-cpf">
              CPF
              <input
                id="reg-cpf"
                type="text"
                name="cpf"
                required
                aria-required="true"
                placeholder="000.000.000-00"
                inputMode="numeric"
                value={formData.cpf}
                onChange={(e) => handleChange("cpf", formatCpf(e.target.value))}
                disabled={loading}
              />
            </label>
            <label className="login-field" htmlFor="reg-birth-date">
              Data de nascimento
              <input
                id="reg-birth-date"
                type="text"
                name="birth_date"
                required
                aria-required="true"
                placeholder="DD/MM/AAAA"
                inputMode="numeric"
                maxLength={10}
                value={formData.birth_date}
                onChange={(e) => handleChange("birth_date", formatDateInput(e.target.value))}
                disabled={loading}
              />
            </label>
            <label className="login-field" htmlFor="reg-region">
              Região / Cidade
              <input
                id="reg-region"
                type="text"
                name="region"
                required
                aria-required="true"
                placeholder="Gama, Riacho..."
                value={formData.region}
                onChange={(e) => handleChange("region", e.target.value)}
                disabled={loading}
              />
            </label>
            <label className="login-field" htmlFor="reg-phone">
              Telefone
              <input
                id="reg-phone"
                type="tel"
                name="phone"
                required
                aria-required="true"
                placeholder="(61) 99999-9999"
                inputMode="numeric"
                value={formData.phone}
                onChange={(e) => handleChange("phone", formatPhone(e.target.value))}
                disabled={loading}
              />
            </label>
            <label className="login-field" htmlFor="reg-pix">
              Chave Pix
              <input
                id="reg-pix"
                type="text"
                name="pix"
                required
                aria-required="true"
                placeholder="CPF, e-mail, celular ou chave aleatória"
                value={formData.pix}
                onChange={(e) => handleChange("pix", e.target.value)}
                disabled={loading}
              />
            </label>
            <label className="login-field" htmlFor="reg-role">
              Função
              <select
                id="reg-role"
                name="role"
                required
                aria-required="true"
                value={formData.role}
                onChange={(e) => handleChange("role", e.target.value)}
                disabled={loading}
              >
                <option value="recreador">Recreador</option>
                <option value="animador">Animador</option>
              </select>
            </label>
            <label className="login-field" htmlFor="reg-emergency-contact-name">
              Contato de emergência<span style={{ fontWeight: 400, color: "#888" }}>(opcional)</span>
              <input
                id="reg-emergency-contact-name"
                type="text"
                name="emergency_contact_name"
                placeholder="Mãe, Pai, Cônjuge..."
                value={formData.emergency_contact_name}
                onChange={(e) => handleChange("emergency_contact_name", e.target.value)}
                disabled={loading}
              />
            </label>
            <label className="login-field" htmlFor="reg-emergency-contact-phone">
              Contato de emergência<span style={{ fontWeight: 400, color: "#888" }}>(opcional)</span>
              <input
                id="reg-emergency-contact-phone"
                type="tel"
                name="emergency_contact_phone"
                placeholder="(61) 99999-9999"
                inputMode="numeric"
                value={formData.emergency_contact_phone}
                onChange={(e) => handleChange("emergency_contact_phone", formatPhone(e.target.value))}
                disabled={loading}
              />
            </label>
          </fieldset>
          <fieldset className="register-fieldset">
            <legend className="register-legend">Acesso</legend>
            <label className="login-field" htmlFor="reg-email">
              E-mail
              <input
                id="reg-email"
                type="email"
                name="email"
                required
                aria-required="true"
                placeholder="seu@email.com"
                value={formData.email}
                onChange={(e) => handleChange("email", e.target.value)}
                disabled={loading}
              />
            </label>
            <label className="login-field" htmlFor="reg-password">
              Senha
              <input
                id="reg-password"
                type="password"
                name="password"
                required
                aria-required="true"
                placeholder="******"
                value={formData.password}
                onChange={(e) => handleChange("password", e.target.value)}
                disabled={loading}
              />
            </label>
            <label className="login-field" htmlFor="reg-confirm-password">
              Confirmar senha
              <input
                id="reg-confirm-password"
                type="password"
                placeholder="******"
                name="confirmPassword"
                required
                aria-required="true"
                value={formData.confirmPassword}
                onChange={(e) => handleChange("confirmPassword", e.target.value)}
                disabled={loading}
              />
            </label>
            <span style={{ fontSize: "0.78rem", color: "#888", marginTop: "2px", display: "block" }}>
                Mínimo 8 caracteres, com letra maiúscula, minúscula e número.
              </span>
          </fieldset>
          {error && (
            <p className="error-message full" role="alert" aria-live="polite">
              {error}
            </p>
          )}
          {success && (
            <p className="success-message full" role="status" aria-live="polite">
              {success}
            </p>
          )}
          <button className="login-button full" type="submit" disabled={loading}>
            {loading ? "Enviando..." : "Finalizar cadastro"}
          </button>
        </form>
        <a className="login-back" href="/login">
          Voltar para o login
        </a>
      </div>
      <span className="login-footer">Animação Sol e Lua</span>
    </main>
  );
}
