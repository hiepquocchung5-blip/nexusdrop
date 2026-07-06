import clsx from "clsx";
import { Loader2 } from "lucide-react";

export function Button({
  as: Comp = "button",
  variant = "primary",
  size = "md",
  loading = false,
  className,
  children,
  disabled,
  ...props
}) {
  const base =
    "relative inline-flex items-center justify-center gap-2 font-semibold rounded-2xl transition-all duration-200 select-none disabled:opacity-50 disabled:pointer-events-none active:scale-[0.98]";
  const sizes = {
    sm: "text-sm px-3.5 py-2",
    md: "text-sm px-5 py-3",
    lg: "text-base px-7 py-4",
  };
  const variants = {
    primary:
      "btn-glow text-white bg-gradient-to-r from-violet to-cyan shadow-lg shadow-violet/20 hover:brightness-110",
    ghost: "text-muted hover:text-ink bg-white/0 hover:bg-white/5 border border-line",
    subtle: "text-ink bg-white/5 hover:bg-white/10 border border-line",
    danger: "text-white bg-gradient-to-r from-rose to-[#ff8a5d] hover:brightness-110",
    success: "text-void bg-gradient-to-r from-emerald to-lime hover:brightness-110",
  };
  return (
    <Comp
      className={clsx(base, sizes[size], variants[variant], className)}
      disabled={disabled || loading}
      {...props}
    >
      {loading && <Loader2 className="size-4 animate-spin" />}
      {children}
    </Comp>
  );
}

export function Card({ className, glow = false, children, ...props }) {
  return (
    <div
      className={clsx(
        "glass rounded-3xl",
        glow && "shadow-[0_20px_60px_-20px_rgba(124,92,255,0.45)]",
        className
      )}
      {...props}
    >
      {children}
    </div>
  );
}

export function Input({ label, error, hint, className, id, ...props }) {
  return (
    <label className="block">
      {label && (
        <span className="mb-1.5 block text-sm font-medium text-muted">{label}</span>
      )}
      <input
        id={id}
        className={clsx(
          "w-full rounded-2xl bg-abyss/80 border px-4 py-3 text-ink placeholder:text-faint outline-none transition",
          "focus:border-cyan focus:ring-2 focus:ring-cyan/30",
          error ? "border-rose/70" : "border-line",
          className
        )}
        {...props}
      />
      {error ? (
        <span className="mt-1.5 block text-xs text-rose">{error}</span>
      ) : hint ? (
        <span className="mt-1.5 block text-xs text-faint">{hint}</span>
      ) : null}
    </label>
  );
}

export function Badge({ tone = "violet", children, className }) {
  const tones = {
    violet: "bg-violet/15 text-violet-soft border-violet/30",
    cyan: "bg-cyan/15 text-cyan border-cyan/30",
    emerald: "bg-emerald/15 text-emerald border-emerald/30",
    amber: "bg-amber/15 text-amber border-amber/30",
    rose: "bg-rose/15 text-rose border-rose/30",
    faint: "bg-white/5 text-muted border-line",
  };
  return (
    <span
      className={clsx(
        "inline-flex items-center gap-1.5 rounded-full border px-2.5 py-1 text-xs font-medium",
        tones[tone],
        className
      )}
    >
      {children}
    </span>
  );
}

export function Spinner({ className }) {
  return <Loader2 className={clsx("animate-spin text-violet-soft", className)} />;
}

export function Skeleton({ className }) {
  return <div className={clsx("shimmer rounded-2xl bg-white/5", className)} />;
}

export function EmptyState({ icon: Icon, title, body, action }) {
  return (
    <div className="flex flex-col items-center justify-center rounded-3xl border border-dashed border-line px-6 py-16 text-center">
      {Icon && (
        <div className="mb-4 grid size-14 place-items-center rounded-2xl bg-violet/10 text-violet-soft">
          <Icon className="size-7" />
        </div>
      )}
      <h3 className="text-lg font-semibold text-ink">{title}</h3>
      {body && <p className="mt-1 max-w-sm text-sm text-muted">{body}</p>}
      {action && <div className="mt-5">{action}</div>}
    </div>
  );
}
