"use client";

import React from "react";

interface ButtonProps extends React.ButtonHTMLAttributes<HTMLButtonElement> {
  variant?: "primary" | "secondary" | "danger" | "ghost" | "edit";
  size?: "sm" | "md";
  isLoading?: boolean;
  children: React.ReactNode;
}

export function Button({
  variant = "primary",
  size,
  isLoading,
  disabled,
  children,
  className,
  ...rest
}: ButtonProps) {
  const variantClass =
    variant === "secondary" || variant === "ghost"
      ? "secondary"
      : variant === "danger"
      ? "danger"
      : variant === "edit"
      ? "edit"
      : "";

  const sizeClass = size === "sm" ? "small" : "";

  const classes = [
    "button",
    variantClass,
    sizeClass,
    className,
  ]
    .filter(Boolean)
    .join(" ");

  return (
    <button
      className={classes}
      disabled={isLoading || disabled}
      aria-busy={isLoading || undefined}
      {...rest}
    >
      {isLoading ? (
        <>
          {"..."}
          <span className="sr-only">Carregando</span>
        </>
      ) : (
        children
      )}
    </button>
  );
}
