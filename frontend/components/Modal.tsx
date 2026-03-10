"use client";

import { useEffect, useId } from "react";
import { FiX } from "react-icons/fi";
import { useFocusTrap } from "../lib/useFocusTrap";

interface ModalProps {
  isOpen: boolean;
  onClose: () => void;
  title: string;
  description?: string;
  titleId?: string;
  descriptionId?: string;
  children: React.ReactNode;
  size?: "sm" | "md" | "lg";
  footer?: React.ReactNode;
  className?: string;
}

export function Modal({
  isOpen,
  onClose,
  title,
  description,
  titleId,
  descriptionId,
  children,
  size = "md",
  footer,
  className,
}: ModalProps) {
  const generatedTitleId = useId();
  const generatedDescId = useId();

  const resolvedTitleId = titleId ?? generatedTitleId;
  const resolvedDescId = descriptionId ?? generatedDescId;

  const trapRef = useFocusTrap(isOpen, onClose);

  useEffect(() => {
    if (isOpen) {
      document.body.style.overflow = "hidden";
    } else {
      document.body.style.overflow = "";
    }
    return () => {
      document.body.style.overflow = "";
    };
  }, [isOpen]);

  if (!isOpen) return null;

  const handleBackdropClick = (event: React.MouseEvent<HTMLDivElement>) => {
    if (event.target === event.currentTarget) {
      onClose();
    }
  };

  const handleKeyDown = (event: React.KeyboardEvent<HTMLDivElement>) => {
    if (event.key === "Escape") {
      event.stopPropagation();
      onClose();
    }
  };

  return (
    <div
      className="modal-backdrop"
      role="dialog"
      aria-modal="true"
      aria-labelledby={resolvedTitleId}
      aria-describedby={description ? resolvedDescId : undefined}
      onClick={handleBackdropClick}
      onKeyDown={handleKeyDown}
    >
      <div
        className={`modal-card modal-${size}${className ? ` ${className}` : ""}`}
        ref={trapRef}
      >
        <header className="modal-header">
          <div>
            <h2 className="section-title" id={resolvedTitleId}>
              {title}
            </h2>
            {description && (
              <p id={resolvedDescId}>{description}</p>
            )}
          </div>
          <button
            className="icon-button"
            type="button"
            onClick={onClose}
            aria-label="Fechar modal"
          >
            <FiX aria-hidden="true" />
          </button>
        </header>
        <div className="modal-body">{children}</div>
        {footer && <div className="modal-footer">{footer}</div>}
      </div>
    </div>
  );
}
