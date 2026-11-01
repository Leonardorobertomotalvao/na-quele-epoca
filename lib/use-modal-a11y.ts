"use client";

// ============================================================
// NA MINHA ÉPOCA — lib/use-modal-a11y.ts
// ============================================================
// Acessibilidade dos modais do site:
// - tecla ESC fecha o modal;
// - foco vai para o primeiro elemento do modal ao abrir;
// - a tecla TAB não deixa o foco escapar do modal (focus trap);
// - ao fechar, o foco volta para o elemento que abriu o modal.
//
// Uso:
//   const ref = useModalA11y(estaAberto, fechar)
//   <article ref={ref} role="dialog" aria-modal="true">
// ============================================================
import { useEffect, useRef } from "react";

const SELETORES_FOCUSABLE =
  'a[href], button:not([disabled]), textarea:not([disabled]), input:not([disabled]), select:not([disabled]), [tabindex]:not([tabindex="-1"])';

export function useModalA11y<T extends HTMLElement>(
  aberto: boolean,
  fechar: () => void
) {
  const ref = useRef<T | null>(null);

  useEffect(() => {
    if (!aberto) {
      return;
    }

    const elementoAnterior =
      document.activeElement instanceof HTMLElement
        ? document.activeElement
        : null;

    const modal = ref.current;

    function focarPrimeiroElemento() {
      if (!modal) {
        return;
      }

      const alvo =
        modal.querySelector<HTMLElement>("button:not([disabled])") ??
        modal.querySelector<HTMLElement>(SELETORES_FOCUSABLE);

      (alvo ?? modal).focus();
    }

    function aoPrecionarTecla(event: KeyboardEvent) {
      if (event.key === "Escape") {
        event.preventDefault();
        fechar();
        return;
      }

      if (event.key !== "Tab" || !modal) {
        return;
      }

      const elementos = Array.from(
        modal.querySelectorAll<HTMLElement>(SELETORES_FOCUSABLE)
      ).filter((elemento) => elemento.offsetParent !== null);

      if (elementos.length === 0) {
        return;
      }

      const primeiro = elementos[0];
      const ultimo = elementos[elementos.length - 1];
      const ativo = document.activeElement;

      if (event.shiftKey && (ativo === primeiro || !modal.contains(ativo))) {
        event.preventDefault();
        ultimo.focus();
      } else if (!event.shiftKey && ativo === ultimo) {
        event.preventDefault();
        primeiro.focus();
      }
    }

    const animação = requestAnimationFrame(focarPrimeiroElemento);

    document.addEventListener("keydown", aoPrecionarTecla);

    return () => {
      cancelAnimationFrame(animação);
      document.removeEventListener("keydown", aoPrecionarTecla);

      if (elementoAnterior && elementoAnterior.isConnected) {
        elementoAnterior.focus();
      }
    };
  }, [aberto, fechar]);

  return ref;
}
