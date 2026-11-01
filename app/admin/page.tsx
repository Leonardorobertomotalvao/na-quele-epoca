"use client";

// ============================================================
// NA MINHA ÉPOCA — app/admin/page.tsx
// ============================================================
// Painel de moderação das brincadeiras da comunidade.
//
// - Somente acessível por pessoas com papel ADMIN (a proteção
//   real vive no servidor: app/api/admin/brincadeiras);
// - Lista pendentes, aprovadas e rejeitadas;
// - Permite editar, aprovar e rejeitar com motivo;
// - Avisa sobre nomes duplicados (entre envios e contra o
//   catálogo fixo do site);
// - Sem link no menu: endereço direto /admin.
// ============================================================

import { useCallback, useEffect, useState } from "react";

import {
  ArrowLeft,
  Ban,
  Check,
  CheckCircle2,
  Clock,
  LoaderCircle,
  Pencil,
  ShieldAlert,
  TriangleAlert,
} from "lucide-react";

import UserAvatar from "@/components/community/UserAvatar";

import { CATEGORIAS_VALIDAS, LOCAIS_VALIDOS } from "@/lib/validar-brincadeira";

import {

  games,

} from "../games";

import "./admin.css";

type AdminEnvio = {
  id: string;
  name: string;
  image: string | null;
  desc: string;
  how: string;
  materials: string;
  location: string;
  benefits: string[];
  minPlayers: number;
  minAge: number;
  categories: string[];
  safety: string;
  supervision: boolean;
  status: string;
  rejectionReason: string | null;
  reviewedAt: string | null;
  createdAt: string;
  updatedAt: string;
  author: {
    id: string;
    name: string;
    image: string | null;
  };
  duplicidadeDe: string | null;
};

type FormularioEdicao = {
  name: string;
  desc: string;
  how: string;
  materials: string;
  location: string;
  benefits: string;
  minPlayers: string;
  minAge: string;
  safety: string;
  categorias: string[];
};

const FORMULARIO_VAZIO: FormularioEdicao = {
  name: "",
  desc: "",
  how: "",
  materials: "",
  location: LOCAIS_VALIDOS[0],
  benefits: "",
  minPlayers: "2",
  minAge: "5",
  safety: "",
  categorias: [],
};

function formatarData(valor: string | null) {
  if (!valor) {
    return "—";
  }

  return new Date(valor).toLocaleDateString("pt-BR", {
    day: "2-digit",
    month: "2-digit",
    year: "numeric",
  });
}

function nomeIgualDasFixas(nome: string) {
  const limpo = nome
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .toLowerCase()
    .trim();

  return games.some((game) => {
    const limpa = game.name
      .normalize("NFD")
      .replace(/[\u0300-\u036f]/g, "")
      .toLowerCase()
      .trim();

    return limpa === limpo;
  });
}

export default function AdminPage() {
  const [carregando, setCarregando] = useState(true);

  const [estado, setEstado] = useState<
    "ok" | "sem-sessao" | "sem-permissao" | "erro"
  >("ok");

  const [envios, setEnvios] = useState<AdminEnvio[]>([]);

  const [editandoId, setEditandoId] = useState<string | null>(null);
  const [formulario, setFormulario] =
    useState<FormularioEdicao>(FORMULARIO_VAZIO);

  const [motivos, setMotivos] = useState<Record<string, string>>({});

  const [acaoEmAndamento, setAcaoEmAndamento] =
    useState<string | null>(null);

  const [carregandoAcao, setCarregandoAcao] = useState(false);

  /** ================= CARREGA OS ENVIOS ================= */

  const carregar = useCallback(async () => {
    try {
      setCarregando(true);

      const resposta = await fetch("/api/admin/brincadeiras", {
        cache: "no-store",
      });

      if (resposta.status === 401) {
        setEstado("sem-sessao");
        return;
      }

      if (resposta.status === 403) {
        setEstado("sem-permissao");
        return;
      }

      if (!resposta.ok) {
        setEstado("erro");
        return;
      }

      const dados = await resposta.json();

      if (Array.isArray(dados)) {
        setEnvios(dados);
        setEstado("ok");
      }
    } catch {
      setEstado("erro");
    } finally {
      setCarregando(false);
    }
  }, []);

  useEffect(() => {
    carregar();
  }, [carregar]);

  /** ================= AÇÕES DA MODERAÇÃO ================= */

  async function enviarAcao(
    id: string,
    action: "aprovar" | "rejeitar" | "salvar",
    extras: Record<string, unknown> = {}
  ) {
    setCarregandoAcao(true);
    setAcaoEmAndamento(`${action}:${id}`);

    try {
      const resposta = await fetch("/api/admin/brincadeiras", {
        method: "PATCH",

        headers: {
          "Content-Type": "application/json",
        },

        body: JSON.stringify({
          id,
          action,
          ...extras,
        }),
      });

      const dados = await resposta.json().catch(() => null);

      if (!resposta.ok) {
        window.alert(
          dados?.error || "Não foi possível concluir a ação."
        );

        return;
      }

      if (action === "rejeitar" || action === "aprovar") {
        setEditandoId(null);
      }

      await carregar();
    } catch {
      window.alert("Não foi possível concluir a ação agora.");
    } finally {
      setCarregandoAcao(false);
      setAcaoEmAndamento(null);
    }
  }

  function abrirEdicao(item: AdminEnvio) {
    setEditandoId(item.id);

    setFormulario({
      name: item.name,
      desc: item.desc,
      how: item.how,
      materials: item.materials,
      location: LOCAIS_VALIDOS.includes(
        item.location as (typeof LOCAIS_VALIDOS)[number]
      )
        ? item.location
        : LOCAIS_VALIDOS[0],

      benefits: item.benefits.join(", "),
      minPlayers: String(item.minPlayers),
      minAge: String(item.minAge),
      safety: item.safety,
      categorias: [...item.categories],
    });
  }

  function alternarCategoriaEdicao(categoria: string) {
    setFormulario((atual) => ({
      ...atual,

      categorias: atual.categorias.includes(categoria)
        ? atual.categorias.filter((item) => item !== categoria)
        : [...atual.categorias, categoria],
    }));
  }

  /** ================= RENDERS AUXILIARES ================= */

  const pendentes = envios.filter((item) => item.status === "PENDENTE");
  const aprovadas = envios.filter((item) => item.status === "APROVADO");
  const rejeitadas = envios.filter((item) => item.status === "REJEITADO");

  if (estado !== "ok" || carregando) {
    return (
      <main className="admin-page">
        <div className="admin-mensagem">
          {carregando || estado === "ok" ? (
            <>
              <LoaderCircle className="spin" size={30} />

              <p>Abrindo a moderação…</p>
            </>
          ) : estado === "sem-sessao" ? (
            <>
              <ShieldAlert size={34} />

              <h1>Entre com sua conta</h1>

              <p>
                A moderação é restrita. Se a sua conta é de
                administradora ou administrador, entre primeiro.
              </p>

              <a href="/cadastro" className="admin-botao">
                Ir para a página de entrada
              </a>
            </>
          ) : estado === "sem-permissao" ? (
            <>
              <Ban size={34} />

              <h1>Sem permissão</h1>

              <p>
                Este espaço é destinado apenas à administração do site.
              </p>

              <a href="/" className="admin-botao">
                Voltar para o site
              </a>
            </>
          ) : (
            <>
              <TriangleAlert size={34} />

              <h1>Algo deu errado</h1>

              <p>
                Não conseguimos carregar os envios agora.
              </p>

              <button
                type="button"
                className="admin-botao"
                onClick={carregar}
              >
                Tentar de novo
              </button>
            </>
          )}
        </div>
      </main>
    );
  }

  return (
    <main className="admin-page">
      <a href="/" className="admin-back">
        <ArrowLeft size={16} />

        Voltar para o site
      </a>

      <header className="admin-heading">
        <div>
          <span className="admin-label">
            MODERAÇÃO DO CATÁLOGO
          </span>

          <h1>Brincadeiras da comunidade</h1>

          <p>
            Revisar, editar, aprovar ou devolver com um motivo as
            brincadeiras enviadas.
          </p>
        </div>

        <div className="admin-contadores">
          <span className="admin-contador pendente">
            <Clock size={13} />

            {pendentes.length} pendentes
          </span>

          <span className="admin-contador aprovada">
            <CheckCircle2 size={13} />

            {aprovadas.length} aprovadas
          </span>

          <span className="admin-contador rejeitada">
            <Ban size={13} />

            {rejeitadas.length} rejeitadas
          </span>
        </div>
      </header>

      {/* ================= PENDENTES ================= */}

      <section className="admin-section">
        <h2>
          Aguardando revisão

          <small>{pendentes.length}</small>
        </h2>

        {pendentes.length === 0 ? (
          <p className="admin-vazio">
            Nada pendente por aqui. A comunidade está em dia! ✓
          </p>
        ) : (
          <div className="admin-lista">
            {pendentes.map((item) => {
              const duplicadaDasFixas = nomeIgualDasFixas(item.name);

              return (
                <article
                  className="admin-card"
                  key={item.id}
                >
                  <header className="admin-card-header">
                    <UserAvatar
                      name={item.author?.name}
                      image={item.author?.image}
                      size={38}
                    />

                    <div className="admin-card-quem">
                      <strong>{item.name}</strong>

                      <span>
                        Enviada por {(item.author?.name || "…").trim()} {

                          formatarData(item.createdAt)
                        }
                      </span>
                    </div>

                    <div className="admin-card-chips">
                      {(duplicadaDasFixas ||
                        item.duplicidadeDe) && (
                          <span className="admin-chip aviso">
                            <TriangleAlert size={12} />

                            {duplicadaDasFixas
                              ? "Já existe no catálogo"
                              : `Igual a “${item.duplicidadeDe}”`}
                          </span>
                        )}
                    </div>
                  </header>

                  {item.image && (
                    <img
                      className="admin-card-imagem"
                      src={item.image}
                      alt={`Imagem enviada para ${item.name}`}
                      onError={(event) => {
                        event.currentTarget.style.display =
                          "none";
                      }}
                    />
                  )}

                  {editandoId === item.id ? (
                    <div className="admin-editar">
                      {/* ---- campos ---- */}

                      <label>
                        Nome

                        <input
                          value={formulario.name}
                          maxLength={60}
                          onChange={(event) =>
                            setFormulario({
                              ...formulario,
                              name: event.target.value,
                            })
                          }
                        />
                      </label>

                      <label>
                        Descrição

                        <textarea
                          value={formulario.desc}
                          maxLength={500}
                          onChange={(event) =>
                            setFormulario({
                              ...formulario,
                              desc: event.target.value,
                            })
                          }
                        />
                      </label>

                      <label>
                        Como brincar

                        <textarea
                          value={formulario.how}
                          maxLength={2000}
                          rows={5}
                          onChange={(event) =>
                            setFormulario({
                              ...formulario,
                              how: event.target.value,
                            })
                          }
                        />
                      </label>

                      <div className="admin-grid-2">
                        <label>
                          Materiais

                          <input
                            value={formulario.materials}
                            maxLength={300}
                            onChange={(event) =>
                              setFormulario({
                                ...formulario,
                                materials:
                                  event.target.value,
                              })
                            }
                          />
                        </label>

                        <label>
                          Local indicado

                          <select
                            value={formulario.location}
                            onChange={(event) =>
                              setFormulario({
                                ...formulario,
                                location:
                                  event.target.value,
                              })
                            }
                          >
                            {LOCAIS_VALIDOS.map((local) => (
                              <option key={local} value={local}>
                                {local}
                              </option>
                            ))}
                          </select>
                        </label>
                      </div>

                      <label>
                        Habilidades (separadas por vírgula)

                        <input
                          value={formulario.benefits}
                          onChange={(event) =>
                            setFormulario({
                              ...formulario,
                              benefits: event.target.value,
                            })
                          }
                        />
                      </label>

                      <div className="admin-grid-2">
                        <label>
                          Mínimo de participantes

                          <input
                            type="number"
                            min={1}
                            max={50}
                            value={formulario.minPlayers}
                            onChange={(event) =>
                              setFormulario({
                                ...formulario,
                                minPlayers:
                                  event.target.value,
                              })
                            }
                          />
                        </label>

                        <label>
                          Idade mínima

                          <input
                            type="number"
                            min={3}
                            max={99}
                            value={formulario.minAge}
                            onChange={(event) =>
                              setFormulario({
                                ...formulario,
                                minAge: event.target.value,
                              })
                            }
                          />
                        </label>
                      </div>

                      <div className="admin-categorias">
                        {CATEGORIAS_VALIDAS.map((categoria) => (
                          <button
                            key={categoria}
                            type="button"
                            className={
                              formulario.categorias.includes(
                                categoria
                              )
                                ? "selected"
                                : ""
                            }
                            aria-pressed={formulario.categorias.includes(
                              categoria
                            )}
                            onClick={() =>
                              alternarCategoriaEdicao(
                                categoria
                              )
                            }
                          >
                            {categoria}
                          </button>
                        ))}
                      </div>

                      <label>
                        Dicas de segurança

                        <textarea
                          value={formulario.safety}
                          maxLength={600}
                          onChange={(event) =>
                            setFormulario({
                              ...formulario,
                              safety: event.target.value,
                            })
                          }
                        />
                      </label>

                      {/* ---- ações ---- */}

                      <div className="admin-card-acoes">
                        <button
                          type="button"
                          className="admin-botao secundario"
                          onClick={() => setEditandoId(null)}
                        >
                          Cancelar
                        </button>

                        <button
                          type="button"
                          className="admin-botao neutro"
                          disabled={carregandoAcao}
                          onClick={() =>
                            enviarAcao(item.id, "salvar", {
                              edits: {
                                name: formulario.name.trim(),
                                desc: formulario.desc.trim(),
                                how: formulario.how.trim(),
                                materials:
                                  formulario.materials.trim(),
                                location: formulario.location,
                                benefits: formulario.benefits
                                  .split(",")
                                  .map((parte) => parte.trim())
                                  .filter(Boolean),
                                minPlayers: Number(
                                  formulario.minPlayers
                                ),
                                minAge: Number(formulario.minAge),
                                categories:
                                  formulario.categorias,
                                safety: formulario.safety.trim(),
                                supervision: item.supervision,
                              },
                            })
                          }
                        >
                          <Pencil size={13} />

                          Salvar edições
                        </button>

                        <button
                          type="button"
                          className="admin-botao primario"
                          disabled={carregandoAcao}
                          onClick={() =>
                            enviarAcao(item.id, "aprovar", {
                              edits: {
                                name: formulario.name.trim(),
                                desc: formulario.desc.trim(),
                                how: formulario.how.trim(),
                                materials:
                                  formulario.materials.trim(),
                                location: formulario.location,
                                benefits: formulario.benefits
                                  .split(",")
                                  .map((parte) => parte.trim())
                                  .filter(Boolean),
                                minPlayers: Number(
                                  formulario.minPlayers
                                ),
                                minAge: Number(formulario.minAge),
                                categories:
                                  formulario.categorias,
                                safety: formulario.safety.trim(),
                                supervision: item.supervision,
                              },
                            })
                          }
                        >
                          <Check size={14} />

                          Aprovar com estas edições
                        </button>
                      </div>
                    </div>
                  ) : (
                    <>
                      <div className="admin-fatos">
                        <div>
                          <small>DESCRIÇÃO</small>

                          <p>{item.desc}</p>
                        </div>

                        <div>
                          <small>COMO BRINCAR</small>

                          <p>{item.how}</p>
                        </div>

                        <div>
                          <small>MATERIAIS</small>

                          <p>{item.materials}</p>
                        </div>

                        <div>
                          <small>LOCAL</small>

                          <p>{item.location}</p>
                        </div>

                        <div>
                          <small>PARTICIPANTES</small>

                          <p>{item.minPlayers} ou mais</p>
                        </div>

                        <div>
                          <small>IDADE</small>

                          <p>A partir de {item.minAge} anos</p>
                        </div>

                        {item.safety && (
                          <div>
                            <small>SEGURANÇA</small>

                            <p>
                              {item.safety}
                              {item.supervision
                                ? " Recomendada supervisão de um adulto."
                                : ""}
                            </p>
                          </div>
                        )}

                        {item.benefits.length > 0 && (
                          <div>
                            <small>HABILIDADES</small>

                            <p>{item.benefits.join(", ")}</p>
                          </div>
                        )}
                      </div>

                      <div className="admin-categorias somentes">
                        {item.categories.map((categoria) => (
                          <span key={categoria}>{categoria}</span>
                        ))}
                      </div>

                      <div className="admin-card-acoes">
                        <button
                          type="button"
                          className="admin-botao neutro"
                          disabled={carregandoAcao}
                          onClick={() => abrirEdicao(item)}
                        >
                          <Pencil size={13} />

                          Editar
                        </button>

                        <button
                          type="button"
                          className="admin-botao primario"
                          disabled={carregandoAcao}
                          onClick={() =>
                            enviarAcao(item.id, "aprovar")
                          }
                        >
                          <Check size={14} />

                          Aprovar
                        </button>

                        <button
                          type="button"
                          className="admin-botao perigo"
                          disabled={carregandoAcao}
                          onClick={() =>
                            enviarAcao(item.id, "rejeitar", {
                              rejectionReason: (
                                motivos[item.id] || ""
                              ).trim(),
                            })
                          }
                        >
                          <Ban size={13} />

                          Rejeitar
                        </button>
                      </div>

                      <div className="admin-motivo">
                        <label
                          htmlFor={`motivo-${item.id}`}
                        >
                          Motivo da rejeição (aparece para
                          quem enviou, 5 a 400 letras)

                          <textarea
                            id={`motivo-${item.id}`}
                            value={motivos[item.id] || ""}
                            maxLength={400}
                            placeholder="Ex.: já temos uma brincadeira muito parecida no catálogo; revise o modo de brincar antes de enviar de novo."
                            onChange={(event) =>
                              setMotivos({
                                ...motivos,
                                [item.id]: event.target.value,
                              })
                            }
                          />
                        </label>
                      </div>
                    </>
                  )}
                </article>
              );
            })}
          </div>
        )}
      </section>

      {/* ================= APROVADAS ================= */}

      <section className="admin-section">
        <h2>
          Já no catálogo

          <small>{aprovadas.length}</small>
        </h2>

        {aprovadas.length === 0 ? (
          <p className="admin-vazio">
            Nenhuma brincadeira aprovada ainda.
          </p>
        ) : (
          <div className="admin-lista compacta">
            {aprovadas.map((item) => (
              <article
                className="admin-card compacto"
                key={item.id}
              >
                <div className="admin-card-quem">
                  <strong>{item.name}</strong>

                  <span>
                    {(item.author?.name || "…").trim()} • revisada em{" "}

                    {formatarData(item.reviewedAt)}
                  </span>
                </div>

                <div className="admin-categorias somentes">
                  {item.categories.map((categoria) => (
                    <span key={categoria}>{categoria}</span>
                  ))}
                </div>
              </article>
            ))}
          </div>
        )}
      </section>

      {/* ================= REJEITADAS ================= */}

      <section className="admin-section">
        <h2>
          Não entraram

          <small>{rejeitadas.length}</small>
        </h2>

        {rejeitadas.length === 0 ? (
          <p className="admin-vazio">
            Nenhuma rejeição até agora.
          </p>
        ) : (
          <div className="admin-lista compacta">
            {rejeitadas.map((item) => (
              <article
                className="admin-card compacto"
                key={item.id}
              >
                <div className="admin-card-quem">
                  <strong>{item.name}</strong>

                  <span>
                    {(item.author?.name || "…").trim()} • revisada em{" "}

                    {formatarData(item.reviewedAt)}
                  </span>
                </div>

                {item.rejectionReason && (
                  <p className="admin-motivo-registro">
                    Motivo: {item.rejectionReason}
                  </p>
                )}
              </article>
            ))}
          </div>
        )}
      </section>
    </main>
  );
}
