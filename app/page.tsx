'use client'

/**

 * ============================================================

 * PROJETO: Na Minha Época

 * ARQUIVO: app/page.tsx

 * ============================================================

 *

 * Página inicial do site de brincadeiras tradicionais.

 */

import { useEffect, useMemo, useState } from 'react'

import {

  ArrowRight,

  BookOpen,

  Check,

  ChevronDown,

  CircleHelp,

  Heart,

  Hammer,

  Menu,

  MessageCircle,

  Recycle,

  Search,

  Sparkles,

  Users,

  UserRound,

  X,

} from 'lucide-react'

import { games } from './games'

import { ThemeToggle } from '@/components/ui/theme-toggle'

import { authClient } from '@/lib/auth-client'

/**

 * ============================================================

 * TIPOS

 * ============================================================

 */

export type Game = {

  name: string

  icon: string

  image?: string

  color: string

  category: string[]

  desc: string

  how: string

  materials: string

  players: string

  age: string

  benefits: string[]

}

type HomeCommunityPost = {

  id: string

  content: string

  createdAt: string

  author: {

    id: string

    name: string

    image: string | null

  }

  _count: {

    likes: number

    comments: number

  }

}

/**

 * ============================================================

 * CATEGORIAS

 * ============================================================

 */

const categories = [

  {

    name: 'Todas',

    icon: Sparkles,

    detail: 'Ver tudo',

  },

  {

    name: 'Coordenação',

    icon: CircleHelp,

    detail: 'Movimento e equilíbrio',

  },

  {

    name: 'Criatividade',

    icon: BookOpen,

    detail: 'Imaginação e criação',

  },

  {

    name: 'Em Grupo',

    icon: Users,

    detail: 'Juntos é mais divertido',

  },

]

/**

 * ============================================================

 * COMPONENTE PRINCIPAL

 * ============================================================

 */

export default function Page() {

  const [query, setQuery] = useState('')

  const [category, setCategory] = useState('Todas')

  const [selected, setSelected] = useState<Game | null>(null)

  const [menuOpen, setMenuOpen] = useState(false)

  // ==========================================================

  // CONTA / AUTENTICAÇÃO

  // ==========================================================

  const { data: session, isPending } = authClient.useSession()

  const [accountOpen, setAccountOpen] = useState(false)

  // ==========================================================

  // COMUNIDADE NA HOME

  // ==========================================================

  const [communityPosts, setCommunityPosts] =

    useState<HomeCommunityPost[]>([])

  const [communityLoading, setCommunityLoading] = useState(true)

  /**

   * Filtra as brincadeiras pela categoria e pela pesquisa.

   */

  const filtered = useMemo(() => {

    const search = query.toLowerCase().trim()

    return games.filter((game) => {

      const matchesCategory =

        category === 'Todas' || game.category.includes(category)

      const searchableText = [game.name, game.desc, ...game.category]

        .join(' ')

        .toLowerCase()

      const matchesSearch =

        search === '' || searchableText.includes(search)

      return matchesCategory && matchesSearch

    })

  }, [category, query])

  useEffect(() => {

    async function loadCommunityPosts() {

      try {

        setCommunityLoading(true)

        const response = await fetch('/api/comunidade/posts', {

          cache: 'no-store',

        })

        if (!response.ok) {

          throw new Error('Não foi possível carregar a comunidade.')

        }

        const data = await response.json()

        setCommunityPosts(

          Array.isArray(data) ? data.slice(0, 3) : [],

        )

      } catch (error) {

        console.error(

          'Erro ao carregar posts da comunidade:',

          error,

        )

        setCommunityPosts([])

      } finally {

        setCommunityLoading(false)

      }

    }

    loadCommunityPosts()

  }, [])

  return (

    <main>

      {/* CABEÇALHO */}

      <header className="site-header">

        <div className="header-inner">

          <a

            className="brand"

            href="#inicio"

            aria-label="Ir para o início"

          >

            <span className="brand-mark">✳</span>

            <span>

              Na Minha

              <br />

              <b>Época</b>

            </span>

          </a>

          <nav

            className={menuOpen ? 'nav open' : 'nav'}

            aria-label="Navegação principal"

          >

            <a href="#inicio" onClick={() => setMenuOpen(false)}>

              Início

            </a>

            <a

              href="#brincadeiras"

              onClick={() => setMenuOpen(false)}

            >

              Brincadeiras

            </a>

            <a

              href="#categorias"

              onClick={() => setMenuOpen(false)}

            >

              Categorias

            </a>

            <a href="#sobre" onClick={() => setMenuOpen(false)}>

              Sobre

            </a>

          </nav>

          <div className="header-actions">

            <label className="search-box">

              <Search aria-hidden="true" />

              <input

                value={query}

                onChange={(event) =>

                  setQuery(event.target.value)

                }

                placeholder="Pesquisar brincadeiras..."

                aria-label="Pesquisar brincadeiras"

              />

            </label>

            {/* Botão da comunidade */}

            <a

              href="/comunidade"

              className="account-button"

              aria-label="Abrir comunidade"

              title="Comunidade"

            >

              <Users />

            </a>

            {/* Botão de acessibilidade: alterna entre modo claro e escuro. */}

            <ThemeToggle />

            {/* ==================================================

                CONTA / LOGIN

                ================================================== */}

            {isPending ? (

              <div

                className="account-button"

                aria-label="Carregando conta"

                title="Carregando conta"

              >

                <UserRound />

              </div>

            ) : session?.user ? (

              <div className="account-wrapper">

                <button

                  type="button"

                  className="account-button account-avatar"

                  aria-label="Abrir conta"

                  title={session.user.name || 'Minha conta'}

                  onClick={() =>

                    setAccountOpen((value) => !value)

                  }

                >

                  {session.user.image ? (

                    <img

                      src={session.user.image}

                      alt={

                        session.user.name ||

                        'Foto do usuário'

                      }

                    />

                  ) : (

                    <UserRound />

                  )}

                </button>

                {accountOpen && (

                  <div className="account-menu">

                    <div className="account-info">

                      {session.user.image ? (

                        <img

                          src={session.user.image}

                          alt={

                            session.user.name ||

                            'Foto do usuário'

                          }

                        />

                      ) : (

                        <UserRound />

                      )}

                      <div>

                        <strong>

                          {session.user.name || 'Usuário'}

                        </strong>

                        <span>

                          {session.user.email}

                        </span>

                      </div>

                    </div>

                    <button

                      type="button"

                      className="account-logout"

                      onClick={async () => {

                        await authClient.signOut()

                        setAccountOpen(false)

                      }}

                    >

                      Sair da conta

                    </button>

                  </div>

                )}

              </div>

            ) : (

              <a

                href="/cadastro"

                className="account-button"

                aria-label="Entrar ou criar uma conta"

                title="Entrar ou criar uma conta"

              >

                <UserRound />

              </a>

            )}

            <button

              className="menu-button"

              type="button"

              onClick={() =>

                setMenuOpen((value) => !value)

              }

              aria-label={

                menuOpen

                  ? 'Fechar menu'

                  : 'Abrir menu'

              }

            >

              {menuOpen ? <X /> : <Menu />}

            </button>

          </div>

        </div>

      </header>

      {/* HERO */}

      <section className="hero" id="inicio">

        <div className="hero-shape shape-one" />

        <div className="hero-shape shape-two" />

        <div className="hero-inner">

          <div className="hero-copy">

            <p className="eyebrow">

              <span />

              UM JEITO DIFERENTE DE APRENDER

            </p>

            <h1>

              Aprender brincando é mais <em>divertido!</em>

            </h1>

            <p className="hero-text">

              Descubra brincadeiras educativas que ajudam no

              desenvolvimento das crianças de forma simples,

              divertida e segura.

            </p>

            <a

              className="hero-cta"

              href="#brincadeiras"

            >

              Explorar brincadeiras

              <ArrowRight />

            </a>

            <div className="hero-note">

              <Heart fill="currentColor" />

              Feito para criar memórias juntos

            </div>

          </div>

          <div className="hero-art">

            <span className="sun">✳</span>

            <div className="cloud cloud-one" />

            <div className="cloud cloud-two" />

            {/* Mascote */}

            <img

              src="/imagens/mascote.png"

              alt="Mascote Na Minha Época"

              className="hero-mascote"

            />

            <span className="hero-star star-one">

              ✦

            </span>

            <span className="hero-star star-two">

              ✦

            </span>

          </div>

        </div>

      </section>

      {/* CATEGORIAS */}

      <section

        className="content-section"

        id="categorias"

      >

        <div className="section-heading">

          <div>

            <p className="eyebrow dark">

              <span />

              ENCONTRE SEU JEITO DE BRINCAR

            </p>

            <h2>O que vamos brincar hoje?</h2>

          </div>

          <p className="heading-helper">

            Cada brincadeira guarda uma história.

            <br />

            Escolha uma categoria e descubra a sua.

          </p>

        </div>

        <div className="category-list">

          {categories.map(

            ({ name, icon: Icon, detail }) => (

              <button

                key={name}

                type="button"

                className={`category ${

                  category === name ? 'active' : ''

                }`}

                onClick={() => setCategory(name)}

              >

                <span className="category-icon">

                  <Icon />

                </span>

                <span>

                  <strong>{name}</strong>

                  <small>{detail}</small>

                </span>

                <ChevronDown className="category-arrow" />

              </button>

            ),

          )}

        </div>

        {/* CATEGORIA ESPECIAL — BRINQUEDOS CASEIROS */}
        <a
          href="/oficina"
          className="home-workshop-feature"
          aria-label="Abrir Oficina da Minha Época"
        >
          <div className="home-workshop-copy">
            <span className="home-workshop-badge">
              <Hammer size={15} />
              NOVIDADE · OFICINA DA MINHA ÉPOCA
            </span>

            <h3>Brinquedos Caseiros</h3>

            <p>
              Escolha materiais que você já tem em casa e descubra
              brinquedos que pode construir passo a passo.
            </p>

            <div className="home-workshop-tags">
              <span>Escolha materiais</span>
              <span>Receba ideias</span>
              <span>Monte passo a passo</span>
            </div>

            <span className="home-workshop-cta">
              Entrar na oficina
              <ArrowRight size={18} />
            </span>
          </div>

          <div className="home-workshop-visual" aria-hidden="true">
            <div className="home-workshop-before">
              <span>📦</span>
              <small>O que você tem</small>
            </div>

            <div className="home-workshop-arrow">
              <ArrowRight size={22} />
            </div>

            <div className="home-workshop-after">
              <span>🎯</span>
              <small>O que pode criar</small>
            </div>

            <div className="home-workshop-recycle">
              <Recycle size={18} />
              Reutilizar também é brincar
            </div>
          </div>
        </a>

      </section>

      {/* BRINCADEIRAS */}

      <section

        className="games-section"

        id="brincadeiras"

      >

        <div className="section-heading games-heading">

          <div>

            <p className="eyebrow dark">

              <span />

              PARA TODA A FAMÍLIA

            </p>

            <h2>Brincadeiras populares</h2>

          </div>

          <span className="result-count">

            {filtered.length}{' '}

            {filtered.length === 1

              ? 'brincadeira'

              : 'brincadeiras'}

          </span>

        </div>

        <div className="game-grid">

          {filtered.map((game) => (

            <article

              className="game-card"

              key={game.name}

            >

              <div

                className={`game-visual ${game.color}`}

              >

                {game.image ? (

                  <img

                    src={game.image}

                    alt={game.name}

                    style={{

                      width: '100%',

                      height: '100%',

                      objectFit: 'contain',

                    }}

                  />

                ) : (

                  <span className="game-bubble">

                    {game.icon}

                  </span>

                )}

                <span className="game-label">

                  {game.category[0]}

                </span>

                <div className="game-doodle" />

              </div>

              <div className="game-body">

                <h3>{game.name}</h3>

                <p>{game.desc}</p>

                <button

                  type="button"

                  onClick={() => setSelected(game)}

                >

                  Ver mais

                  <ArrowRight />

                </button>

              </div>

            </article>

          ))}

        </div>

        {filtered.length === 0 && (

          <div className="empty">

            <Search />

            <h3>

              Nenhuma brincadeira encontrada.

            </h3>

            <p>

              Tente buscar por outro nome ou escolha

              a categoria Todas.

            </p>

            <button

              type="button"

              onClick={() => {

                setQuery('')

                setCategory('Todas')

              }}

            >

              Ver todas as brincadeiras

            </button>

          </div>

        )}

      </section>

      {/* COMUNIDADE NA HOME */}

      <section className="home-community">

        <div className="home-community-inner">

          <div className="home-community-heading">

            <div>

              <p className="eyebrow dark">

                <span />

                MEMÓRIAS DA COMUNIDADE

              </p>

              <h2>

                Histórias que continuam

                <br />

                <em>vivas.</em>

              </h2>

            </div>

            <div className="home-community-heading-right">

              <p>

                Descubra lembranças compartilhadas por outras pessoas e

                conte também uma história da sua época.

              </p>

              <a href="/comunidade">

                Ver toda a comunidade

                <ArrowRight />

              </a>

            </div>

          </div>

          {communityLoading ? (

            <div className="home-community-loading">

              Carregando histórias da comunidade...

            </div>

          ) : communityPosts.length > 0 ? (

            <div className="home-community-grid">

              {communityPosts.map((post) => (

                <article

                  className="home-community-card"

                  key={post.id}

                >

                  <div className="home-community-author">

                    {post.author.image ? (

                      <img

                        src={post.author.image}

                        alt={post.author.name}

                      />

                    ) : (

                      <div className="home-community-avatar-fallback">

                        {post.author.name.charAt(0).toUpperCase()}

                      </div>

                    )}

                    <div>

                      <strong>{post.author.name}</strong>

                      <span>compartilhou uma memória</span>

                    </div>

                  </div>

                  <p className="home-community-text">

                    {post.content}

                  </p>

                  <div className="home-community-actions">

                    <span>

                      <Heart size={17} />

                      {post._count.likes}

                    </span>

                    <span>

                      <MessageCircle size={17} />

                      {post._count.comments}

                    </span>

                    <a href="/comunidade">

                      Ver publicação

                      <ArrowRight size={16} />

                    </a>

                  </div>

                </article>

              ))}

            </div>

          ) : (

            <div className="home-community-empty">

              <Users size={35} />

              <div>

                <strong>A comunidade está começando.</strong>

                <p>

                  Seja a primeira pessoa a compartilhar uma lembrança.

                </p>

              </div>

              <a href="/comunidade">

                Participar da comunidade

                <ArrowRight />

              </a>

            </div>

          )}

          <div className="home-community-bottom">

            <div className="home-community-bottom-icon">

              <Users />

            </div>

            <div>

              <strong>Sua história também faz parte disso.</strong>

              <span>

                Compartilhe brincadeiras e lembranças que marcaram sua infância.

              </span>

            </div>

            <a href="/comunidade">

              Entrar na comunidade

              <ArrowRight />

            </a>

          </div>

        </div>

      </section>

      {/* MEMÓRIAS */}

      <section className="memory-section">

        <div className="memory-copy">

          <p className="eyebrow">

            <span />

            MEMÓRIAS QUE FICAM

          </p>

          <h2>

            Brincar é criar

            <br />

            <em>memórias.</em>

          </h2>

          <p>

            Tem coisas que a gente aprende para sempre:

            o valor de uma amizade, a alegria de correr

            sem hora para parar e a imaginação que

            transforma qualquer espaço em aventura.

          </p>

          <a href="#sobre">

            Conheça nossa história

            <ArrowRight />

          </a>

        </div>

        <div className="memory-cards">

          <div className="memory-card rotate-left">

            <span>“</span>

            <p>

              Quem nunca brincou de esconde-esconde?

            </p>

            <small>

              Uma lembrança de cada vez

            </small>

          </div>

          <div className="memory-card rotate-right">

            <span>✦</span>

            <p>

              Brincadeiras simples, histórias incríveis.

            </p>

            <small>Na Minha Época</small>

          </div>

        </div>

      </section>

      {/* SOBRE */}

      <section

        className="about-section"

        id="sobre"

      >

        <div className="about-icon">

          <BookOpen />

        </div>

        <div>

          <p className="eyebrow dark">

            <span />

            SOBRE O PROJETO

          </p>

          <h2>Uma ponte entre gerações</h2>

          <p>

            O <b>Na Minha Época</b> nasceu para resgatar

            brincadeiras que atravessaram gerações. Em

            um mundo cada vez mais digital, queremos

            lembrar que brincar também é correr, pular,

            imaginar, criar e compartilhar momentos.

          </p>

        </div>

      </section>

      {/* RODAPÉ */}

      <footer>

        <div className="footer-main">

          <a

            className="brand footer-brand"

            href="#inicio"

          >

            <span className="brand-mark">✳</span>

            <span>

              Na Minha

              <br />

              <b>Época</b>

            </span>

          </a>

          <p>

            Resgatando brincadeiras,

            <br />

            criando memórias.

          </p>

          <nav>

            <a href="#inicio">Início</a>

            <a href="#brincadeiras">

              Brincadeiras

            </a>

            <a href="#categorias">

              Categorias

            </a>

            <a href="#sobre">Sobre</a>

          </nav>

        </div>

        <div className="footer-bottom">

          <span>

            Projeto educativo sobre brincadeiras

            tradicionais e culturais brasileiras.

          </span>

          <span>

            © Na Minha Época — Feito em colaboraçao

            com a comunidade

          </span>

        </div>

      </footer>

      {/* MODAL */}

      {selected && (

        <div

          className="modal-backdrop"

          role="presentation"

          onMouseDown={(event) => {

            if (

              event.target === event.currentTarget

            ) {

              setSelected(null)

            }

          }}

        >

          <article

            className="modal"

            role="dialog"

            aria-modal="true"

            aria-labelledby="modal-title"

          >

            <button

              className="modal-close"

              type="button"

              onClick={() => setSelected(null)}

              aria-label="Fechar detalhes"

            >

              <X />

            </button>

            <div

              className={`modal-art game-visual ${selected.color}`}

            >

              {selected.image ? (

                <img

                  src={selected.image}

                  alt={selected.name}

                  style={{

                    width: '100%',

                    height: '100%',

                    objectFit: 'contain',

                  }}

                />

              ) : (

                <span className="game-bubble">

                  {selected.icon}

                </span>

              )}

              <span className="game-label">

                {selected.category.join(' · ')}

              </span>

            </div>

            <div className="modal-content">

              <p className="eyebrow dark">

                <span />

                VAMOS BRINCAR

              </p>

              <h2 id="modal-title">

                {selected.name}

              </h2>

              <p className="modal-desc">

                {selected.desc}

              </p>

              <div className="modal-facts">

                <div>

                  <small>COMO BRINCAR</small>

                  <p>{selected.how}</p>

                </div>

                <div>

                  <small>MATERIAIS</small>

                  <p>{selected.materials}</p>

                </div>

                <div>

                  <small>PARTICIPANTES</small>

                  <p>{selected.players}</p>

                </div>

                <div>

                  <small>FAIXA ETÁRIA</small>

                  <p>{selected.age}</p>

                </div>

              </div>

              <div className="benefits">

                <small>O QUE DESENVOLVE</small>

                <div>

                  {selected.benefits.map(

                    (benefit) => (

                      <span key={benefit}>

                        <Check />

                        {benefit}

                      </span>

                    ),

                  )}

                </div>

              </div>

              <button

                className="modal-button"

                type="button"

                onClick={() => setSelected(null)}

              >

                Fechar detalhes

              </button>

            </div>

          </article>

        </div>

      )}

    </main>

  )

}
