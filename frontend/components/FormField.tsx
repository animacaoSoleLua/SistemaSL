"use client";

import React from "react";

interface FormFieldProps {
  id: string;
  label: string;
  error?: string;
  required?: boolean;
  hint?: string;
  className?: string;
  children: React.ReactElement;
}

export function FormField({
  id,
  label,
  error,
  required,
  hint,
  className,
  children,
}: FormFieldProps) {
  const describedBy = error
    ? `${id}-error`
    : hint
    ? `${id}-hint`
    : undefined;

  const clonedChild = React.cloneElement(children, {
    id,
    "aria-required": required,
    "aria-invalid": !!error,
    "aria-describedby": describedBy,
  } as React.HTMLAttributes<HTMLElement>);

  return (
    <label className={`field ${className ?? ""}`} htmlFor={id}>
      <span>
        {label}
        {required && <span aria-hidden="true"> *</span>}
      </span>
      {clonedChild}
      {error && (
        <span id={`${id}-error`} role="alert" className="field-error">
          {error}
        </span>
      )}
      {!error && hint && (
        <span id={`${id}-hint`} className="helper">
          {hint}
        </span>
      )}
    </label>
  );
}
