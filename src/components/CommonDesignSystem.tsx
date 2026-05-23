import React from "react";

// ==========================================
// PHASE 10: Common Design System (Reusable Explicit Pastel-toned UI set)
// ==========================================

export interface PrimaryButtonProps {
  children?: React.ReactNode;
  variant?: "indigo" | "emerald" | "rose" | "slate" | "amber";
  size?: "sm" | "md" | "lg";
  loading?: boolean;
  className?: string;
  disabled?: boolean;
  onClick?: (e: React.MouseEvent<HTMLButtonElement>) => void;
  type?: "button" | "submit" | "reset";
}

export function PrimaryButton({
  children,
  variant = "indigo",
  size = "md",
  loading = false,
  className = "",
  disabled = false,
  onClick,
  type = "button"
}: PrimaryButtonProps) {
  const baseStyle = "inline-flex items-center justify-center font-bold tracking-tight transition-all active:scale-[0.98] outline-none disabled:opacity-50 disabled:cursor-not-allowed select-none cursor-pointer";
  
  const sizeStyles = {
    sm: "px-3 py-1.5 text-xs rounded-xl gap-1.5",
    md: "px-4.5 py-2.5 text-xs rounded-2xl gap-2",
    lg: "px-6 py-3.5 text-sm rounded-3xl gap-2 md:gap-2.5"
  };

  const variantStyles = {
    indigo: "bg-[#e2fbeb] text-[#01893d] border border-[#a2f2bd] hover:bg-[#bbf7d0] hover:text-[#004d22] focus:ring-2 focus:ring-[#03C75A]/40 shadow-xs",
    emerald: "bg-emerald-50 text-emerald-700 border border-emerald-200 hover:bg-emerald-100 focus:ring-2 focus:ring-emerald-300 shadow-xs",
    rose: "bg-rose-50 text-[#E11D48] border border-rose-200 hover:bg-rose-100 hover:text-[#9f1239] focus:ring-2 focus:ring-rose-300 shadow-xs",
    slate: "bg-white/80 text-slate-705 border border-slate-200 hover:bg-slate-50 focus:ring-2 focus:ring-slate-300 shadow-xs backdrop-blur-md",
    amber: "bg-[#FFFBEB] text-[#D97706] border border-amber-200 hover:bg-[#FEF3C7] focus:ring-2 focus:ring-amber-300 shadow-xs"
  };

  return (
    <button
      type={type}
      disabled={disabled || loading}
      onClick={onClick}
      className={`${baseStyle} ${sizeStyles[size]} ${variantStyles[variant]} ${className}`}
    >
      {loading && (
        <svg className="animate-spin -ml-1 mr-1.5 h-3 w-3 text-current" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
          <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
          <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
        </svg>
      )}
      {children}
    </button>
  );
}

export interface StatusBadgeProps {
  status: string;
  size?: "xs" | "sm";
  className?: string;
}

export function StatusBadge({ status, size = "sm", className = "" }: StatusBadgeProps) {
  const cleanStatus = status.trim();
  const textStyles = size === "xs" ? "text-[9px] px-1.5 py-0.5 rounded-md font-extrabold" : "text-[10px] px-2.5 py-1 rounded-full font-black border";

  const getStyle = () => {
    switch (cleanStatus) {
      case "Proposal & Negotiation":
      case "계약 협상 및 제안":
        return "bg-emerald-50 text-[#01893d] border-[#a2f2bd]";
      case "Deal Completed":
      case "도입 종결":
      case "완료":
        return "bg-emerald-500 text-white border-emerald-600";
      case "First Meeting":
      case "첫 미팅 진행":
      case "회의 진행":
        return "bg-sky-50 text-sky-700 border-sky-150";
      case "Cold Call":
      case "초동 발굴":
      case "대기중":
        return "bg-amber-50 text-amber-700 border-amber-205";
      default:
        return "bg-slate-50 text-slate-600 border-slate-150";
    }
  };

  return (
    <span className={`inline-flex items-center uppercase tracking-wider ${textStyles} ${getStyle()} ${className}`}>
      ● {cleanStatus}
    </span>
  );
}

export interface CardViewProps {
  children?: React.ReactNode;
  header?: React.ReactNode;
  footer?: React.ReactNode;
  glowColor?: "indigo" | "emerald" | "rose" | "none";
  className?: string;
}

export function CardView({
  children,
  header,
  footer,
  glowColor = "none",
  className = ""
}: CardViewProps) {
  
  const glowStyles = {
    none: "border-slate-100 shadow-sm",
    indigo: "border-[#a2f2bd] shadow-md shadow-[#03C75A]/5 hover:border-[#03C75A]/60",
    emerald: "border-emerald-200 shadow-md shadow-emerald-100/10 hover:border-emerald-300",
    rose: "border-rose-100 shadow-md shadow-rose-100/10 hover:border-rose-250"
  };

  return (
    <div
      className={`glass-card rounded-3xl p-5 sm:p-6 transition-all duration-300 ${glowStyles[glowColor]} ${className}`}
    >
      {header && (
        <div className="border-b border-slate-50 pb-4 mb-4 flex items-center justify-between">
          {header}
        </div>
      )}
      <div className="text-slate-700 text-xs leading-relaxed space-y-3">
        {children}
      </div>
      {footer && (
        <div className="border-t border-slate-50 pt-4 mt-4 text-xs text-slate-400">
          {footer}
        </div>
      )}
    </div>
  );
}
