"use client";

import {
  FormEvent,
  useCallback,
  useEffect,
  useState,
} from "react";

import {
  Heart,
  LoaderCircle,
  MessageCircle,
  Send,
  Users,
} from "lucide-react";

import { authClient } from "@/lib/auth-client";

import "./comunidade.css";

type CommunityComment = {
  id: string;
  content: string;
  createdAt: string;

  author: {
    id: string;
    name: string;
    image: string | null;
  };
};

type CommunityPost = {
  id: string;
  content: string;
  imageUrl: string | null;
  createdAt: string;
  updatedAt: string;

  author: {
    id: string;
    name: string;
    image: string | null;
  };

  _count: {
    comments: number;
    likes: number;
  };

  likedByMe: boolean;
};

export default function ComunidadePage() {
  const {
    data: session,
    isPending: sessionLoading,
  } = authClient.useSession();

  const [posts, setPosts] = useState<CommunityPost[]>([]);
  const [content, setContent] = useState("");
  const [loadingPosts, setLoadingPosts] = useState(true);
  const [publishing, setPublishing] = useState(false);
  const [error, setError] = useState("");
  const [message, setMessage] = useState("");

  // Comentários
  const [openComments, setOpenComments] = useState<string | null>(null);

  const [comments, setComments] =
    useState<Record<string, CommunityComment[]>>({});

  const [commentTexts, setCommentTexts] =
    useState<Record<string, string>>({});

  const [loadingComments, setLoadingComments] =
    useState<string | null>(null);

  const [sendingComment, setSendingComment] =
    useState<string | null>(null);

  // Curtidas
  const [likingPost, setLikingPost] =
    useState<string | null>(null);

  /**
   * ============================================================
   * CARREGAR POSTS
   * ============================================================
   */

  const loadPosts = useCallback(async () => {
    try {
      setLoadingPosts(true);
      setError("");

      const response = await fetch("/api/comunidade/posts", {
        cache: "no-store",
      });

      if (!response.ok) {
        throw new Error("Erro ao carregar publicações.");
      }

      const data = await response.json();

      setPosts(data);
    } catch (err) {
      console.error(err);

      setError("Não foi possível carregar as publicações.");
    } finally {
      setLoadingPosts(false);
    }
  }, []);

  useEffect(() => {
    loadPosts();
  }, [loadPosts]);

  /**
   * ============================================================
   * CRIAR POST
   * ============================================================
   */

  async function handlePublish(
    event: FormEvent<HTMLFormElement>
  ) {
    event.preventDefault();

    setError("");
    setMessage("");

    if (!session?.user) {
      setError("Você precisa estar logado para publicar.");
      return;
    }

    const text = content.trim();

    if (!text) {
      setError("Escreva alguma coisa antes de publicar.");
      return;
    }

    try {
      setPublishing(true);

      const response = await fetch("/api/comunidade/posts", {
        method: "POST",

        headers: {
          "Content-Type": "application/json",
        },

        body: JSON.stringify({
          content: text,
        }),
      });

      const data = await response.json();

      if (!response.ok) {
        throw new Error(
          data.error || "Não foi possível publicar."
        );
      }

      setPosts((currentPosts) => [
        data,
        ...currentPosts,
      ]);

      setContent("");

      setMessage("Publicação criada com sucesso!");
    } catch (err) {
      setError(
        err instanceof Error
          ? err.message
          : "Não foi possível publicar."
      );
    } finally {
      setPublishing(false);
    }
  }

  /**
   * ============================================================
   * CURTIR / DESCURTIR POST
   * ============================================================
   */

  async function handleLike(postId: string) {
    setError("");
    setMessage("");

    if (!session?.user) {
      setError("Você precisa estar logado para curtir.");
      return;
    }

    try {
      setLikingPost(postId);

      const response = await fetch(
        "/api/comunidade/likes",
        {
          method: "POST",

          headers: {
            "Content-Type": "application/json",
          },

          body: JSON.stringify({
            postId,
          }),
        }
      );

      const data = await response.json();

      if (!response.ok) {
        throw new Error(
          data.error ||
            "Não foi possível atualizar a curtida."
        );
      }

      setPosts((currentPosts) =>
        currentPosts.map((post) =>
          post.id === postId
            ? {
                ...post,

                likedByMe: data.liked,

                _count: {
                  ...post._count,
                  likes: data.likesCount,
                },
              }
            : post
        )
      );
    } catch (err) {
      setError(
        err instanceof Error
          ? err.message
          : "Não foi possível atualizar a curtida."
      );
    } finally {
      setLikingPost(null);
    }
  }

  /**
   * ============================================================
   * ABRIR / FECHAR COMENTÁRIOS
   * ============================================================
   */

  async function toggleComments(postId: string) {
    if (openComments === postId) {
      setOpenComments(null);
      return;
    }

    setOpenComments(postId);

    // Se já carregamos antes, não busca novamente.
    if (comments[postId]) {
      return;
    }

    try {
      setLoadingComments(postId);

      const response = await fetch(
        `/api/comunidade/comments?postId=${encodeURIComponent(
          postId
        )}`,
        {
          cache: "no-store",
        }
      );

      const data = await response.json();

      if (!response.ok) {
        throw new Error(
          data.error ||
            "Não foi possível carregar os comentários."
        );
      }

      setComments((current) => ({
        ...current,
        [postId]: data,
      }));
    } catch (err) {
      setError(
        err instanceof Error
          ? err.message
          : "Não foi possível carregar os comentários."
      );
    } finally {
      setLoadingComments(null);
    }
  }

  /**
   * ============================================================
   * CRIAR COMENTÁRIO
   * ============================================================
   */

  async function handleComment(
    event: FormEvent<HTMLFormElement>,
    postId: string
  ) {
    event.preventDefault();

    setError("");

    if (!session?.user) {
      setError("Você precisa estar logado para comentar.");
      return;
    }

    const text = commentTexts[postId]?.trim() || "";

    if (!text) {
      return;
    }

    try {
      setSendingComment(postId);

      const response = await fetch(
        "/api/comunidade/comments",
        {
          method: "POST",

          headers: {
            "Content-Type": "application/json",
          },

          body: JSON.stringify({
            postId,
            content: text,
          }),
        }
      );

      const data = await response.json();

      if (!response.ok) {
        throw new Error(
          data.error || "Não foi possível comentar."
        );
      }

      setComments((current) => ({
        ...current,

        [postId]: [
          ...(current[postId] || []),
          data,
        ],
      }));

      setCommentTexts((current) => ({
        ...current,
        [postId]: "",
      }));

      setPosts((currentPosts) =>
        currentPosts.map((post) =>
          post.id === postId
            ? {
                ...post,

                _count: {
                  ...post._count,
                  comments:
                    post._count.comments + 1,
                },
              }
            : post
        )
      );
    } catch (err) {
      setError(
        err instanceof Error
          ? err.message
          : "Não foi possível comentar."
      );
    } finally {
      setSendingComment(null);
    }
  }

  /**
   * ============================================================
   * DATA
   * ============================================================
   */

  function formatDate(date: string) {
    return new Intl.DateTimeFormat("pt-BR", {
      dateStyle: "short",
      timeStyle: "short",
    }).format(new Date(date));
  }

  return (
    <main className="community-page">
      <section className="community-container">

        {/* CABEÇALHO */}

        <div className="community-heading">

          <div className="community-heading-icon">
            <Users size={28} />
          </div>

          <div>
            <h1>Comunidade</h1>

            <p>
              Compartilhe brincadeiras, histórias e lembranças
              da sua época.
            </p>
          </div>

        </div>

        {/* CRIAR PUBLICAÇÃO */}

        <section className="create-post-card">

          {sessionLoading ? (

            <div className="community-loading-session">

              <LoaderCircle
                className="spin"
                size={22}
              />

              Carregando usuário...

            </div>

          ) : session?.user ? (

            <form onSubmit={handlePublish}>

              <div className="create-post-user">

                {session.user.image ? (

                  <img
                    src={session.user.image}
                    alt={
                      session.user.name ||
                      "Usuário"
                    }
                    className="community-avatar"
                  />

                ) : (

                  <div className="community-avatar-fallback">

                    {session.user.name
                      ?.charAt(0)
                      .toUpperCase() ||
                      "U"}

                  </div>

                )}

                <div>

                  <strong>
                    {session.user.name}
                  </strong>

                  <span>
                    Compartilhe algo com a comunidade
                  </span>

                </div>

              </div>

              <textarea
                value={content}
                onChange={(event) =>
                  setContent(event.target.value)
                }
                placeholder="Qual brincadeira marcou a sua infância?"
                maxLength={2000}
                rows={5}
              />

              <div className="create-post-footer">

                <span className="character-limit">
                  {content.length}/2000
                </span>

                <button
                  type="submit"
                  disabled={
                    publishing ||
                    !content.trim()
                  }
                >

                  {publishing ? (
                    <>
                      <LoaderCircle
                        size={18}
                        className="spin"
                      />

                      Publicando...
                    </>
                  ) : (
                    <>
                      <Send size={18} />
                      Publicar
                    </>
                  )}

                </button>

              </div>

            </form>

          ) : (

            <div className="community-login-required">

              <strong>
                Entre na sua conta para publicar
              </strong>

              <p>
                Você pode visualizar as publicações, mas precisa
                estar conectado para participar.
              </p>

            </div>

          )}

        </section>

        {error && (
          <div className="community-alert error">
            {error}
          </div>
        )}

        {message && (
          <div className="community-alert success">
            {message}
          </div>
        )}

        {/* FEED */}

        <div className="community-feed-title">
          <h2>Publicações recentes</h2>
        </div>

        {loadingPosts ? (

          <div className="community-empty">

            <LoaderCircle
              size={28}
              className="spin"
            />

            <p>
              Carregando publicações...
            </p>

          </div>

        ) : posts.length === 0 ? (

          <div className="community-empty">

            <Users size={42} />

            <h3>
              A comunidade está começando!
            </h3>

            <p>
              Seja a primeira pessoa a compartilhar uma lembrança.
            </p>

          </div>

        ) : (

          <div className="community-feed">

            {posts.map((post) => (

              <article
                className="community-post"
                key={post.id}
              >

                {/* AUTOR */}

                <header className="community-post-header">

                  {post.author.image ? (

                    <img
                      src={post.author.image}
                      alt={post.author.name}
                      className="community-avatar"
                    />

                  ) : (

                    <div className="community-avatar-fallback">

                      {post.author.name
                        .charAt(0)
                        .toUpperCase()}

                    </div>

                  )}

                  <div className="community-post-author">

                    <strong>
                      {post.author.name}
                    </strong>

                    <span>
                      {formatDate(post.createdAt)}
                    </span>

                  </div>

                </header>

                {/* TEXTO */}

                <div className="community-post-content">
                  <p>{post.content}</p>
                </div>

                {/* CURTIDAS + COMENTÁRIOS */}

                <footer className="community-post-footer">

                  <button
                    type="button"
                    className={
                      post.likedByMe
                        ? "post-action like-button liked"
                        : "post-action like-button"
                    }
                    onClick={() =>
                      handleLike(post.id)
                    }
                    disabled={
                      likingPost === post.id
                    }
                  >

                    {likingPost === post.id ? (

                      <LoaderCircle
                        size={19}
                        className="spin"
                      />

                    ) : (

                      <Heart
                        size={19}
                        fill={
                          post.likedByMe
                            ? "currentColor"
                            : "none"
                        }
                      />

                    )}

                    {post._count.likes === 1
                      ? "1 curtida"
                      : `${post._count.likes} curtidas`}

                  </button>

                  <button
                    type="button"
                    className="post-action"
                    onClick={() =>
                      toggleComments(post.id)
                    }
                  >

                    <MessageCircle size={19} />

                    {post._count.comments === 1
                      ? "1 comentário"
                      : `${post._count.comments} comentários`}

                  </button>

                </footer>

                {/* ÁREA DE COMENTÁRIOS */}

                {openComments === post.id && (

                  <div className="comments-section">

                    {loadingComments === post.id ? (

                      <div className="comments-loading">

                        <LoaderCircle
                          size={20}
                          className="spin"
                        />

                        Carregando comentários...

                      </div>

                    ) : (

                      <>

                        <div className="comments-list">

                          {(comments[post.id] || []).length === 0 ? (

                            <p className="no-comments">
                              Nenhum comentário ainda. Seja o primeiro!
                            </p>

                          ) : (

                            (comments[post.id] || []).map(
                              (comment) => (

                                <div
                                  className="comment"
                                  key={comment.id}
                                >

                                  {comment.author.image ? (

                                    <img
                                      src={comment.author.image}
                                      alt={comment.author.name}
                                      className="comment-avatar"
                                    />

                                  ) : (

                                    <div className="comment-avatar comment-avatar-fallback">

                                      {comment.author.name
                                        .charAt(0)
                                        .toUpperCase()}

                                    </div>

                                  )}

                                  <div className="comment-body">

                                    <div className="comment-header">

                                      <strong>
                                        {comment.author.name}
                                      </strong>

                                      <span>
                                        {formatDate(
                                          comment.createdAt
                                        )}
                                      </span>

                                    </div>

                                    <p>
                                      {comment.content}
                                    </p>

                                  </div>

                                </div>

                              )
                            )

                          )}

                        </div>

                        {session?.user ? (

                          <form
                            className="comment-form"
                            onSubmit={(event) =>
                              handleComment(
                                event,
                                post.id
                              )
                            }
                          >

                            {session.user.image ? (

                              <img
                                src={session.user.image}
                                alt={
                                  session.user.name ||
                                  "Usuário"
                                }
                                className="comment-avatar"
                              />

                            ) : (

                              <div className="comment-avatar comment-avatar-fallback">

                                {session.user.name
                                  ?.charAt(0)
                                  .toUpperCase() ||
                                  "U"}

                              </div>

                            )}

                            <input
                              value={
                                commentTexts[post.id] || ""
                              }
                              onChange={(event) =>
                                setCommentTexts(
                                  (current) => ({
                                    ...current,

                                    [post.id]:
                                      event.target.value,
                                  })
                                )
                              }
                              placeholder="Escreva um comentário..."
                              maxLength={500}
                            />

                            <button
                              type="submit"
                              disabled={
                                sendingComment === post.id ||
                                !commentTexts[
                                  post.id
                                ]?.trim()
                              }
                              aria-label="Enviar comentário"
                            >

                              {sendingComment === post.id ? (

                                <LoaderCircle
                                  size={18}
                                  className="spin"
                                />

                              ) : (

                                <Send size={18} />

                              )}

                            </button>

                          </form>

                        ) : (

                          <p className="comment-login-message">
                            Entre na sua conta para comentar.
                          </p>

                        )}

                      </>

                    )}

                  </div>

                )}

              </article>

            ))}

          </div>

        )}

      </section>
    </main>
  );
}
