'use client'

import { useMemo, useState } from 'react'

import {
  ArrowLeft,
  ArrowRight,
  Check,
  Clock3,
  Hammer,
  Package,
  Recycle,
  ShieldCheck,
  Sparkles,
  Users,
  X,
} from 'lucide-react'

import './oficina.css'

type Toy = {
  id: string
  name: string
  emoji: string
  description: string
  age: string
  time: string
  difficulty: string
  materials: string[]
  steps: string[]
  safety: string
  memory: string
}

const materials = [
  {
    id: 'papelao',
    label: 'Papelão',
    emoji: '📦',
  },
  {
    id: 'garrafa',
    label: 'Garrafa PET',
    emoji: '🧴',
  },
  {
    id: 'barbante',
    label: 'Barbante',
    emoji: '🧵',
  },
  {
    id: 'tampinhas',
    label: 'Tampinhas',
    emoji: '🔵',
  },
  {
    id: 'palitos',
    label: 'Palitos',
    emoji: '🪵',
  },
  {
    id: 'papel',
    label: 'Papel',
    emoji: '📄',
  },
  {
    id: 'fita',
    label: 'Fita adesiva',
    emoji: '🩹',
  },
  {
    id: 'tinta',
    label: 'Tinta',
    emoji: '🎨',
  },
  {
    id: 'latas',
    label: 'Latas',
    emoji: '🥫',
  },
  {
    id: 'copos',
    label: 'Copos',
    emoji: '🥤',
  },
]

const toys: Toy[] = [
  {
    id: 'telefone-barbante',
    name: 'Telefone de Barbante',
    emoji: '☎️',
    description:
      'Dois copos e um barbante viram uma experiência divertida sobre som e comunicação.',
    age: '7+ anos',
    time: '15 min',
    difficulty: 'Fácil',
    materials: ['copos', 'barbante'],
    safety:
      'Um adulto deve fazer os pequenos furos nos copos.',
    memory:
      'Antes das mensagens instantâneas, muita criança descobria brincando que o som também podia viajar por um fio.',
    steps: [
      'Separe dois copos e um pedaço comprido de barbante.',
      'Peça para um adulto fazer um pequeno furo no fundo de cada copo.',
      'Passe uma ponta do barbante por cada copo e dê um nó por dentro.',
      'Afaste os copos até o barbante ficar esticado.',
      'Uma pessoa fala em um copo enquanto a outra escuta pelo outro.',
    ],
  },

  {
    id: 'boliche-garrafas',
    name: 'Boliche de Garrafas',
    emoji: '🎳',
    description:
      'Garrafas vazias podem virar uma pista de boliche para brincar dentro ou fora de casa.',
    age: '5+ anos',
    time: '10 min',
    difficulty: 'Muito fácil',
    materials: ['garrafa'],
    safety:
      'Use apenas garrafas vazias, limpas e sem partes pontiagudas.',
    memory:
      'Nem sempre era preciso ter brinquedos comprados. Algumas garrafas e uma bola já podiam render uma tarde inteira.',
    steps: [
      'Separe entre seis e dez garrafas PET vazias.',
      'Organize as garrafas formando um triângulo.',
      'Marque uma linha de onde os jogadores irão lançar.',
      'Use uma bola leve para tentar derrubar as garrafas.',
      'Conte quantas foram derrubadas e faça novas rodadas.',
    ],
  },

  {
    id: 'carrinho-papelao',
    name: 'Carrinho de Papelão',
    emoji: '🚗',
    description:
      'Papelão, tampinhas e criatividade podem virar um pequeno carrinho artesanal.',
    age: '7+ anos',
    time: '30 min',
    difficulty: 'Médio',
    materials: [
      'papelao',
      'tampinhas',
      'palitos',
      'fita',
    ],
    safety:
      'Se for necessário perfurar ou cortar papelão grosso, peça ajuda de um adulto.',
    memory:
      'Carrinhos feitos à mão eram diferentes uns dos outros. Cada criança acabava criando seu próprio modelo.',
    steps: [
      'Recorte um retângulo de papelão para formar a base.',
      'Separe quatro tampinhas para utilizar como rodas.',
      'Peça ajuda para fazer os furos necessários nas rodas.',
      'Passe os palitos formando dois eixos.',
      'Prenda as rodas e teste se conseguem girar livremente.',
      'Decore o carrinho do seu jeito.',
    ],
  },

  {
    id: 'bilboque',
    name: 'Bilboquê de Garrafa',
    emoji: '🎯',
    description:
      'Uma garrafa reutilizada pode virar um desafio de coordenação que você vai querer repetir várias vezes.',
    age: '7+ anos',
    time: '20 min',
    difficulty: 'Médio',
    materials: [
      'garrafa',
      'barbante',
      'papel',
      'fita',
    ],
    safety:
      'O corte da garrafa deve ser feito exclusivamente por um adulto e todas as bordas precisam ficar protegidas com fita.',
    memory:
      'O bilboquê existe em muitas versões e mostra como uma ideia simples pode atravessar diferentes gerações.',
    steps: [
      'Peça para um adulto preparar uma parte segura da garrafa PET.',
      'Proteja completamente as bordas com fita adesiva.',
      'Faça uma pequena bola usando papel amassado.',
      'Prenda a bola em uma ponta do barbante.',
      'Prenda a outra ponta do barbante no brinquedo.',
      'Tente lançar a bola e encaixá-la dentro da abertura.',
    ],
  },

  {
    id: 'vai-e-vem',
    name: 'Vai-e-Vem',
    emoji: '🪀',
    description:
      'Um brinquedo para duas pessoas feito com materiais reutilizados e muito movimento.',
    age: '8+ anos',
    time: '35 min',
    difficulty: 'Médio',
    materials: [
      'garrafa',
      'barbante',
      'fita',
    ],
    safety:
      'A preparação e o corte das garrafas devem ser feitos por um adulto. Proteja todas as bordas.',
    memory:
      'O vai-e-vem marcou muitas infâncias e era ainda melhor quando construído junto com alguém.',
    steps: [
      'Peça para um adulto preparar as partes necessárias das garrafas.',
      'Una as partes e proteja tudo com fita adesiva.',
      'Passe dois barbantes compridos pelo brinquedo.',
      'Faça alças seguras nas extremidades.',
      'Cada pessoa segura um lado.',
      'Abra e feche os braços alternadamente para fazer o brinquedo viajar.',
    ],
  },

  {
    id: 'pe-de-lata',
    name: 'Pé de Lata',
    emoji: '🥫',
    description:
      'Um brinquedo clássico de equilíbrio feito com duas latas e barbante.',
    age: '8+ anos',
    time: '20 min',
    difficulty: 'Médio',
    materials: ['latas', 'barbante'],
    safety:
      'Use somente latas sem bordas cortantes. Um adulto deve verificar as latas e fazer todos os furos.',
    memory:
      'Equilibrar-se no pé de lata transformava uma caminhada simples em um verdadeiro desafio.',
    steps: [
      'Escolha duas latas firmes e sem qualquer borda cortante.',
      'Peça para um adulto fazer dois furos seguros em cada lata.',
      'Passe o barbante pelos furos.',
      'Ajuste o comprimento para que as mãos consigam segurá-lo confortavelmente.',
      'Comece segurando em algum apoio.',
      'Quando estiver seguro, tente caminhar devagar.',
    ],
  },
]

function materialLabel(id: string) {
  return (
    materials.find((material) => material.id === id)
      ?.label || id
  )
}

export default function OficinaPage() {
  const [selectedMaterials, setSelectedMaterials] =
    useState<string[]>([])

  const [showResults, setShowResults] =
    useState(false)

  const [selectedToy, setSelectedToy] =
    useState<Toy | null>(null)

  function toggleMaterial(id: string) {
    setSelectedMaterials((current) =>
      current.includes(id)
        ? current.filter(
            (materialId) => materialId !== id
          )
        : [...current, id]
    )

    setShowResults(false)
  }

  const recommendations = useMemo(() => {
    return toys
      .map((toy) => {
        const missing = toy.materials.filter(
          (material) =>
            !selectedMaterials.includes(material)
        )

        const available =
          toy.materials.length - missing.length

        return {
          toy,
          missing,
          available,
        }
      })
      .sort((a, b) => {
        if (
          a.missing.length !==
          b.missing.length
        ) {
          return (
            a.missing.length -
            b.missing.length
          )
        }

        return b.available - a.available
      })
  }, [selectedMaterials])

  function surpriseMe() {
    const random =
      toys[
        Math.floor(
          Math.random() * toys.length
        )
      ]

    setSelectedToy(random)
  }

  return (
    <main className="workshop-page">

      {/* TOPO */}

      <div className="workshop-top">
        <a
          href="/"
          className="workshop-back"
        >
          <ArrowLeft size={18} />
          Voltar para o site
        </a>

        <span className="workshop-top-badge">
          <Recycle size={15} />
          Criar • Reutilizar • Brincar
        </span>
      </div>

      {/* HERO */}

      <section className="workshop-hero">
        <div className="workshop-hero-copy">
          <span className="workshop-label">
            <Hammer size={15} />
            OFICINA DA MINHA ÉPOCA
          </span>

          <h1>
            Coisas simples podem virar
            <em> grandes brincadeiras.</em>
          </h1>

          <p>
            Escolha o que você tem em casa.
            A Oficina encontra brinquedos que
            você pode construir e ensina tudo
            passo a passo.
          </p>

          <div className="workshop-hero-actions">
            <a href="#materiais">
              Começar minha oficina
              <ArrowRight size={18} />
            </a>

            <button
              type="button"
              onClick={surpriseMe}
            >
              <Sparkles size={18} />
              Desafio surpresa
            </button>
          </div>
        </div>

        <div className="transformation-card">
          <span className="transformation-title">
            A MÁGICA DA OFICINA
          </span>

          <div className="transformation">
            <div>
              <span className="transformation-emoji">
                🧴
              </span>

              <strong>Antes</strong>

              <small>
                Uma garrafa vazia
              </small>
            </div>

            <ArrowRight />

            <div>
              <span className="transformation-emoji">
                🎯
              </span>

              <strong>Depois</strong>

              <small>
                Um novo brinquedo
              </small>
            </div>
          </div>

          <p>
            “Criatividade também é saber
            enxergar possibilidades.”
          </p>
        </div>
      </section>

      {/* MATERIAIS */}

      <section
        className="materials-section"
        id="materiais"
      >
        <div className="workshop-section-heading">
          <div>
            <span>
              PASSO 1
            </span>

            <h2>
              O que você tem por aí?
            </h2>
          </div>

          <p>
            Marque os materiais disponíveis
            na sua casa. Você pode selecionar
            quantos quiser.
          </p>
        </div>

        <div className="materials-grid">
          {materials.map((material) => {
            const selected =
              selectedMaterials.includes(
                material.id
              )

            return (
              <button
                type="button"
                key={material.id}
                className={
                  selected
                    ? 'material-card selected'
                    : 'material-card'
                }
                aria-pressed={selected}
                onClick={() =>
                  toggleMaterial(material.id)
                }
              >
                <span className="material-emoji">
                  {material.emoji}
                </span>

                <strong>
                  {material.label}
                </strong>

                <span className="material-check">
                  {selected && (
                    <Check size={15} />
                  )}
                </span>
              </button>
            )
          })}
        </div>

        <div className="materials-actions">
          <span>
            {selectedMaterials.length}{' '}
            {selectedMaterials.length === 1
              ? 'material selecionado'
              : 'materiais selecionados'}
          </span>

          <div>
            {selectedMaterials.length >
              0 && (
              <button
                type="button"
                className="materials-clear"
                onClick={() => {
                  setSelectedMaterials([])
                  setShowResults(false)
                }}
              >
                Limpar
              </button>
            )}

            <button
              type="button"
              className="discover-button"
              disabled={
                selectedMaterials.length === 0
              }
              onClick={() =>
                setShowResults(true)
              }
            >
              <Sparkles size={18} />

              Descobrir o que posso criar

              <ArrowRight size={18} />
            </button>
          </div>
        </div>
      </section>

      {/* RESULTADOS */}

      {showResults && (
        <section className="workshop-results">
          <div className="workshop-section-heading">
            <div>
              <span>
                PASSO 2
              </span>

              <h2>
                Sua oficina encontrou
                estas ideias
              </h2>
            </div>

            <p>
              As melhores combinações aparecem
              primeiro.
            </p>
          </div>

          <div className="toy-grid">
            {recommendations.map(
              ({ toy, missing }) => {
                const canBuild =
                  missing.length === 0

                return (
                  <article
                    className={
                      canBuild
                        ? 'toy-card ready'
                        : 'toy-card'
                    }
                    key={toy.id}
                  >
                    <div className="toy-card-top">
                      <span className="toy-emoji">
                        {toy.emoji}
                      </span>

                      <span
                        className={
                          canBuild
                            ? 'toy-status ready'
                            : 'toy-status'
                        }
                      >
                        {canBuild
                          ? '✓ Você já tem tudo'
                          : `${missing.length} ${
                              missing.length ===
                              1
                                ? 'item faltando'
                                : 'itens faltando'
                            }`}
                      </span>
                    </div>

                    <h3>
                      {toy.name}
                    </h3>

                    <p>
                      {toy.description}
                    </p>

                    <div className="toy-meta">
                      <span>
                        <Clock3 size={14} />
                        {toy.time}
                      </span>

                      <span>
                        <Users size={14} />
                        {toy.age}
                      </span>
                    </div>

                    {!canBuild && (
                      <div className="toy-missing">
                        <small>
                          AINDA FALTA
                        </small>

                        <span>
                          {missing
                            .map(materialLabel)
                            .join(' • ')}
                        </span>
                      </div>
                    )}

                    <button
                      type="button"
                      onClick={() =>
                        setSelectedToy(toy)
                      }
                    >
                      <Hammer size={17} />

                      Abrir modo oficina

                      <ArrowRight
                        size={17}
                      />
                    </button>
                  </article>
                )
              }
            )}
          </div>
        </section>
      )}

      {/* CTA */}

      <section className="workshop-community-cta">
        <div className="workshop-community-icon">
          <Sparkles />
        </div>

        <div>
          <strong>
            Construiu alguma coisa?
          </strong>

          <p>
            Sua criação também pode inspirar
            outras pessoas.
          </p>
        </div>

        <a href="/comunidade">
          Compartilhar na comunidade
          <ArrowRight size={18} />
        </a>
      </section>

      {/* MODAL / MODO OFICINA */}

      {selectedToy && (
        <div
          className="workshop-modal-backdrop"
          role="presentation"
          onMouseDown={(event) => {
            if (
              event.target ===
              event.currentTarget
            ) {
              setSelectedToy(null)
            }
          }}
        >
          <article
            className="workshop-modal"
            role="dialog"
            aria-modal="true"
            aria-labelledby="workshop-modal-title"
          >
            <button
              type="button"
              className="workshop-modal-close"
              aria-label="Fechar oficina"
              onClick={() =>
                setSelectedToy(null)
              }
            >
              <X />
            </button>

            <div className="workshop-modal-hero">
              <span>
                {selectedToy.emoji}
              </span>

              <div>
                <small>
                  MODO OFICINA
                </small>

                <h2 id="workshop-modal-title">
                  {selectedToy.name}
                </h2>
              </div>
            </div>

            <div className="workshop-modal-content">

              <div className="workshop-modal-meta">
                <span>
                  <Clock3 size={16} />
                  {selectedToy.time}
                </span>

                <span>
                  <Package size={16} />
                  {selectedToy.difficulty}
                </span>

                <span>
                  <Users size={16} />
                  {selectedToy.age}
                </span>
              </div>

              <section className="workshop-modal-block">
                <span className="modal-block-label">
                  VOCÊ VAI PRECISAR
                </span>

                <div className="workshop-material-list">
                  {selectedToy.materials.map(
                    (material) => (
                      <span key={material}>
                        <Check size={15} />
                        {materialLabel(
                          material
                        )}
                      </span>
                    )
                  )}
                </div>
              </section>

              <div className="workshop-safety">
                <ShieldCheck />

                <div>
                  <strong>
                    Segurança primeiro
                  </strong>

                  <p>
                    {selectedToy.safety}
                  </p>
                </div>
              </div>

              <section className="workshop-modal-block">
                <span className="modal-block-label">
                  PASSO A PASSO
                </span>

                <div className="workshop-steps">
                  {selectedToy.steps.map(
                    (step, index) => (
                      <div
                        className="workshop-step"
                        key={step}
                      >
                        <span>
                          {index + 1}
                        </span>

                        <p>
                          {step}
                        </p>
                      </div>
                    )
                  )}
                </div>
              </section>

              <section className="workshop-memory">
                <Sparkles />

                <div>
                  <small>
                    MEMÓRIA DA ÉPOCA
                  </small>

                  <p>
                    {selectedToy.memory}
                  </p>
                </div>
              </section>

              <div className="workshop-finish">
                <div>
                  <strong>
                    🎉 Terminou?
                  </strong>

                  <span>
                    Agora transforme sua criação
                    em uma nova memória.
                  </span>
                </div>

                <a href="/comunidade">
                  Eu fiz! Compartilhar
                  <ArrowRight size={17} />
                </a>
              </div>
            </div>
          </article>
        </div>
      )}
    </main>
  )
}