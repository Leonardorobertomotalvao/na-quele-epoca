"use client";

import { useState } from "react";
import { ArrowLeft, Check, Mail, Lock, UserRound } from "lucide-react";
import { authClient } from "@/lib/auth-client";

export default function CadastroPage() {
  function destinoAposEntrar() {
    return new URLSearchParams(window.location.search).get("destino") === "sugerir"
      ? "/comunidade#sugerir" : "/";
  }
  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");

  /**
   * A página vai de "criar conta" para "entrar" sem sair do
   * lugar. Por padrão, mantém o fluxo de cadastro que já
   * existia no site.
   */
  const [modo, setModo] = useState<"criar" | "entrar">("criar");

  async function handleCadastro(e: React.FormEvent) {
    e.preventDefault();

    setLoading(true);
    setError("");

    const { error } = await authClient.signUp.email({
      name,
      email,
      password,
    });

    if (error) {
      setError(error.message || "Não foi possível criar a conta.");
      setLoading(false);
      return;
    }

    window.location.href = destinoAposEntrar();
  }

  async function handleEntrar(e: React.FormEvent) {
    e.preventDefault();

    setLoading(true);
    setError("");

    const { error } = await authClient.signIn.email({
      email,
      password,
    });

    if (error) {
      setError(
        error.status === 401
          ? "E-mail ou senha incorretos. Tente novamente."
          : error.message || "Não foi possível entrar."
      );
      setLoading(false);
      return;
    }

    window.location.href = destinoAposEntrar();
  }

  async function handleGoogleLogin() {
    setLoading(true);
    setError("");

    const { error } = await authClient.signIn.social({
      provider: "google",
      callbackURL: destinoAposEntrar(),
    });

    if (error) {
      setError(error.message || "Não foi possível entrar com Google.");
      setLoading(false);
    }
  }

  return (
    <main className="auth-page">
      {/* Decoração do fundo */}
      <div className="auth-decoration auth-decoration-one" />
      <div className="auth-decoration auth-decoration-two" />
      <div className="auth-decoration auth-decoration-three" />

      <div className="auth-container">

        {/* Voltar para o site */}
        <a href="/" className="auth-back">
          <ArrowLeft />
          Voltar para o site
        </a>

        <div className="auth-card">

          {/* Lado esquerdo */}
          <div className="auth-info">
            <div className="auth-brand">
              <span className="auth-brand-mark">✳</span>

              <span>
                Na Minha
                <br />
                <b>Época</b>
              </span>
            </div>

            <div className="auth-mascot">
              <img
                src="/imagens/mascote.png"
                alt="Mascote Na Minha Época"
              />
            </div>

            <h2>
              Vamos criar
              <br />
              <em>memórias?</em>
            </h2>

            <p>
              Crie sua conta e faça parte da comunidade
              <strong> Na Minha Época.</strong>
            </p>

            <div className="auth-benefits">
              <div>
                <span>
                  <Check />
                </span>
                Explore nossas brincadeiras
              </div>

              <div>
                <span>
                  <Check />
                </span>
                Compartilhe suas memórias
              </div>

              <div>
                <span>
                  <Check />
                </span>
                Faça parte da comunidade
              </div>
            </div>
          </div>

          {/* Formulário */}
          <div className="auth-form-area">
            <div className="auth-heading">
              <p className="auth-eyebrow">
                <span />
                BEM-VINDO!
              </p>

              <h1>
                {modo === "criar" ? "Criar conta" : "Entrar"}
              </h1>

              <p>
                {modo === "criar"
                  ? "Crie sua conta para começar a participar."
                  : "Que bom te ver de novo! Entre na sua conta."}
              </p>

              {/* Abas: criar / entrar */}

              <div
                className="auth-mode-tabs"
                role="tablist"
                aria-label="Entrar ou criar conta"
              >
                <button
                  type="button"
                  role="tab"
                  aria-selected={modo === "criar"}
                  className={modo === "criar" ? "active" : ""}
                  onClick={() => {
                    setModo("criar");
                    setError("");
                  }}
                >
                  Criar conta
                </button>

                <button
                  type="button"
                  role="tab"
                  aria-selected={modo === "entrar"}
                  className={modo === "entrar" ? "active" : ""}
                  onClick={() => {
                    setModo("entrar");
                    setError("");
                  }}
                >
                  Já tenho conta
                </button>
              </div>
            </div>

            {/* Google */}
            <button
              type="button"
              className="google-button"
              onClick={handleGoogleLogin}
              disabled={loading}
            >
              <span className="google-icon">G</span>

              {loading
                ? "Aguarde..."
                : "Continuar com Google"}
            </button>

            {/* Divisor */}
            <div className="auth-divider">
              <span>
                ou {modo === "criar"
                  ? "continue com seu e-mail"
                  : "entre com seu e-mail"}
              </span>
            </div>

            <form
              onSubmit={modo === "criar" ? handleCadastro : handleEntrar}
              className="auth-form"
            >

              {/* Nome (apenas ao criar conta) */}
              {modo === "criar" && (
                <div className="auth-field">
                  <label htmlFor="name">
                    Nome
                  </label>

                  <div className="auth-input">
                    <UserRound />

                    <input
                      id="name"
                      type="text"
                      placeholder="Como podemos te chamar?"
                      value={name}
                      onChange={(e) =>
                        setName(e.target.value)
                      }
                      required
                    />
                  </div>
                </div>
              )}

              {/* E-mail */}
              <div className="auth-field">
                <label htmlFor="email">
                  E-mail
                </label>

                <div className="auth-input">
                  <Mail />

                  <input
                    id="email"
                    type="email"
                    placeholder="seuemail@exemplo.com"
                    value={email}
                    onChange={(e) =>
                      setEmail(e.target.value)
                    }
                    required
                  />
                </div>
              </div>

              {/* Senha */}
              <div className="auth-field">
                <label htmlFor="password">
                  Senha
                </label>

                <div className="auth-input">
                  <Lock />

                  <input
                    id="password"
                    type="password"
                    placeholder="Mínimo de 8 caracteres"
                    value={password}
                    onChange={(e) =>
                      setPassword(e.target.value)
                    }
                    required
                    minLength={8}
                  />
                </div>
              </div>

              {/* Erro */}
              {error && (
                <div className="auth-error">
                  {error}
                </div>
              )}

              {/* Enviar */}
              <button
                type="submit"
                className="auth-submit"
                disabled={loading}
              >
                {loading
                  ? modo === "criar"
                    ? "Criando sua conta..."
                    : "Entrando..."
                  : modo === "criar"
                    ? "Criar minha conta"
                    : "Entrar"}
              </button>
            </form>

            <p className="auth-footer-text">
              {modo === "criar"
                ? "Ao criar uma conta, você poderá participar da comunidade e compartilhar suas memórias."
                : "Ao entrar, você volta para a comunidade com suas memórias guardadas."}
            </p>
          </div>
        </div>
      </div>
    </main>
  );
}

