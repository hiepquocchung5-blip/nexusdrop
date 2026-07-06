import { useEffect, useState } from "react";
import { Link, useLocation, useNavigate } from "react-router-dom";
import { motion } from "framer-motion";
import { Gamepad2, Lock, User, LogIn, ShieldCheck, Zap } from "lucide-react";
import { useAuth } from "../lib/auth";
import { loginSchema } from "../lib/validation";
import { extractError } from "../lib/api";
import { useToast } from "../components/Toast";
import { Button, Input, Card, Badge } from "../components/ui";
import PageTransition from "../components/PageTransition";

export default function Login() {
  const { signIn, isAuthenticated, isMockApi } = useAuth();
  const navigate = useNavigate();
  const location = useLocation();
  const toast = useToast();
  const from = location.state?.from || "/orders";

  const [form, setForm] = useState({ username: "", password: "" });
  const [errors, setErrors] = useState({});
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    if (isAuthenticated) navigate(from, { replace: true });
  }, [isAuthenticated, from, navigate]);

  async function onSubmit(e) {
    e.preventDefault();
    const parsed = loginSchema.safeParse(form);
    if (!parsed.success) {
      const errs = {};
      for (const issue of parsed.error.issues) errs[issue.path[0]] = issue.message;
      setErrors(errs);
      return;
    }
    setErrors({});
    setLoading(true);
    try {
      await signIn(form.username.trim(), form.password);
      toast.success("Welcome back!");
      navigate(from, { replace: true });
    } catch (err) {
      toast.error(extractError(err, "Invalid credentials."));
    } finally {
      setLoading(false);
    }
  }

  return (
    <PageTransition>
      <div className="mx-auto grid max-w-4xl items-stretch gap-6 md:grid-cols-2">
        {/* Brand panel */}
        <motion.div
          initial={{ opacity: 0, x: -16 }}
          animate={{ opacity: 1, x: 0 }}
          className="relative hidden overflow-hidden rounded-3xl border border-line p-8 md:block"
        >
          <div
            className="absolute inset-0 -z-10"
            style={{
              background:
                "radial-gradient(80% 80% at 20% 10%, rgba(124,92,255,0.4), transparent 60%), radial-gradient(70% 70% at 100% 100%, rgba(34,211,238,0.3), transparent 60%)",
            }}
          />
          <span className="grid size-12 place-items-center rounded-2xl bg-void/40 backdrop-blur">
            <Gamepad2 className="size-6 text-cyan" />
          </span>
          <h2 className="mt-6 font-display text-3xl font-bold leading-tight">
            Welcome back to<br />
            <span className="text-gradient">NexusDrop.</span>
          </h2>
          <p className="mt-3 text-sm text-muted">
            Sign in to track orders, top up instantly, and manage your reseller wallet.
          </p>
          <div className="mt-8 space-y-3 text-sm">
            <Feature icon={Zap} text="Sub-minute automated delivery" />
            <Feature icon={ShieldCheck} text="ACID-safe wallet & JWT security" />
          </div>
        </motion.div>

        {/* Form */}
        <motion.div initial={{ opacity: 0, x: 16 }} animate={{ opacity: 1, x: 0 }}>
          <Card className="h-full p-8" glow>
            <Badge tone="violet" className="mb-4">Secure sign in</Badge>
            <h1 className="font-display text-2xl font-bold">Sign in</h1>
            <p className="mt-1 text-sm text-muted">Use your NexusDrop account credentials.</p>
            {isMockApi && (
              <p className="mt-3 rounded-2xl border border-cyan/25 bg-cyan/10 px-3 py-2 text-xs text-cyan">
                Mock login accepts any password. Use <b>admin</b> to review payment proofs.
              </p>
            )}

            <form className="mt-6 space-y-4" onSubmit={onSubmit}>
              <div className="relative">
                <User className="pointer-events-none absolute left-3 top-[42px] size-4 text-faint" />
                <Input
                  label="Username"
                  placeholder="your handle"
                  autoComplete="username"
                  className="pl-9"
                  value={form.username}
                  onChange={(e) => setForm((s) => ({ ...s, username: e.target.value }))}
                  error={errors.username}
                />
              </div>
              <div className="relative">
                <Lock className="pointer-events-none absolute left-3 top-[42px] size-4 text-faint" />
                <Input
                  label="Password"
                  type="password"
                  placeholder="••••••••"
                  autoComplete="current-password"
                  className="pl-9"
                  value={form.password}
                  onChange={(e) => setForm((s) => ({ ...s, password: e.target.value }))}
                  error={errors.password}
                />
              </div>
              <Button type="submit" className="w-full" size="lg" loading={loading}>
                <LogIn className="size-4" /> Sign in
              </Button>
            </form>

            <p className="mt-6 text-center text-sm text-faint">
              Just browsing?{" "}
              <Link to="/" className="font-medium text-violet-soft hover:underline">
                Explore the store
              </Link>
            </p>
          </Card>
        </motion.div>
      </div>
    </PageTransition>
  );
}

function Feature({ icon: Icon, text }) {
  return (
    <div className="flex items-center gap-3">
      <span className="grid size-8 place-items-center rounded-lg bg-white/10 text-cyan">
        <Icon className="size-4" />
      </span>
      <span className="text-muted">{text}</span>
    </div>
  );
}
