"use client";

import {
  ChangeEvent,
  FormEvent,
  useCallback,
  useEffect,
  useState,
} from "react";

import {
  ArrowLeft,
  ArrowRight,
  Flag,
  Heart,
  LoaderCircle,
  MessageCircle,
  Send,
  Sparkles,
  Trash2,
  Users,
} from "lucide-react";

import { authClient } from "@/lib/auth-client";
import { useModalA11y } from "@/lib/use-modal-a11y";
import UserAvatar from "@/components/community/UserAvatar";

import "./comunidade.css";

/* ============================================================
   TIPOS
   ============================================================ */

type CommunityComment = {
  id: string;
  content: string;
  createdAt: string;

  authorId: string;
  oculto: boolean;

  author: {
    id: string;
    name: string;
    image: string | null;
  };
};

type CommunityPost = {
  oculto?: boolean;
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

type MinhaBrincadeira = {
  id: string;
  name: string;
  status: string;
  categories: string[];
  rejectionReason: string | null;
  createdAt: string;
};

const CATEGORIAS_BRINCADEIRA = [
  "Coordenação",
  "Criatividade",
  "Em Grupo",
  "Habilidade",
];

const LOCAIS_BRINCADEIRA = [
  "Casa ou sala",
  "Quintal",
  "Parque ou praça",
  "Rua ou calçada",
  "Escola",
  "Qualquer lugar",
];

/**
 * 7 motivos de denúncia — os mesmos rótulos que a rota
 * /api/comunidade/denuncias espera receber.
 */
const MOTIVOS_DENUNCIA = [
  "Xingamento ou ofensa",
  "Assédio ou bullying",
  "Ameaça",
  "Discurso de ódio",
  "Spam",
  "Conteúdo inadequado",
  "Outro",
];

/* ============================================================
   PÁGINA
   ============================================================ */

export default function ComunidadePage() {
  const {
    data: session,
    isPending: sessionLoading,
  } = authClient.useSession();

  const [posts, setPosts] = useState<CommunityPost[]>([]);
const [content, setContent] = useState("");

// IMAGEM DA PUBLICAÇÃO
const [selectedImage, setSelectedImage] = useState<File | null>(null);
const [imagePreview, setImagePreview] = useState<string | null>(null);

const [loadingPosts, setLoadingPosts] = useState(true);
const [publishing, setPublishing] = useState(false);

const [error, setError] = useState("");
const [message, setMessage] = useState("");

  /* ==========================================================
     COMENTÁRIOS
     ========================================================== */

  const [openComments, setOpenComments] =
    useState<string | null>(null);

  const [comments, setComments] =
    useState<Record<string, CommunityComment[]>>({});

  const [commentTexts, setCommentTexts] =
    useState<Record<string, string>>({});

  const [loadingComments, setLoadingComments] =
    useState<string | null>(null);

  const [sendingComment, setSendingComment] =
    useState<string | null>(null);

  /* ==========================================================
     DENÚNCIAS — modal com 7 motivos
     ========================================================== */

  const [reportTarget, setReportTarget] = useState<{
    tipo: "POST" | "COMMENT";
    id: string;
  } | null>(null);

  const [reportMotivo, setReportMotivo] = useState("");

  const [reportEnviando, setReportEnviando] =
    useState(false);

  const reportRef = useModalA11y<HTMLElement>(
    reportTarget !== null,
    () => setReportTarget(null)
  );

  function abrirDenuncia(
    tipo: "POST" | "COMMENT",
    id: string
  ) {
    setReportMotivo("");
    setReportTarget({ tipo, id });
  }

  async function handleEnviarDenuncia(
    event: FormEvent<HTMLFormElement>
  ) {
    event.preventDefault();

    if (!reportTarget || !reportMotivo) {
      return;
    }

    try {
      setReportEnviando(true);

      const resposta = await fetch(
        "/api/comunidade/denuncias",
        {
          method: "POST",

          headers: {
            "Content-Type": "application/json",
          },

          body: JSON.stringify({
            tipo: reportTarget.tipo,
            contentId: reportTarget.id,
            motivo: reportMotivo,
          }),
        }
      );

      const dados = await resposta.json();

      if (!resposta.ok) {
        throw new Error(
          dados?.error ||
            "Não foi possível enviar a denúncia agora."
        );
      }

      setReportTarget(null);
      setReportMotivo("");

      setMessage(
        dados?.duplicada
          ? "Já tínhamos recebido esse aviso — nossa moderação vai conferir com cuidado."
          : "Obrigado por avisar. Nossa moderação vai conferir com cuidado."
      );
    } catch (err) {
      setError(
        err instanceof Error
          ? err.message
          : "Não foi possível enviar a denúncia agora."
      );

      setReportTarget(null);
    } finally {
      setReportEnviando(false);
    }
  }

  /* ==========================================================
     EXCLUIR COMENTÁRIO (próprio ou do autor do post)
     — dois cliques: apagar → confirmar
     ========================================================== */

  const [confirmDeleteId, setConfirmDeleteId] =
    useState<string | null>(null);

  const [deletingComment, setDeletingComment] =
    useState<string | null>(null);

  async function excluirComentario(
    postId: string,
    commentId: string
  ) {
    try {
      setDeletingComment(commentId);

      const resposta = await fetch(
        `/api/comunidade/comments/${commentId}`,
        {
          method: "DELETE",
        }
      );

      const dados = await resposta.json();

      if (!resposta.ok) {
        throw new Error(
          dados?.error ||
            "Não foi possível apagar o comentário."
        );
      }

      setComments((current) => ({
        ...current,
        [postId]: (current[postId] || []).filter(
          (item) => item.id !== commentId
        ),
      }));

      setPosts((currentPosts) =>
        currentPosts.map((post) =>
          post.id === postId
            ? {
                ...post,

                _count: {
                  ...post._count,

                  comments: Math.max(
                    0,
                    post._count.comments - 1
                  ),
                },
              }
            : post
        )
      );

      setMessage(dados?.mensagem || "Comentário apagado.");
    } catch (err) {
      setError(
        err instanceof Error
          ? err.message
          : "Não foi possível apagar o comentário."
      );
    } finally {
      setDeletingComment(null);
      setConfirmDeleteId(null);
    }
  }

  /* ==========================================================
     CURTIDAS
     ========================================================== */

  const [likingPost, setLikingPost] =
    useState<string | null>(null);

  /* ==========================================================
     COMPARTILHAR UMA BRINCADEIRA (CATÁLOGO COLABORATIVO)
     ========================================================== */

  const [gameFormOpen, setGameFormOpen] = useState(false);

  const [minhasBrincadeiras, setMinhasBrincadeiras] = useState<
    MinhaBrincadeira[]
  >([]);
  const [enviosErro, setEnviosErro] = useState("");

  const [shareForm, setShareForm] = useState({
    name: "",
    desc: "",
    how: "",
    materials: "",
    location: "Casa ou sala",
    benefits: "",
    minPlayers: "2",
    minAge: "5",
    safety: "",
    supervision: false,
  });

  const [shareCategorias, setShareCategorias] = useState<string[]>([]);

  const [shareImage, setShareImage] = useState<File | null>(null);
  const [shareImagePreview, setShareImagePreview] = useState<string | null>(
    null
  );

  const [shareEnviando, setShareEnviando] = useState(false);
  const [shareErro, setShareErro] = useState("");

  /**
   * Acessibilidade do formulário: fecha com ESC,
   * cuida do foco e devolve o foco ao fechar.
   */
  const gameFormRef = useModalA11y<HTMLElement>(
    gameFormOpen,
    () => setGameFormOpen(false)
  );

  useEffect(() => {
    if (!sessionLoading && window.location.hash === "#sugerir") {
      document.getElementById("sugerir")?.scrollIntoView();
      if (session?.user) setGameFormOpen(true);
    }
  }, [sessionLoading, session?.user?.id]);

  /* ==========================================================
     CARREGAR POSTS
     ========================================================== */

  const loadPosts = useCallback(async () => {
    try {
      setLoadingPosts(true);
      setError("");

      const response = await fetch(
        "/api/comunidade/posts",
        {
          cache: "no-store",
        }
      );

      if (!response.ok) {
        throw new Error(
          "Erro ao carregar publicações."
        );
      }

      const data = await response.json();

      setPosts(data);
    } catch (err) {
      console.error(err);

      setError(
        "Não foi possível carregar as publicações."
      );
    } finally {
      setLoadingPosts(false);
    }
  }, []);

  useEffect(() => {
    loadPosts();
  }, [loadPosts]);

  /* ==========================================================
     MEUS ENVIOS DE BRINCADEIRA (status de cada contribuição)
     ========================================================== */

  const carregarMinhasBrincadeiras = useCallback(async () => {
    setEnviosErro("");
    try {
      const resposta = await fetch(
        "/api/comunidade/brincadeiras",
        {
          cache: "no-store",
        }
      );

      if (!resposta.ok) {
        throw new Error("Falha ao carregar envios");
      }

      const dados = await resposta.json();

      if (!Array.isArray(dados)) throw new Error("Resposta inválida");
      setMinhasBrincadeiras(dados);
    } catch {
      setEnviosErro("Não foi possível atualizar seus envios. Os status exibidos podem estar desatualizados. Tente novamente.");
    }
  }, []);

  useEffect(() => {
    if (session?.user) {
      carregarMinhasBrincadeiras();
    } else {
      setMinhasBrincadeiras([]);
      setEnviosErro("");
    }
  }, [session?.user, carregarMinhasBrincadeiras]);

  /* ==========================================================
     CRIAR POST
     ========================================================== */
function handleImageChange(
  event: React.ChangeEvent<HTMLInputElement>
) {
  const file = event.target.files?.[0];

  if (!file) return;

  setError("");
  setMessage("");

  // Formatos permitidos
  const allowedTypes = [
    "image/jpeg",
    "image/png",
    "image/webp",
  ];

  if (!allowedTypes.includes(file.type)) {
    setError(
      "Formato inválido. Escolha uma imagem JPG, PNG ou WebP."
    );

    event.target.value = "";
    return;
  }

  // Limite de 5 MB
  const maxSize = 5 * 1024 * 1024;

  if (file.size > maxSize) {
    setError("A imagem deve ter no máximo 5 MB.");

    event.target.value = "";
    return;
  }

  // Remove a prévia anterior da memória
  if (imagePreview) {
    URL.revokeObjectURL(imagePreview);
  }

  const preview = URL.createObjectURL(file);

  setSelectedImage(file);
  setImagePreview(preview);
}

function removeSelectedImage() {
  if (imagePreview) {
    URL.revokeObjectURL(imagePreview);
  }

  setSelectedImage(null);
  setImagePreview(null);

  const input = document.getElementById(
    "community-image-input"
  ) as HTMLInputElement | null;

  if (input) {
    input.value = "";
  }
}
  async function handlePublish(
    event: FormEvent<HTMLFormElement>
  ) {
    event.preventDefault();

    setError("");
    setMessage("");

    if (!session?.user) {
      setError(
        "Você precisa estar logado para publicar."
      );

      return;
    }

    const text = content.trim();

    if (!text && !selectedImage) {
      setError(
        "Escreva alguma coisa ou adicione uma imagem antes de publicar."
      );

      return;
    }

    try {
      setPublishing(true);

      /**
       * Se houver imagem selecionada, o envio para o endpoint
       * de upload acontece primeiro. A publicação só é criada
       * com a URL devolvida pela rota autorizada do projeto.
       */
      let imageUrl: string | null = null;

      if (selectedImage) {
        const formData = new FormData();
        formData.append("file", selectedImage);

        const uploadResponse = await fetch(
          "/api/comunidade/upload",
          {
            method: "POST",
            body: formData,
          }
        );

        if (!uploadResponse.ok) {
          const uploadData = await uploadResponse.json().catch(() => null);

          throw new Error(
            uploadData?.error ||
              "Não foi possível enviar a imagem. A publicação não foi criada."
          );
        }

        const uploadData = await uploadResponse.json();

        imageUrl = uploadData.url;
      }

      const response = await fetch(
        "/api/comunidade/posts",
        {
          method: "POST",

          headers: {
            "Content-Type": "application/json",
          },

          body: JSON.stringify({
            content: text,
            imageUrl: imageUrl ?? undefined,
          }),
        }
      );

      const data = await response.json();

      if (!response.ok) {
        throw new Error(
          data.error ||
            "Não foi possível publicar."
        );
      }

      setPosts((currentPosts) => [
        data,
        ...currentPosts,
      ]);

      setContent("");

      /**
       * Limpa a pré-visualização da imagem usada.
       */
      if (imagePreview) {
        URL.revokeObjectURL(imagePreview);
      }

      setSelectedImage(null);
      setImagePreview(null);

      const imageInput = document.getElementById(
        "community-image-input"
      ) as HTMLInputElement | null;

      if (imageInput) {
        imageInput.value = "";
      }

      setMessage(
        data.oculto ? "Publicação enviada para revisão. Ela fica visível só para você até a moderação conferir." : "Publicação criada com sucesso!"
      );
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

  /* ==========================================================
     BRINCADEIRA — IMAGEM E ENVIO DO FORMULÁRIO
     ========================================================== */

  function handleShareImageChange(
    event: ChangeEvent<HTMLInputElement>
  ) {
    const file = event.target.files?.[0];

    if (!file) {
      return;
    }

    setShareErro("");

    const formatosPermitidos = [
      "image/jpeg",
      "image/png",
      "image/webp",
    ];

    if (!formatosPermitidos.includes(file.type)) {
      setShareErro(
        "Formato inválido. Escolha uma imagem JPG, PNG ou WebP."
      );

      event.target.value = "";
      return;
    }

    if (file.size > 5 * 1024 * 1024) {
      setShareErro("A imagem deve ter no máximo 5 MB.");

      event.target.value = "";
      return;
    }

    if (shareImagePreview) {
      URL.revokeObjectURL(shareImagePreview);
    }

    setShareImage(file);
    setShareImagePreview(URL.createObjectURL(file));
  }

  function removeShareImage() {
    if (shareImagePreview) {
      URL.revokeObjectURL(shareImagePreview);
    }

    setShareImage(null);
    setShareImagePreview(null);

    const input = document.getElementById(
      "share-game-image-input"
    ) as HTMLInputElement | null;

    if (input) {
      input.value = "";
    }
  }

  function alternarCategoriaShare(categoria: string) {
    setShareErro("");

    setShareCategorias((current) =>
      current.includes(categoria)
        ? current.filter((item) => item !== categoria)
        : [...current, categoria]
    );
  }

  function limparFormularioShare() {
    setShareForm({
      name: "",
      desc: "",
      how: "",
      materials: "",
      location: "Casa ou sala",
      benefits: "",
      minPlayers: "2",
      minAge: "5",
      safety: "",
      supervision: false,
    });
    setShareCategorias([]);
    removeShareImage();
  }

  async function handleShareGame(
    event: FormEvent<HTMLFormElement>
  ) {
    event.preventDefault();

    setShareErro("");
    if (shareEnviando) return;

    if (!session?.user) {
      setShareErro(
        "Você precisa estar logado para compartilhar uma brincadeira."
      );

      return;
    }

    const name = shareForm.name.trim();
    const desc = shareForm.desc.trim();
    const how = shareForm.how.trim();
    const safety = shareForm.safety.trim();
    const benefits = shareForm.benefits
      .split(",")
      .map((item) => item.trim())
      .filter(Boolean);
    const minPlayers = Number(shareForm.minPlayers);
    const minAge = Number(shareForm.minAge);

    function campoInvalido(id: string, mensagem: string) {
      setShareErro(mensagem);
      const campo = document.getElementById(id);
      campo?.setAttribute("aria-invalid", "true");
      campo?.setAttribute("aria-describedby", "share-game-error");
      campo?.focus();
    }

    if (name.length < 3) {
      campoInvalido("share-game-name", "O nome da brincadeira precisa ter pelo menos 3 caracteres.");
      return;
    }

    if (desc.length < 10) {
      campoInvalido("share-game-desc", "Escreva uma descrição com pelo menos 10 caracteres.");
      return;
    }

    if (how.length < 10) {
      campoInvalido("share-game-how", "Explique como brincar com pelo menos 10 caracteres.");
      return;
    }

    if (shareCategorias.length < 1) {
      setShareErro("Escolha pelo menos uma categoria.");
      return;
    }

    if (benefits.length > 8 || benefits.some((item) => item.length < 2 || item.length > 40)) {
      campoInvalido("share-game-benefits", "Informe até 8 habilidades, separadas por vírgulas, com 2 a 40 caracteres cada.");
      return;
    }

    if (
      !Number.isInteger(minPlayers) ||
      minPlayers < 1 ||
      minPlayers > 50
    ) {
      setShareErro(
        "Informe uma quantidade mínima de participantes entre 1 e 50."
      );

      return;
    }

    if (
      !Number.isInteger(minAge) ||
      minAge < 3 ||
      minAge > 99
    ) {
      setShareErro(
        "Informe uma idade mínima recomendada entre 3 e 99."
      );

      return;
    }

    try {
      setShareEnviando(true);

      /**
       * Imagem opcional: enviada ao mesmo endpoint de upload
       * autorizado usado nas publicações.
       */
      let image: string | null = null;

      if (shareImage) {
        const formData = new FormData();
        formData.append("file", shareImage);

        const uploadResposta = await fetch(
          "/api/comunidade/upload",
          {
            method: "POST",
            body: formData,
          }
        );

        if (!uploadResposta.ok) {
          const uploadDados = await uploadResposta.json().catch(() => null);

          throw new Error(
            uploadDados?.error ||
              "Não foi possível enviar a imagem da brincadeira."
          );
        }

        const uploadDados = await uploadResposta.json();

        image = uploadDados.url;
      }

      const resposta = await fetch(
        "/api/comunidade/brincadeiras",
        {
          method: "POST",

          headers: {
            "Content-Type": "application/json",
          },

          body: JSON.stringify({
            name,
            desc,
            how,
            materials: shareForm.materials.trim(),
            location: shareForm.location,
            benefits,
            minPlayers,
            minAge,
            categories: shareCategorias,
            safety,
            supervision: shareForm.supervision,
            image: image ?? undefined,
          }),
        }
      );

      const dados = await resposta.json();

      if (!resposta.ok) {
        throw new Error(
          dados?.error || "Não foi possível enviar a brincadeira agora."
        );
      }

      setGameFormOpen(false);
      limparFormularioShare();
      setError("");

      setMessage(
        dados.possibleDuplicate
          ? "Envio recebido e aguardando revisão! Encontramos uma brincadeira com nome semelhante; a moderação vai verificar a possível duplicidade."
          : "Envio recebido! A brincadeira está aguardando a revisão da moderação."
      );

      carregarMinhasBrincadeiras();
    } catch (err) {
      setShareErro(
        err instanceof TypeError ? "Falha de conexão. Seus dados foram mantidos; tente enviar novamente." : err instanceof Error
          ? err.message
          : "Não foi possível enviar a brincadeira agora."
      );
    } finally {
      setShareEnviando(false);
    }
  }

  /* ==========================================================
     CURTIR / DESCURTIR
     ========================================================== */

  async function handleLike(postId: string) {
    setError("");
    setMessage("");

    if (!session?.user) {
      setError(
        "Você precisa estar logado para curtir."
      );

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

  /* ==========================================================
     ABRIR / FECHAR COMENTÁRIOS
     ========================================================== */

  async function toggleComments(
    postId: string
  ) {
    if (openComments === postId) {
      setOpenComments(null);
      return;
    }

    setOpenComments(postId);

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

  /* ==========================================================
     CRIAR COMENTÁRIO
     ========================================================== */

  async function handleComment(
    event: FormEvent<HTMLFormElement>,
    postId: string
  ) {
    event.preventDefault();

    setError("");

    if (!session?.user) {
      setError(
        "Você precisa estar logado para comentar."
      );

      return;
    }

    const text =
      commentTexts[postId]?.trim() || "";

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
          data.error ||
            "Não foi possível comentar."
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

      /**
       * Comentário suspeito entra oculto (revisão humana) e
       * NÃO entra na contagem pública do post.
       */
      if (data?.oculto) {
        setMessage(
          "Comentário enviado para revisão: ele fica visível só para você até a moderação conferir."
        );
      } else {
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
      }
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

  /* ==========================================================
     DATA
     ========================================================== */

  function formatDate(date: string) {
    return new Intl.DateTimeFormat(
      "pt-BR",
      {
        dateStyle: "short",
        timeStyle: "short",
      }
    ).format(new Date(date));
  }

  /* ==========================================================
     INTERFACE
     ========================================================== */

  return (
    <main className="community-page">
      <section className="community-container">

        {/* VOLTAR */}

        <a
          href="/"
          className="community-back"
        >
          <ArrowLeft size={18} />

          Voltar para o site
        </a>

        {/* CABEÇALHO */}

        <div className="community-heading">
          <div className="community-heading-icon">
            <Users size={28} />
          </div>

          <div className="community-heading-copy">
            <span className="community-label">
              NOSSA COMUNIDADE
            </span>

            <h1>Comunidade</h1>

            <p>
              Compartilhe brincadeiras,
              histórias e lembranças que
              fizeram parte da sua época.
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
                    Compartilhe algo com a
                    comunidade
                  </span>
                </div>
              </div>

              <textarea
                value={content}
                onChange={(event) =>
                  setContent(
                    event.target.value
                  )
                }
                placeholder="Qual brincadeira marcou a sua infância?"
                maxLength={2000}
                rows={5}
              />

              {imagePreview && (
  <div className="community-image-preview">
    <img
      src={imagePreview}
      alt="Pré-visualização da imagem"
    />

    <button
      type="button"
      className="remove-image-button"
      onClick={removeSelectedImage}
      aria-label="Remover imagem"
    >
      ×
    </button>
  </div>
)}

<div className="create-post-footer">
  <div className="create-post-tools">
    <label
      htmlFor="community-image-input"
      className="add-image-button"
    >
      Adicionar imagem
    </label>

    <input
      id="community-image-input"
      className="community-image-input"
      type="file"
      accept="image/jpeg,image/png,image/webp"
      onChange={handleImageChange}
      disabled={publishing}
    />
  </div>

                <span className="character-limit">
                  {content.length}/2000
                </span>

                <button
                  type="submit"
                  disabled={
                    publishing ||
                    (!content.trim() && !selectedImage)
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
                Entre na sua conta para
                publicar
              </strong>

              <p>
                Você pode visualizar as
                publicações, mas precisa
                estar conectado para
                participar.
              </p>

              <a href="/cadastro">
                Entrar ou criar conta
              </a>
            </div>
          )}
        </section>

        {/* ============================================================
            COMPARTILHAR UMA BRINCADEIRA (CATÁLOGO COLABORATIVO)
            ============================================================ */}

        <section className="share-game-card" id="sugerir">
          <div className="share-game-copy">
            <span className="share-game-badge">
              <Sparkles size={15} />

              CATÁLOGO DA COMUNIDADE
            </span>

            <h2>
              Você conhece uma brincadeira de
              antigamente?
            </h2>

            <p>
              Conte para a comunidade como era (ou
              como é) a brincadeira. Depois da revisão
              da moderação, ela entra no catálogo oficial
              do site — com o seu nome na autoria.
            </p>

            {session?.user &&
              minhasBrincadeiras.length > 0 && (
                <span className="share-game-status">
                  {minhasBrincadeiras.filter((item) =>
                    item.status === "PENDENTE"
                  ).length}{" "}
                  aguardando revisão •{" "}
                  {minhasBrincadeiras.filter((item) =>
                    item.status === "APROVADO"
                  ).length}{" "}
                  aprovadas •{" "}
                  {minhasBrincadeiras.filter((item) =>
                    item.status === "REJEITADO"
                  ).length}{" "}
                  rejeitadas
                </span>
              )}
          </div>

          {session?.user ? (
            <button
              type="button"
              className="share-game-button"
              onClick={() => {
                setShareErro("");
                setGameFormOpen(true);
              }}
            >
              Compartilhar uma brincadeira

              <ArrowRight size={17} />
            </button>
          ) : (
            <a
              href="/cadastro?destino=sugerir"
              className="share-game-button"
            >
              Entrar para compartilhar

              <ArrowRight size={17} />
            </a>
          )}
        </section>

        {/* MENSAGENS */}

        {session?.user && minhasBrincadeiras.length > 0 && (
          <details className="community-alert success">
            <summary>Minhas sugestões</summary>
            <ul>
              {minhasBrincadeiras.map((item) => (
                <li key={item.id}><strong>{item.name}</strong>: {item.status === "PENDENTE" ? "Aguardando aprovação" : item.status === "APROVADO" ? "Aprovada" : "Rejeitada"}</li>
              ))}
            </ul>
          </details>
        )}

        {session?.user && enviosErro && (
          <div className="community-alert error" role="alert">
            {enviosErro}{" "}
            <button type="button" className="share-cancel" onClick={carregarMinhasBrincadeiras}>
              Tentar novamente
            </button>
          </div>
        )}

        {session?.user && minhasBrincadeiras.some((item) => item.status === "REJEITADO" && item.rejectionReason?.trim()) && (
          <details className="community-alert error">
            <summary>Motivos de rejeição dos meus envios</summary>
            <ul>
              {minhasBrincadeiras.filter((item) => item.status === "REJEITADO" && item.rejectionReason?.trim()).map((item) => (
                <li key={item.id}><strong>{item.name}:</strong> {item.rejectionReason}</li>
              ))}
            </ul>
          </details>
        )}

        {error && (
          <div
            className="community-alert error"
            role="alert"
          >
            {error}
          </div>
        )}

        {message && (
          <div
            className="community-alert success"
            role="status"
          >
            {message}
          </div>
        )}

        {/* TÍTULO DO FEED */}

        <div className="community-feed-title">
          <div>
            <span>
              MEMÓRIAS DA COMUNIDADE
            </span>

            <h2>
              Publicações recentes
            </h2>
          </div>

          {!loadingPosts && (
            <span className="community-post-count">
              {posts.length}{" "}
              {posts.length === 1
                ? "publicação"
                : "publicações"}
            </span>
          )}
        </div>

        {/* FEED */}

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
              Seja a primeira pessoa a
              compartilhar uma lembrança.
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
                  <UserAvatar
              name={post.author.name}
              image={post.author.image}
              size={40}
            />

                  <div className="community-post-author">
                    <strong>
                      {post.author.name}
                    </strong>

                    <span>
                      {formatDate(
                        post.createdAt
                      )}
                    </span>
                  </div>
                </header>

                {/* TEXTO */}

                <div className="community-post-content">
                  {post.oculto && <p className="comment-revisao">Aguardando revisão da moderação. Visível só para você.</p>}
                  <p>{post.content}</p>
                </div>

                {/* FOTO DA PUBLICAÇÃO */}

                {post.imageUrl && (
                  <div className="community-post-image">
                    <a href={post.imageUrl} target="_blank" rel="noopener noreferrer" aria-label="Abrir imagem original em nova aba">
                      <img
                        src={post.imageUrl}
                        alt={`Imagem da publicação de ${post.author.name}`}
                        loading="lazy"
                      />
                    </a>
                  </div>
                )}

                {/* AÇÕES */}

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
                    {likingPost ===
                    post.id ? (
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
                      toggleComments(
                        post.id
                      )
                    }
                  >
                    <MessageCircle
                      size={19}
                    />

                    {post._count.comments ===
                    1
                      ? "1 comentário"
                      : `${post._count.comments} comentários`}
                  </button>

                  {session?.user && (
                    <button
                      type="button"
                      className="post-action report-button"
                      onClick={() =>
                        abrirDenuncia(
                          "POST",
                          post.id
                        )
                      }
                      aria-label={`Denunciar publicação de ${post.author.name}`}
                    >
                      <Flag
                        size={16}
                      />

                      Denunciar
                    </button>
                  )}
                </footer>

                {/* COMENTÁRIOS */}

                {openComments ===
                  post.id && (
                  <div className="comments-section">

                    {loadingComments ===
                    post.id ? (
                      <div className="comments-loading">
                        <LoaderCircle
                          size={20}
                          className="spin"
                        />

                        Carregando
                        comentários...
                      </div>
                    ) : (
                      <>
                        <div className="comments-list">
                          {(comments[
                            post.id
                          ] || []).length ===
                          0 ? (
                            <p className="no-comments">
                              Nenhum
                              comentário ainda.
                              Seja o primeiro!
                            </p>
                          ) : (
                            (
                              comments[
                                post.id
                              ] || []
                            ).map(
                              (
                                comment
                              ) => (
                                <div
                                  className="comment"
                                  key={
                                    comment.id
                                  }
                                >
                                  {comment
                                    .author
                                    .image ? (
                                    <img
                                      src={
                                        comment
                                          .author
                                          .image
                                      }
                                      alt={
                                        comment
                                          .author
                                          .name
                                      }
                                      className="comment-avatar"
                                    />
                                  ) : (
                                    <div className="comment-avatar comment-avatar-fallback">
                                      {comment.author.name
                                        .charAt(
                                          0
                                        )
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

                                    {comment.oculto && (
                                      <span className="comment-revisao">
                                        Em revisão —
                                        visível só para
                                        você até a
                                        moderação
                                        conferir.
                                      </span>
                                    )}

                                    <p>
                                      {comment.content}
                                    </p>

                                    {session?.user && (
                                      <div className="comment-actions">
                                        {comment.author.id !==
                                          session.user.id && (
                                          <button
                                            type="button"
                                            className="comment-action"
                                            onClick={() =>
                                              abrirDenuncia(
                                                "COMMENT",
                                                comment.id
                                              )
                                            }
                                            aria-label={`Denunciar comentário de ${comment.author.name}`}
                                          >
                                            <Flag
                                              size={13}
                                            />

                                            Denunciar
                                          </button>
                                        )}

                                        {(comment.authorId ===
                                          session.user.id ||
                                          post.author.id ===
                                            session.user.id) &&
                                          (confirmDeleteId ===
                                          comment.id ? (
                                            <span className="comment-confirm">
                                              Apagar não
                                              tem volta.

                                              <button
                                                type="button"
                                                className="comment-action alerta"
                                                disabled={
                                                  deletingComment ===
                                                  comment.id
                                                }
                                                onClick={() =>
                                                  excluirComentario(
                                                    post.id,
                                                    comment.id
                                                  )
                                                }
                                              >
                                                {deletingComment ===
                                                comment.id ? (
                                                  <LoaderCircle
                                                    size={13}
                                                    className="spin"
                                                  />
                                                ) : (
                                                  <Trash2
                                                    size={13}
                                                  />
                                                )}

                                                Apagar
                                              </button>

                                              <button
                                                type="button"
                                                className="comment-action"
                                                onClick={() =>
                                                  setConfirmDeleteId(
                                                    null
                                                  )
                                                }
                                              >
                                                Deixar
                                              </button>
                                            </span>
                                          ) : (
                                            <button
                                              type="button"
                                              className="comment-action"
                                              onClick={() =>
                                                setConfirmDeleteId(
                                                  comment.id
                                                )
                                              }
                                            >
                                              <Trash2
                                                size={13}
                                              />

                                              Apagar
                                            </button>
                                          ))}
                                      </div>
                                    )}
                                  </div>
                                </div>
                              )
                            )
                          )}
                        </div>

                        {session?.user ? (
                          <form
                            className="comment-form"
                            onSubmit={(
                              event
                            ) =>
                              handleComment(
                                event,
                                post.id
                              )
                            }
                          >
                            {session.user
                              .image ? (
                              <img
                                src={
                                  session
                                    .user
                                    .image
                                }
                                alt={
                                  session
                                    .user
                                    .name ||
                                  "Usuário"
                                }
                                className="comment-avatar"
                              />
                            ) : (
                              <div className="comment-avatar comment-avatar-fallback">
                                {session.user.name
                                  ?.charAt(
                                    0
                                  )
                                  .toUpperCase() ||
                                  "U"}
                              </div>
                            )}

                            <input
                              value={
                                commentTexts[
                                  post.id
                                ] || ""
                              }
                              onChange={(
                                event
                              ) =>
                                setCommentTexts(
                                  (
                                    current
                                  ) => ({
                                    ...current,

                                    [post.id]:
                                      event
                                        .target
                                        .value,
                                  })
                                )
                              }
                              placeholder="Escreva um comentário..."
                              maxLength={
                                500
                              }
                            />

                            <button
                              type="submit"
                              disabled={
                                sendingComment ===
                                  post.id ||
                                !commentTexts[
                                  post.id
                                ]?.trim()
                              }
                              aria-label="Enviar comentário"
                            >
                              {sendingComment ===
                              post.id ? (
                                <LoaderCircle
                                  size={
                                    18
                                  }
                                  className="spin"
                                />
                              ) : (
                                <Send
                                  size={
                                    18
                                  }
                                />
                              )}
                            </button>
                          </form>
                        ) : (
                          <p className="comment-login-message">
                            Entre na sua
                            conta para
                            comentar.
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

      {/* ============================================================
          MODAL — DENÚNCIA (7 MOTIVOS)
          ============================================================ */}

      {reportTarget && (
        <div
          className="community-modal-backdrop"
          onClick={(event) => {
            if (event.target === event.currentTarget) {
              setReportTarget(null);
            }
          }}
        >
          <article
            ref={reportRef}
            className="community-modal community-modal--denuncia"
            role="dialog"
            aria-modal="true"
            aria-labelledby="denuncia-title"
            tabIndex={-1}
          >
            <header className="community-modal-header">
              <div>
                <small>ALERTAR A MODERAÇÃO</small>

                <h2 id="denuncia-title">
                  O que está errado?
                </h2>
              </div>

              <button
                type="button"
                className="community-modal-close"
                aria-label="Fechar denúncia"
                onClick={() => setReportTarget(null)}
              >
                ×
              </button>
            </header>

            <form
              className="community-modal-content"
              onSubmit={handleEnviarDenuncia}
            >
              <p className="denuncia-intro">
                Você está ajudando a manter a comunidade
                boa para todo mundo. Escolha o motivo e
                a moderação confere em seguida.
              </p>

              <div
                className="denuncia-opcoes"
                role="radiogroup"
                aria-label="Motivo da denúncia"
              >
                {MOTIVOS_DENUNCIA.map(
                  (motivo) => (
                    <label
                      key={motivo}
                      className={
                        reportMotivo === motivo
                          ? "denuncia-opcao selected"
                          : "denuncia-opcao"
                      }
                    >
                      <input
                        type="radio"
                        name="denuncia-motivo"
                        value={motivo}
                        checked={
                          reportMotivo === motivo
                        }
                        onChange={(event) =>
                          setReportMotivo(
                            event.target.value
                          )
                        }
                      />

                      {motivo}
                    </label>
                  )
                )}
              </div>

              <small className="share-field-hint">
                Denúncia não é desistir de conversar:
                funciona melhor para ofensas, ameaças e
                desrespeito.
              </small>

              <div className="share-actions">
                <button
                  type="button"
                  className="share-cancel"
                  onClick={() => setReportTarget(null)}
                >
                  Fechar
                </button>

                <button
                  type="submit"
                  disabled={
                    !reportMotivo || reportEnviando
                  }
                >
                  {reportEnviando
                    ? "Enviando…"
                    : "Enviar denúncia"}
                </button>
              </div>
            </form>
          </article>
        </div>
      )}

      {/* ============================================================
          MODAL — FORMULÁRIO DE BRINCADEIRA
          ============================================================ */}

      {gameFormOpen && (
        <div
          className="community-modal-backdrop"
          onClick={(event) => {
            if (event.target === event.currentTarget) {
              setGameFormOpen(false);
            }
          }}
        >
          <article
            ref={gameFormRef}
            className="community-modal"
            role="dialog"
            aria-modal="true"
            aria-labelledby="share-game-title"
            tabIndex={-1}
          >
            <header className="community-modal-header">
              <div>
                <small>ENVIAR BRINCADEIRA</small>

                <h2 id="share-game-title">
                  Conte como se brinca
                </h2>
              </div>

              <button
                type="button"
                className="community-modal-close"
                aria-label="Fechar formulário"
                onClick={() => setGameFormOpen(false)}
              >
                ×
              </button>
            </header>

            <form
              className="community-modal-content"
              onSubmit={handleShareGame}
              onChange={(event) => {
                const campo = event.target as HTMLElement;
                campo.removeAttribute("aria-invalid");
                campo.removeAttribute("aria-describedby");
              }}
            >
              {shareErro && (
                <div
                  id="share-game-error"
                  className="community-alert error"
                  role="alert"
                >
                  {shareErro}
                </div>
              )}

              <div className="share-field">
                <label htmlFor="share-game-name">
                  Nome
                </label>

                <input
                  id="share-game-name"
                  type="text"
                  value={shareForm.name}
                  onChange={(event) =>
                    setShareForm({
                      ...shareForm,
                      name: event.target.value,
                    })
                  }
                  maxLength={60}
                  minLength={3}
                  placeholder="Amarelinha, Pega-pega…"
                  required
                />
              </div>

              <div className="share-field">
                <label htmlFor="share-game-image-input">
                  Foto ou imagem (opcional)
                </label>

                <input
                  id="share-game-image-input"
                  className="share-game-image-input"
                  type="file"
                  accept="image/jpeg,image/png,image/webp"
                  onChange={handleShareImageChange}
                />

                {!shareImagePreview && (
                  <small className="share-field-hint">
                    JPG, PNG ou WebP com até 5 MB.
                  </small>
                )}

                {shareImagePreview && (
                  <div className="community-image-preview">
                    <img
                      src={shareImagePreview}
                      alt="Pré-visualização da imagem escolhida"
                    />

                    <button
                      type="button"
                      className="remove-image-button"
                      onClick={removeShareImage}
                    >
                      Remover
                    </button>
                  </div>
                )}
              </div>

              <div className="share-field">
                <label htmlFor="share-game-desc">
                  Descrição curta
                </label>

                <textarea
                  id="share-game-desc"
                  value={shareForm.desc}
                  onChange={(event) =>
                    setShareForm({
                      ...shareForm,
                      desc: event.target.value,
                    })
                  }
                  maxLength={500}
                  minLength={10}
                  placeholder="O que é a brincadeira e por que ela é divertida."
                  required
                />

                <small className="share-field-hint">
                  {shareForm.desc.length}/500 letras
                </small>
              </div>

              <div className="share-field">
                <label htmlFor="share-game-how">
                  Como brincar
                </label>

                <textarea
                  id="share-game-how"
                  value={shareForm.how}
                  onChange={(event) =>
                    setShareForm({
                      ...shareForm,
                      how: event.target.value,
                    })
                  }
                  maxLength={2000}
                  minLength={10}
                  placeholder="Passo a passo, regras, dicas da sua época."
                  required
                />

                <small className="share-field-hint">
                  {shareForm.how.length}/2000 letras
                </small>
              </div>

              <div className="share-field-row">
                <div className="share-field">
                  <label htmlFor="share-game-materials">
                    Materiais
                  </label>

                  <input
                    id="share-game-materials"
                    type="text"
                    value={shareForm.materials}
                    onChange={(event) =>
                      setShareForm({
                        ...shareForm,
                        materials:
                          event.target.value,
                      })
                    }
                    maxLength={300}
                    placeholder="Giz, corda, tampinhas…"
                  />

                  <small className="share-field-hint">
                    Se nada for preciso, deixe em
                    branco.
                  </small>
                </div>

                <div className="share-field">
                  <label htmlFor="share-game-location">
                    Local indicado
                  </label>

                  <select
                    id="share-game-location"
                    value={shareForm.location}
                    onChange={(event) =>
                      setShareForm({
                        ...shareForm,
                        location: event.target.value,
                      })
                    }
                  >
                    {LOCAIS_BRINCADEIRA.map(
                      (local) => (
                        <option
                          key={local}
                          value={local}
                        >
                          {local}
                        </option>
                      )
                    )}
                  </select>
                </div>
              </div>

              <div className="share-field">
                <label htmlFor="share-game-benefits">
                  Habilidades desenvolvidas
                </label>

                <input
                  id="share-game-benefits"
                  type="text"
                  value={shareForm.benefits}
                  onChange={(event) =>
                    setShareForm({
                      ...shareForm,
                      benefits: event.target.value,
                    })
                  }
                  placeholder="Equilíbrio, Coordenação, Memória…"
                />

                <small className="share-field-hint">
                  Separe por vírgulas (máximo 8).
                </small>
              </div>

              <div className="share-field-row">
                <div className="share-field">
                  <label htmlFor="share-game-players">
                    Mínimo de participantes
                  </label>

                  <input
                    id="share-game-players"
                    type="number"
                    min={1}
                    max={50}
                    value={shareForm.minPlayers}
                    onChange={(event) =>
                      setShareForm({
                        ...shareForm,
                        minPlayers:
                          event.target.value,
                      })
                    }
                    required
                  />
                </div>

                <div className="share-field">
                  <label htmlFor="share-game-age">
                    Idade mínima
                  </label>

                  <input
                    id="share-game-age"
                    type="number"
                    min={3}
                    max={99}
                    value={shareForm.minAge}
                    onChange={(event) =>
                      setShareForm({
                        ...shareForm,
                        minAge: event.target.value,
                      })
                    }
                    required
                  />

                  <small className="share-field-hint">
                    Recomendada para brincar com
                    segurança.
                  </small>
                </div>
              </div>

              <div className="share-field">
                <label>Categorias</label>

                <div className="share-categorias">
                  {CATEGORIAS_BRINCADEIRA.map(
                    (categoria) => (
                      <button
                        key={categoria}
                        type="button"
                        className={
                          shareCategorias.includes(
                            categoria
                          )
                            ? "share-categoria-chip selected"
                            : "share-categoria-chip"
                        }
                        aria-pressed={
                          shareCategorias.includes(
                            categoria
                          )
                        }
                        onClick={() =>
                          alternarCategoriaShare(
                            categoria
                          )
                        }
                      >
                        {categoria}
                      </button>
                    )
                  )}
                </div>
              </div>

              <div className="share-field">
                <label htmlFor="share-game-safety">
                  Dicas de segurança (opcional)
                </label>

                <textarea
                  id="share-game-safety"
                  value={shareForm.safety}
                  onChange={(event) =>
                    setShareForm({
                      ...shareForm,
                      safety: event.target.value,
                    })
                  }
                  maxLength={600}
                  placeholder="Os cuidados de que os responsáveis devem lembrar."
                />
              </div>

              <label className="share-check">
                <input
                  type="checkbox"
                  checked={shareForm.supervision}
                  onChange={(event) =>
                    setShareForm({
                      ...shareForm,
                      supervision: event.target.checked,
                    })
                  }
                />

                Recomenda supervisão de um adulto
              </label>

              <div className="share-actions">
                <button
                  type="button"
                  className="share-cancel"
                  onClick={() => setGameFormOpen(false)}
                >
                  Cancelar
                </button>

                <button type="submit" disabled={shareEnviando}>
                  {shareEnviando
                    ? "Enviando…"
                    : "Enviar para revisão"}
                </button>
              </div>
            </form>
          </article>
        </div>
      )}
    </main>
  );
}
