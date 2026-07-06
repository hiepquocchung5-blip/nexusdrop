import { useMemo, useState } from "react";
import { Link, useNavigate, useParams } from "react-router-dom";
import { motion, AnimatePresence } from "framer-motion";
import {
  ArrowLeft,
  Check,
  Gamepad2,
  User,
  Hash,
  Upload,
  ImageIcon,
  Sparkles,
  ArrowRight,
  AlertCircle,
  LogIn,
} from "lucide-react";
import clsx from "clsx";
import { useGame, useCreateOrder, useSubmitProof, useLookupPlayer } from "../lib/queries";
import { extractError } from "../lib/api";
import { identitySchema } from "../lib/validation";
import { useAuth } from "../lib/auth";
import { useToast } from "../components/Toast";
import { money } from "../lib/format";
import { gameArt } from "../components/gameArt";
import { Card, Button, Input, Skeleton, EmptyState, Badge } from "../components/ui";
import PageTransition from "../components/PageTransition";

const STEPS = ["Package", "Identity", "Payment"];

function Stepper({ current }) {
  return (
    <div className="flex items-center gap-2">
      {STEPS.map((label, i) => (
        <div key={label} className="flex items-center gap-2">
          <div
            className={clsx(
              "flex items-center gap-2 rounded-full border px-3 py-1.5 text-xs font-medium transition-colors",
              i < current && "border-emerald/40 bg-emerald/10 text-emerald",
              i === current && "border-violet/50 bg-violet/15 text-violet-soft",
              i > current && "border-line text-faint"
            )}
          >
            <span
              className={clsx(
                "grid size-4 place-items-center rounded-full text-[10px] font-bold",
                i < current ? "bg-emerald text-void" : i === current ? "bg-violet text-void" : "bg-white/10"
              )}
            >
              {i < current ? <Check className="size-3" /> : i + 1}
            </span>
            {label}
          </div>
          {i < STEPS.length - 1 && <div className="h-px w-4 bg-line sm:w-8" />}
        </div>
      ))}
    </div>
  );
}

function PackageOption({ pkg, selected, onSelect }) {
  return (
    <button
      type="button"
      onClick={() => onSelect(pkg)}
      className={clsx(
        "group relative w-full rounded-2xl border p-4 text-left transition-all",
        selected
          ? "border-violet/60 bg-violet/10 shadow-[0_0_0_1px_rgba(124,92,255,0.4)]"
          : "border-line bg-white/[0.02] hover:border-violet/40 hover:bg-white/5"
      )}
    >
      <div className="flex items-center justify-between">
        <div>
          <div className="font-display text-base font-semibold text-ink">{pkg.title}</div>
          <div className="mt-0.5 text-xs text-faint">{pkg.amount_label}</div>
        </div>
        <div className="text-right">
          <div className="font-display text-lg font-bold text-gradient">{money(pkg.sell_price)}</div>
          <div className="text-[11px] text-faint">reseller {money(pkg.reseller_price)}</div>
        </div>
      </div>
      <div
        className={clsx(
          "absolute right-3 top-3 grid size-5 place-items-center rounded-full border transition",
          selected ? "border-violet bg-violet text-void" : "border-line text-transparent"
        )}
      >
        <Check className="size-3.5" />
      </div>
    </button>
  );
}

export default function GameDetail() {
  const { slug } = useParams();
  const navigate = useNavigate();
  const toast = useToast();
  const { isAuthenticated } = useAuth();
  const { data: game, isLoading, isError, error } = useGame(slug);

  const [step, setStep] = useState(0);
  const [pkg, setPkg] = useState(null);
  const [identity, setIdentity] = useState({ player_id: "", zone_id: "" });
  const [fieldErrors, setFieldErrors] = useState({});
  const [order, setOrder] = useState(null);
  const [file, setFile] = useState(null);
  const [note, setNote] = useState("");

  // Category Filtering
  const [activeCategory, setActiveCategory] = useState("");
  const categories = useMemo(() => {
    if (!game?.packages) return [];
    return Array.from(new Set(game.packages.map((p) => p.category || "Currency")));
  }, [game]);

  useMemo(() => {
    if (categories.length > 0 && !activeCategory) {
      setActiveCategory(categories[0]);
    }
  }, [categories, activeCategory]);

  const filteredPackages = useMemo(() => {
    if (!game?.packages) return [];
    const cat = activeCategory || categories[0] || "";
    return game.packages.filter((p) => (p.category || "Currency") === cat);
  }, [game, categories, activeCategory]);

  // Player Verification Setup
  const [lookupTriggered, setLookupTriggered] = useState(false);
  const [lookupPlayerId, setLookupPlayerId] = useState("");
  const [lookupZoneId, setLookupZoneId] = useState("");
  const [verifiedName, setVerifiedName] = useState("");

  const { data: lookupData, isFetching: isVerifying, isError: lookupFailed } = useLookupPlayer(
    slug,
    lookupPlayerId,
    lookupZoneId
  );

  useMemo(() => {
    if (lookupData?.player_name) {
      setVerifiedName(lookupData.player_name);
    }
  }, [lookupData]);

  const handleIdentityChange = (field, value) => {
    setIdentity((s) => ({ ...s, [field]: value }));
    setVerifiedName("");
    setLookupTriggered(false);
    setLookupPlayerId("");
    setLookupZoneId("");
  };

  const handleVerify = () => {
    if (!identity.player_id.trim()) {
      setFieldErrors({ player_id: "Player ID is required." });
      return;
    }
    setFieldErrors({});
    setLookupPlayerId(identity.player_id.trim());
    setLookupZoneId(identity.zone_id.trim());
    setLookupTriggered(true);
  };

  const createOrder = useCreateOrder();
  const submitProof = useSubmitProof();

  const art = useMemo(() => gameArt(slug), [slug]);
  const zoneRequired = /server|zone/i.test(game?.region_hint || "");


  if (isLoading) {
    return (
      <PageTransition className="space-y-6">
        <Skeleton className="h-40" />
        <div className="grid gap-6 lg:grid-cols-[1.4fr_1fr]">
          <Skeleton className="h-96" />
          <Skeleton className="h-96" />
        </div>
      </PageTransition>
    );
  }

  if (isError || !game) {
    return (
      <PageTransition>
        <EmptyState
          icon={AlertCircle}
          title="Game not found"
          body={extractError(error, "This game is unavailable.")}
          action={<Button as={Link} to="/">Back to store</Button>}
        />
      </PageTransition>
    );
  }

  function goIdentity() {
    if (!pkg) return toast.error("Select a package to continue.");
    setStep(1);
  }

  async function submitIdentity(e) {
    e.preventDefault();
    const parsed = identitySchema.safeParse(identity);
    if (!parsed.success) {
      const errs = {};
      for (const issue of parsed.error.issues) errs[issue.path[0]] = issue.message;
      setFieldErrors(errs);
      return;
    }
    if (zoneRequired && !identity.zone_id.trim()) {
      setFieldErrors({ zone_id: "This game requires a Server / Zone ID." });
      return;
    }
    setFieldErrors({});

    if (!isAuthenticated) {
      toast.info("Sign in to place your order.");
      navigate("/login", { state: { from: `/game/${slug}` } });
      return;
    }

    try {
      const created = await createOrder.mutateAsync({
        package: pkg.id,
        player_id: identity.player_id.trim(),
        zone_id: identity.zone_id.trim(),
      });
      setOrder(created);
      setStep(2);
      toast.success("Order created — upload your payment proof.");
    } catch (err) {
      toast.error(extractError(err, "Could not create the order."));
    }
  }

  async function submitPayment(e) {
    e.preventDefault();
    if (!file) return toast.error("Attach a payment screenshot first.");
    try {
      await submitProof.mutateAsync({ order: order.id, image: file, submitted_note: note });
      toast.success("Proof submitted! Our team is verifying it now.");
      navigate(`/orders/${order.id}`);
    } catch (err) {
      toast.error(extractError(err, "Upload failed."));
    }
  }

  return (
    <PageTransition className="space-y-8">
      <Link
        to="/"
        className="inline-flex items-center gap-2 text-sm text-muted transition hover:text-ink"
      >
        <ArrowLeft className="size-4" /> Back to store
      </Link>

      {/* Header */}
      <div className="relative overflow-hidden rounded-3xl border border-line">
        <div className="absolute inset-0 opacity-90" style={{ background: art.gradient }} />
        <div className="absolute inset-0 bg-gradient-to-t from-void via-void/50 to-transparent" />
        <div className="relative flex items-end gap-4 p-6 sm:p-8">
          <span className="grid size-16 shrink-0 place-items-center rounded-2xl bg-void/40 font-display text-2xl font-black text-white backdrop-blur">
            {art.initials || <Gamepad2 className="size-8" />}
          </span>
          <div>
            <h1 className="font-display text-2xl font-bold sm:text-3xl">{game.name}</h1>
            {game.region_hint && (
              <Badge tone="cyan" className="mt-2">
                <Hash className="size-3" /> {game.region_hint}
              </Badge>
            )}
          </div>
        </div>
      </div>

      <Stepper current={step} />

      <div className="grid gap-6 lg:grid-cols-[1.5fr_1fr]">
        {/* Left: active step */}
        <AnimatePresence mode="wait">
          <motion.div
            key={step}
            initial={{ opacity: 0, x: 16 }}
            animate={{ opacity: 1, x: 0 }}
            exit={{ opacity: 0, x: -16 }}
            transition={{ duration: 0.28 }}
          >
            {step === 0 && (
              <Card className="p-6">
                <h2 className="font-display text-lg font-semibold">Choose a package</h2>
                <p className="mt-1 text-sm text-muted">Prices shown are final, taxes included.</p>
                {categories.length > 1 && (
                  <div className="mt-4 flex flex-wrap gap-2 border-b border-line pb-4">
                    {categories.map((cat) => (
                      <button
                        key={cat}
                        type="button"
                        onClick={() => setActiveCategory(cat)}
                        className={clsx(
                          "rounded-xl px-3.5 py-1.5 text-xs font-semibold border transition-all",
                          (activeCategory || categories[0]) === cat
                            ? "bg-violet/15 border-violet/50 text-violet-soft font-bold shadow-[0_0_8px_rgba(124,92,255,0.25)]"
                            : "bg-white/[0.01] border-line text-muted hover:border-violet/40 hover:bg-white/5"
                        )}
                      >
                        {cat}
                      </button>
                    ))}
                  </div>
                )}
                <div className="mt-5 grid gap-3">
                  {filteredPackages.map((p) => (
                    <PackageOption key={p.id} pkg={p} selected={pkg?.id === p.id} onSelect={setPkg} />
                  ))}
                </div>
                <Button className="mt-6 w-full" onClick={goIdentity} disabled={!pkg}>
                  Continue <ArrowRight className="size-4" />
                </Button>
              </Card>
            )}

            {step === 1 && (
              <Card className="p-6">
                <h2 className="font-display text-lg font-semibold">Enter your game identity</h2>
                <p className="mt-1 text-sm text-muted">
                  We deliver directly to this account. Double-check it.
                </p>
                <form className="mt-5 space-y-4" onSubmit={submitIdentity}>
                  <div className="relative">
                    <User className="pointer-events-none absolute left-3 top-[42px] size-4 text-faint" />
                    <Input
                      label="Player ID"
                      placeholder="e.g. 12345678"
                      className="pl-9"
                      value={identity.player_id}
                      onChange={(e) => handleIdentityChange("player_id", e.target.value)}
                      error={fieldErrors.player_id}
                    />
                  </div>
                  <div className="relative">
                    <Hash className="pointer-events-none absolute left-3 top-[42px] size-4 text-faint" />
                    <Input
                      label={`Server / Zone ID ${zoneRequired ? "" : "(optional)"}`}
                      placeholder={zoneRequired ? "e.g. 2214" : "Leave blank if not applicable"}
                      className="pl-9"
                      value={identity.zone_id}
                      onChange={(e) => handleIdentityChange("zone_id", e.target.value)}
                      error={fieldErrors.zone_id}
                      hint={game.region_hint}
                    />
                  </div>
                  
                  <div className="pt-1">
                    <Button
                      type="button"
                      variant="ghost"
                      className="w-full text-xs font-semibold py-2"
                      onClick={handleVerify}
                      loading={isVerifying}
                      disabled={identity.player_id.trim().length < 4}
                    >
                      Verify In-Game Nickname
                    </Button>
                  </div>

                  {lookupTriggered && (
                    <div className="rounded-xl border border-line p-3 bg-white/[0.01] transition-all">
                      {isVerifying ? (
                        <div className="flex items-center gap-2 text-xs text-muted">
                          <span className="h-3.5 w-3.5 animate-spin rounded-full border-2 border-violet border-t-transparent" />
                          Verifying identity with game servers...
                        </div>
                      ) : lookupFailed ? (
                        <div className="flex items-center gap-2 text-xs text-red">
                          <AlertCircle className="size-4 shrink-0 text-red" />
                          Verification failed: Check Player ID & Server ID format.
                        </div>
                      ) : verifiedName ? (
                        <div className="flex items-center gap-2 text-xs text-emerald">
                          <Check className="size-4 shrink-0 text-emerald" />
                          Verified Nickname: <strong className="text-ink font-semibold">{verifiedName}</strong>
                        </div>
                      ) : null}
                    </div>
                  )}

                  <div className="flex gap-3 pt-2">
                    <Button type="button" variant="ghost" onClick={() => setStep(0)}>
                      <ArrowLeft className="size-4" /> Back
                    </Button>
                    <Button type="submit" className="flex-1" loading={createOrder.isPending}>
                      {isAuthenticated ? (
                        <>Place order <ArrowRight className="size-4" /></>
                      ) : (
                        <><LogIn className="size-4" /> Sign in to order</>
                      )}
                    </Button>
                  </div>
                </form>
              </Card>
            )}


            {step === 2 && order && (
              <Card className="p-6">
                <Badge tone="emerald" className="mb-3">
                  <Check className="size-3.5" /> Order #{String(order.id).split("-")[0]} created
                </Badge>
                <h2 className="font-display text-lg font-semibold">Upload payment proof</h2>
                <p className="mt-1 text-sm text-muted">
                  Pay {money(order.quoted_price)} then attach your receipt screenshot.
                </p>
                <form className="mt-5 space-y-4" onSubmit={submitPayment}>
                  <label
                    className={clsx(
                      "flex cursor-pointer flex-col items-center justify-center gap-2 rounded-2xl border-2 border-dashed px-6 py-10 text-center transition",
                      file ? "border-emerald/50 bg-emerald/5" : "border-line hover:border-violet/50 hover:bg-white/5"
                    )}
                  >
                    <input
                      type="file"
                      accept="image/*"
                      className="hidden"
                      onChange={(e) => setFile(e.target.files?.[0] || null)}
                    />
                    {file ? (
                      <>
                        <ImageIcon className="size-8 text-emerald" />
                        <span className="text-sm font-medium text-ink">{file.name}</span>
                        <span className="text-xs text-faint">Click to replace</span>
                      </>
                    ) : (
                      <>
                        <Upload className="size-8 text-violet-soft" />
                        <span className="text-sm font-medium text-ink">Drop screenshot or browse</span>
                        <span className="text-xs text-faint">PNG or JPG</span>
                      </>
                    )}
                  </label>
                  <Input
                    label="Note (optional)"
                    placeholder="Reference / transaction ID"
                    value={note}
                    onChange={(e) => setNote(e.target.value)}
                  />
                  <Button type="submit" className="w-full" loading={submitProof.isPending}>
                    Submit for verification <ArrowRight className="size-4" />
                  </Button>
                </form>
              </Card>
            )}
          </motion.div>
        </AnimatePresence>

        {/* Right: order summary */}
        <div className="lg:sticky lg:top-24 lg:self-start">
          <Card className="p-6" glow>
            <div className="flex items-center gap-2 text-sm font-semibold text-muted">
              <Sparkles className="size-4 text-cyan" /> Order summary
            </div>
            <div className="mt-4 space-y-3 text-sm">
              <Row label="Game" value={game.name} />
              <Row label="Package" value={pkg ? pkg.title : "—"} />
              <Row label="Amount" value={pkg ? pkg.amount_label : "—"} />
              {identity.player_id && <Row label="Player ID" value={identity.player_id} />}
              {identity.zone_id && <Row label="Zone ID" value={identity.zone_id} />}
              {verifiedName && <Row label="Nickname" value={verifiedName} />}
            </div>

            <div className="mt-5 flex items-center justify-between border-t border-line pt-5">
              <span className="text-sm text-muted">Total</span>
              <span className="font-display text-2xl font-bold text-gradient">
                {pkg ? money(pkg.sell_price) : "—"}
              </span>
            </div>
            <p className="mt-4 flex items-start gap-2 text-xs text-faint">
              <Check className="mt-0.5 size-3.5 shrink-0 text-emerald" />
              Auto-delivery once payment is verified. Manual review typically under 5 minutes.
            </p>
          </Card>
        </div>
      </div>
    </PageTransition>
  );
}

function Row({ label, value }) {
  return (
    <div className="flex items-center justify-between gap-4">
      <span className="text-muted">{label}</span>
      <span className="truncate font-medium text-ink">{value}</span>
    </div>
  );
}
