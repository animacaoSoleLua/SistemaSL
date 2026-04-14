"use client";

import { FiHelpCircle } from "react-icons/fi";
import Tooltip from "./Tooltip";
import "./TooltipIcon.css";

interface TooltipIconProps {
  content: string;
  label: string;
  position?: "top" | "bottom";
}

export default function TooltipIcon({
  content,
  label,
  position = "top",
}: TooltipIconProps) {
  return (
    <Tooltip content={content} position={position}>
      <button
        type="button"
        className="tooltip-icon-button"
        aria-label={`Informações sobre ${label}`}
        tabIndex={0}
      >
        <FiHelpCircle size={16} />
      </button>
    </Tooltip>
  );
}
