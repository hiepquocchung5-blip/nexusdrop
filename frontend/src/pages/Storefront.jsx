import { Link } from "react-router-dom";
import { motion } from "framer-motion";
import { ArrowRight, Zap, ShieldCheck, Timer, Gamepad2, Sparkles, AlertCircle } from "lucide-react";
import { useGames } from "../lib/queries";
import { extractError } from "../lib/api";
import { gameArt } from "../components/gameArt";
import { money } from "../lib/format";
import { useAuth } from "../lib/auth";
import { Card, Skeleton, EmptyState, Badge, Button } from "../components/ui";
import PageTransition from "../components/PageTransition";

const STATS = [
  { icon: Timer, label: "Avg. delivery", value: "under 60s" },
  { icon: ShieldCheck, label: "Wallet safety", value: "ACID-safe" },
  { icon: Zap, label: "Uptime", value: "99.9%" },
];

function Hero() {
  return (
    <section className="relative overflow-hidden rounded-[2rem] border border-line px-6 py-14 sm:px-12 sm:py-20">
      <div
        className="absolute inset-0 -z-10 opacity-70"
        style={{
          background:
            "radial-gradient(60% 120% at 15% -10%, rgba(124,92,255,0.35), transparent 60%), radial-gradient(50% 100% at 100% 0%, rgba(34,211,238,0.28), transparent 55%)",
        }}
      />
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.6, ease: [0.16, 1, 0.3, 1] }}
        className="max-w-2xl"
      >
        <Badge tone="violet" className="mb-5">
          <Sparkles className="size-3.5" /> Instant fulfillment engine
        </Badge>
        <h1 className="font-display text-4xl font-bold leading-[1.05] tracking-tight sm:text-6xl">
          Top up your game in
          <br />
          <span className="text-gradient">seconds, not hours.</span>
        </h1>
        <p className="mt-5 max-w-lg text-base text-muted sm:text-lg">
          Diamonds, UC and more — delivered to your Player ID the moment your payment
          clears. Automated supplier routing with a verified manual fallback.
        </p>
        <div className="mt-8 flex flex-wrap gap-3">
          <Button as="a" href="#catalog" size="lg">
            Browse games <ArrowRight className="size-4" />
          </Button>
          <Button as={Link} to="/orders" variant="subtle" size="lg">
            Track an order
          </Button>
        </div>

        <div className="mt-10 flex flex-wrap gap-6">
          {STATS.map((s) => (
            <div key={s.label} className="flex items-center gap-3">
              <span className="grid size-10 place-items-center rounded-xl bg-white/5 text-cyan">
                <s.icon className="size-5" />
              </span>
              <div>
                <div className="text-sm font-semibold text-ink">{s.value}</div>
                <div className="text-xs text-faint">{s.label}</div>
              </div>
            </div>
          ))}
        </div>
      </motion.div>
    </section>
  );
}

function GameCard({ game, index }) {
  const art = gameArt(game.slug);
  const from = Math.min(
    ...game.packages.map((p) => Number(p.sell_price)),
    Infinity
  );
  return (
    <motion.div
      initial={{ opacity: 0, y: 24 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ delay: index * 0.06, duration: 0.4, ease: [0.16, 1, 0.3, 1] }}
    >
      <Link to={`/game/${game.slug}`} className="group block">
        <Card className="card-hover overflow-hidden">
          <div
            className="relative flex h-36 items-center justify-center"
            style={{ background: art.gradient }}
          >
            <div className="absolute inset-0 bg-[radial-gradient(circle_at_30%_20%,rgba(255,255,255,0.35),transparent_55%)]" />
            <span className="font-display text-5xl font-black tracking-tighter text-void/80 drop-shadow">
              {art.initials || <Gamepad2 className="size-12" />}
            </span>
            <span className="absolute right-3 top-3 rounded-full bg-void/40 px-2.5 py-1 text-xs font-medium text-white backdrop-blur">
              {game.packages.length} packs
            </span>
          </div>
          <div className="p-5">
            <div className="flex items-start justify-between gap-3">
              <div>
                <h3 className="font-display text-lg font-semibold text-ink">
                  {game.name}
                </h3>
                {game.region_hint && (
                  <p className="mt-0.5 text-xs text-faint">{game.region_hint}</p>
                )}
              </div>
              <ArrowRight className="size-5 shrink-0 text-faint transition-all group-hover:translate-x-1 group-hover:text-cyan" />
            </div>
            <div className="mt-4 flex items-center justify-between border-t border-line pt-4">
              <span className="text-xs text-faint">from</span>
              <span className="font-display text-lg font-bold text-gradient">
                {Number.isFinite(from) ? money(from) : "—"}
              </span>
            </div>
          </div>
        </Card>
      </Link>
    </motion.div>
  );
}

export default function Storefront() {
  const { data: games, isLoading, isError, error, refetch } = useGames();
  const { isMockApi } = useAuth();

  return (
    <PageTransition className="space-y-12">
      <Hero />

      <section id="catalog" className="scroll-mt-24">
        <div className="mb-6 flex items-end justify-between">
          <div>
            <h2 className="font-display text-2xl font-bold">Pick your game</h2>
            <p className="mt-1 text-sm text-muted">
              {isMockApi ? "Mock catalog with the same shape as the production API." : "Live catalog, tiered pricing, instant delivery."}
            </p>
          </div>
          {isMockApi && <Badge tone="cyan">Mock API</Badge>}
        </div>

        {isLoading && (
          <div className="grid gap-5 sm:grid-cols-2 lg:grid-cols-3">
            {Array.from({ length: 6 }).map((_, i) => (
              <Skeleton key={i} className="h-64" />
            ))}
          </div>
        )}

        {isError && (
          <EmptyState
            icon={AlertCircle}
            title="Couldn't load the catalog"
            body={extractError(error, "The API is unreachable. Is the backend running on :8000?")}
            action={<Button onClick={() => refetch()}>Retry</Button>}
          />
        )}

        {!isLoading && !isError && games?.length === 0 && (
          <EmptyState
            icon={Gamepad2}
            title="No games yet"
            body="Seed the catalog with `python manage.py seed_demo` on the backend."
          />
        )}

        {!isLoading && !isError && games?.length > 0 && (
          <div className="grid gap-5 sm:grid-cols-2 lg:grid-cols-3">
            {games.map((g, i) => (
              <GameCard key={g.id} game={g} index={i} />
            ))}
          </div>
        )}
      </section>
    </PageTransition>
  );
}
