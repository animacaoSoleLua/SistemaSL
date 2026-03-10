import { useEffect, useRef } from "react";

/**
 * Prende o foco dentro do container quando `active` é true.
 * Ao pressionar ESC, chama `onClose` se fornecido.
 * Ao abrir, move o foco para o primeiro elemento focável.
 */
export function useFocusTrap(active: boolean, onClose?: () => void) {
  const containerRef = useRef<HTMLDivElement>(null);
  const onCloseRef = useRef(onClose);

  // Mantém onCloseRef atualizado sem re-executar o efeito principal
  useEffect(() => {
    onCloseRef.current = onClose;
  });

  useEffect(() => {
    if (!active || !containerRef.current) return;

    const container = containerRef.current;

    const getFocusable = (): HTMLElement[] =>
      Array.from(
        container.querySelectorAll<HTMLElement>(
          'button:not([disabled]), [href], input:not([disabled]), select:not([disabled]), textarea:not([disabled]), [tabindex]:not([tabindex="-1"])'
        )
      );

    // Foca o primeiro elemento ao abrir
    const focusable = getFocusable();
    focusable[0]?.focus();

    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === "Escape") {
        onCloseRef.current?.();
        return;
      }
      if (e.key !== "Tab") return;

      const elements = getFocusable();
      if (elements.length === 0) {
        e.preventDefault();
        return;
      }

      const first = elements[0];
      const last = elements[elements.length - 1];

      if (e.shiftKey) {
        if (document.activeElement === first) {
          e.preventDefault();
          last.focus();
        }
      } else {
        if (document.activeElement === last) {
          e.preventDefault();
          first.focus();
        }
      }
    };

    document.addEventListener("keydown", handleKeyDown);
    return () => document.removeEventListener("keydown", handleKeyDown);
  }, [active]);

  return containerRef;
}
