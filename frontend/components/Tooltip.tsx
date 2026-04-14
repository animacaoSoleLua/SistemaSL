"use client";

import React, { ReactNode, useState, useRef, useEffect } from "react";
import "./Tooltip.css";

interface TooltipProps {
  children: ReactNode;
  content: string;
  position?: "top" | "bottom" | "left" | "right";
  delay?: number;
}

export default function Tooltip({
  children,
  content,
  position = "top",
  delay = 0,
}: TooltipProps) {
  const [isVisible, setIsVisible] = useState(false);
  const [adjustedPosition, setAdjustedPosition] = useState<"top" | "bottom" | "left" | "right">(position);
  const tooltipRef = useRef<HTMLDivElement>(null);
  const triggerRef = useRef<HTMLDivElement>(null);
  const timeoutRef = useRef<NodeJS.Timeout>();

  // Adjust position if tooltip goes off-screen
  useEffect(() => {
    if (!isVisible || !tooltipRef.current || !triggerRef.current) return;

    const tooltip = tooltipRef.current.getBoundingClientRect();
    const trigger = triggerRef.current.getBoundingClientRect();
    const viewportHeight = window.innerHeight;
    const viewportWidth = window.innerWidth;

    // Check if position goes off-screen and adjust
    if (position === "top" && tooltip.top < 8) {
      setAdjustedPosition("bottom");
    } else if (position === "bottom" && tooltip.bottom > viewportHeight - 8) {
      setAdjustedPosition("top");
    } else if (position === "left" && tooltip.left < 8) {
      setAdjustedPosition("right");
    } else if (position === "right" && tooltip.right > viewportWidth - 8) {
      setAdjustedPosition("left");
    }
  }, [isVisible, position]);

  const handleMouseEnter = () => {
    timeoutRef.current = setTimeout(() => {
      setIsVisible(true);
    }, delay);
  };

  const handleMouseLeave = () => {
    if (timeoutRef.current) clearTimeout(timeoutRef.current);
    setIsVisible(false);
  };

  const handleFocus = () => {
    setIsVisible(true);
  };

  const handleBlur = () => {
    setIsVisible(false);
  };

  // Clone children and pass handlers
  const childrenWithHandlers = React.isValidElement(children)
    ? React.cloneElement(children, {
        onMouseEnter: (e: React.MouseEvent) => {
          children.props?.onMouseEnter?.(e);
          handleMouseEnter();
        },
        onMouseLeave: (e: React.MouseEvent) => {
          children.props?.onMouseLeave?.(e);
          handleMouseLeave();
        },
        onFocus: (e: React.FocusEvent) => {
          children.props?.onFocus?.(e);
          handleFocus();
        },
        onBlur: (e: React.FocusEvent) => {
          children.props?.onBlur?.(e);
          handleBlur();
        },
      })
    : children;

  return (
    <div
      ref={triggerRef}
      className="tooltip-trigger"
    >
      {childrenWithHandlers}
      {isVisible && (
        <div
          ref={tooltipRef}
          className={`tooltip-content tooltip-${adjustedPosition}`}
          role="tooltip"
        >
          {content}
        </div>
      )}
    </div>
  );
}
