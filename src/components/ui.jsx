import { useEffect } from "react";
import { AlertCircle, Check, X } from "lucide-react";

// ─── Toast ──────────────────────────────────────────────────
export function Toast({ message, type = "success", onClose }) {
  useEffect(() => {
    const t = setTimeout(onClose, 4000);
    return () => clearTimeout(t);
  }, [onClose]);

  const colors = {
    success: "bg-emerald-600",
    error: "bg-red-600",
    info: "bg-sky-600",
  };

  return (
    <div
      className={`fixed top-6 right-6 z-50 ${colors[type]} text-white px-5 py-3 rounded-xl shadow-2xl flex items-center gap-3 animate-slide-in`}
    >
      {type === "error" ? <AlertCircle size={18} /> : <Check size={18} />}
      <span className="text-sm font-medium">{message}</span>
      <button onClick={onClose} className="ml-2 opacity-70 hover:opacity-100">
        <X size={16} />
      </button>
    </div>
  );
}

// ─── Spinner ────────────────────────────────────────────────
export function Spinner({ text = "Carregando..." }) {
  return (
    <div className="flex flex-col items-center justify-center gap-4 py-16">
      <div className="w-10 h-10 border-[3px] border-amber-400 border-t-transparent rounded-full animate-spin" />
      <p className="text-slate-400 text-sm tracking-wide">{text}</p>
    </div>
  );
}

// ─── Badge ──────────────────────────────────────────────────
export function Badge({ children, variant = "default" }) {
  const styles = {
    default: "bg-slate-700/60 text-slate-300",
    success: "bg-emerald-900/40 text-emerald-400",
    warning: "bg-amber-900/40 text-amber-400",
    danger: "bg-red-900/40 text-red-400",
    info: "bg-sky-900/40 text-sky-400",
  };
  return (
    <span className={`px-2.5 py-1 rounded-full text-xs font-semibold tracking-wide ${styles[variant]}`}>
      {children}
    </span>
  );
}

// ─── Card ───────────────────────────────────────────────────
export function Card({ children, className = "", onClick, ...rest }) {
  return (
    <div
      onClick={onClick}
      className={`bg-slate-800/50 backdrop-blur border border-slate-700/50 rounded-2xl p-6
        ${onClick ? "cursor-pointer hover:border-amber-500/40 hover:bg-slate-800/70 transition-all duration-300" : ""}
        ${className}`}
      {...rest}
    >
      {children}
    </div>
  );
}

// ─── Button ─────────────────────────────────────────────────
export function Button({
  children,
  onClick,
  variant = "primary",
  size = "md",
  disabled,
  className = "",
  type = "button",
}) {
  const base =
    "font-semibold rounded-xl transition-all duration-200 flex items-center justify-center gap-2 disabled:opacity-40 disabled:cursor-not-allowed";
  const sizes = {
    sm: "px-3 py-1.5 text-xs",
    md: "px-5 py-2.5 text-sm",
    lg: "px-7 py-3 text-base",
  };
  const variants = {
    primary:
      "bg-gradient-to-r from-amber-500 to-orange-500 text-slate-900 hover:from-amber-400 hover:to-orange-400 shadow-lg shadow-amber-500/20",
    secondary:
      "bg-slate-700/60 text-slate-200 hover:bg-slate-600/60 border border-slate-600/50",
    danger: "bg-red-600/80 text-white hover:bg-red-500",
    ghost: "text-slate-400 hover:text-slate-200 hover:bg-slate-700/40",
  };
  return (
    <button
      type={type}
      onClick={onClick}
      disabled={disabled}
      className={`${base} ${sizes[size]} ${variants[variant]} ${className}`}
    >
      {children}
    </button>
  );
}

// ─── Input ──────────────────────────────────────────────────
export function Input({ label, error, className = "", ...props }) {
  return (
    <div className={`flex flex-col gap-1.5 ${className}`}>
      {label && (
        <label className="text-sm font-medium text-slate-300 tracking-wide">{label}</label>
      )}
      <input
        {...props}
        className={`bg-slate-800/60 border ${
          error ? "border-red-500/60" : "border-slate-600/50"
        } rounded-xl px-4 py-2.5 text-slate-100 placeholder:text-slate-500 focus:outline-none focus:ring-2 focus:ring-amber-500/40 focus:border-amber-500/50 transition-all`}
      />
      {error && <span className="text-xs text-red-400">{error}</span>}
    </div>
  );
}

// ─── Select ─────────────────────────────────────────────────
export function Select({ label, options, className = "", ...props }) {
  return (
    <div className={`flex flex-col gap-1.5 ${className}`}>
      {label && (
        <label className="text-sm font-medium text-slate-300 tracking-wide">{label}</label>
      )}
      <select
        {...props}
        className="bg-slate-800/60 border border-slate-600/50 rounded-xl px-4 py-2.5 text-slate-100 focus:outline-none focus:ring-2 focus:ring-amber-500/40 appearance-none"
      >
        {options.map((o) => (
          <option key={o.value} value={o.value}>
            {o.label}
          </option>
        ))}
      </select>
    </div>
  );
}

// ─── Textarea ───────────────────────────────────────────────
export function Textarea({ label, className = "", ...props }) {
  return (
    <div className={`flex flex-col gap-1.5 ${className}`}>
      {label && (
        <label className="text-sm font-medium text-slate-300 tracking-wide">{label}</label>
      )}
      <textarea
        {...props}
        className="bg-slate-800/60 border border-slate-600/50 rounded-xl px-4 py-3 text-slate-100 placeholder:text-slate-500 focus:outline-none focus:ring-2 focus:ring-amber-500/40 resize-none transition-all min-h-[100px]"
      />
    </div>
  );
}
