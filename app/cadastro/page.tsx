"use client";

import { useState } from "react";
import { ArrowLeft, Check, Mail, Lock, UserRound } from "lucide-react";
import { authClient } from "@/lib/auth-client";

export default function CadastroPage() {
  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");

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

    window.location.href = "/";
  }

  async function handleGoogleLogin() {
    setLoading(true);
    setError("");

    const { error } = await authClient.signIn.social({
      provider: "google",
      callbackURL: "/",
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

              <h1>Criar conta</h1>

              <p>
                Crie sua conta para começar a participar.
              </p>
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
              <span>ou continue com seu e-mail</span>
            </div>

            <form onSubmit={handleCadastro} className="auth-form">

              {/* Nome */}
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

              {/* Criar conta */}
              <button
                type="submit"
                className="auth-submit"
                disabled={loading}
              >
                {loading
                  ? "Criando sua conta..."
                  : "Criar minha conta"}
              </button>
            </form>

            <p className="auth-footer-text">
              Ao criar uma conta, você poderá participar
              da comunidade e compartilhar suas memórias.
            </p>
          </div>
        </div>
      </div>
    </main>
  );
}

