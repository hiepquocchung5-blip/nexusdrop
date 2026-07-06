import { NavLink, Link, useNavigate } from "react-router-dom";
import { motion } from "framer-motion";
import { Gamepad2, Wallet, Receipt, ShieldCheck, LogOut, LogIn, Menu, X } from "lucide-react";
import { useState } from "react";
import clsx from "clsx";
import { useAuth } from "../lib/auth";
import { Button } from "./ui";

const LINKS = [
  { to: "/", label: "Store", icon: Gamepad2, end: true },
  { to: "/orders", label: "Orders", icon: Receipt, auth: true },
  { to: "/wallet", label: "Wallet", icon: Wallet, auth: true },
  { to: "/admin", label: "Review", icon: ShieldCheck, auth: true },
];

function NavItem({ to, label, icon: Icon, end }) {
  return (
    <NavLink to={to} end={end}>
      {({ isActive }) => (
        <span
          className={clsx(
            "relative inline-flex items-center gap-2 rounded-xl px-3.5 py-2 text-sm font-medium transition-colors",
            isActive ? "text-ink" : "text-muted hover:text-ink"
          )}
        >
          <Icon className="size-4" />
          {label}
          {isActive && (
            <motion.span
              layoutId="nav-pill"
              className="absolute inset-0 -z-10 rounded-xl bg-white/8 ring-1 ring-white/10"
              transition={{ type: "spring", stiffness: 500, damping: 34 }}
            />
          )}
        </span>
      )}
    </NavLink>
  );
}

export default function Navbar() {
  const { user, isAuthenticated, signOut } = useAuth();
  const navigate = useNavigate();
  const [open, setOpen] = useState(false);
  const links = LINKS.filter((l) => !l.auth || isAuthenticated);

  return (
    <header className="sticky top-0 z-50">
      <div className="glass border-x-0 border-t-0">
        <div className="mx-auto flex h-16 max-w-6xl items-center justify-between px-4 sm:px-6">
          <Link to="/" className="flex items-center gap-2.5">
            <span className="grid size-9 place-items-center rounded-xl bg-gradient-to-br from-violet to-cyan text-void shadow-lg shadow-violet/30">
              <Gamepad2 className="size-5" />
            </span>
            <span className="font-display text-lg font-bold tracking-tight">
              Nexus<span className="text-gradient">Drop</span>
            </span>
          </Link>

          <nav className="hidden items-center gap-1 md:flex">
            {links.map((l) => (
              <NavItem key={l.to} {...l} />
            ))}
          </nav>

          <div className="hidden items-center gap-3 md:flex">
            {isAuthenticated ? (
              <>
                <span className="text-sm text-muted">
                  Hi, <span className="font-semibold text-ink">{user.username}</span>
                </span>
                <Button variant="ghost" size="sm" onClick={signOut}>
                  <LogOut className="size-4" /> Sign out
                </Button>
              </>
            ) : (
              <Button as={Link} to="/login" size="sm">
                <LogIn className="size-4" /> Sign in
              </Button>
            )}
          </div>

          <button
            className="grid size-10 place-items-center rounded-xl border border-line text-ink md:hidden"
            onClick={() => setOpen((v) => !v)}
            aria-label="Menu"
          >
            {open ? <X className="size-5" /> : <Menu className="size-5" />}
          </button>
        </div>

        {open && (
          <motion.div
            initial={{ height: 0, opacity: 0 }}
            animate={{ height: "auto", opacity: 1 }}
            className="overflow-hidden border-t border-line px-4 py-3 md:hidden"
          >
            <div className="flex flex-col gap-1">
              {links.map((l) => (
                <div key={l.to} onClick={() => setOpen(false)}>
                  <NavItem {...l} />
                </div>
              ))}
              <div className="mt-2 border-t border-line pt-3">
                {isAuthenticated ? (
                  <Button
                    variant="ghost"
                    className="w-full"
                    onClick={() => {
                      setOpen(false);
                      signOut();
                    }}
                  >
                    <LogOut className="size-4" /> Sign out ({user.username})
                  </Button>
                ) : (
                  <Button
                    className="w-full"
                    onClick={() => {
                      setOpen(false);
                      navigate("/login");
                    }}
                  >
                    <LogIn className="size-4" /> Sign in
                  </Button>
                )}
              </div>
            </div>
          </motion.div>
        )}
      </div>
    </header>
  );
}
