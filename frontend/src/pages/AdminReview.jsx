import { useMemo, useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { ShieldCheck, AlertCircle, Check, X, ImageOff, Inbox, Clock } from "lucide-react";
import { useProofs, useReviewProof } from "../lib/queries";
import { extractError, BASE_URL } from "../lib/api";
import { timeAgo, shortId } from "../lib/format";
import { Card, Skeleton, EmptyState, Button, Badge } from "../components/ui";
import PageTransition from "../components/PageTransition";
import { useToast } from "../components/Toast";

const ORIGIN = BASE_URL.replace(/\/api\/?$/, "");

function proofImageUrl(image) {
  if (!image) return null;
  return /^https?:\/\//.test(image) ? image : `${ORIGIN}${image}`;
}

function ProofCard({ proof, onDecision, pending }) {
  const [reason, setReason] = useState("");
  const [showReject, setShowReject] = useState(false);
  const img = proofImageUrl(proof.image);
  const decided = proof.is_approved !== null;

  return (
    <motion.div
      layout
      initial={{ opacity: 0, y: 16 }}
      animate={{ opacity: 1, y: 0 }}
      exit={{ opacity: 0, scale: 0.96 }}
    >
      <Card className="overflow-hidden">
        <div className="relative aspect-video bg-abyss">
          {img ? (
            <a href={img} target="_blank" rel="noreferrer">
              <img
                src={img}
                alt={`Proof for order ${shortId(proof.order)}`}
                className="size-full object-cover transition hover:opacity-90"
              />
            </a>
          ) : (
            <div className="grid size-full place-items-center text-faint">
              <ImageOff className="size-8" />
            </div>
          )}
          <div className="absolute left-3 top-3">
            {decided ? (
              <Badge tone={proof.is_approved ? "emerald" : "rose"}>
                {proof.is_approved ? "Approved" : "Rejected"}
              </Badge>
            ) : (
              <Badge tone="amber">
                <Clock className="size-3" /> Awaiting review
              </Badge>
            )}
          </div>
        </div>

        <div className="space-y-3 p-5">
          <div className="flex items-center justify-between">
            <span className="font-display font-semibold text-ink">
              Order #{shortId(proof.order)}
            </span>
            <span className="text-xs text-faint">{timeAgo(proof.created_at)}</span>
          </div>
          {proof.submitted_note && (
            <p className="rounded-xl bg-white/[0.03] px-3 py-2 text-sm text-muted">
              “{proof.submitted_note}”
            </p>
          )}

          {!decided && (
            <AnimatePresence mode="wait">
              {showReject ? (
                <motion.div
                  key="reject"
                  initial={{ opacity: 0, height: 0 }}
                  animate={{ opacity: 1, height: "auto" }}
                  exit={{ opacity: 0, height: 0 }}
                  className="space-y-2"
                >
                  <input
                    autoFocus
                    value={reason}
                    onChange={(e) => setReason(e.target.value)}
                    placeholder="Reason for rejection"
                    className="w-full rounded-xl border border-line bg-abyss px-3 py-2 text-sm outline-none focus:border-rose"
                  />
                  <div className="flex gap-2">
                    <Button variant="ghost" size="sm" onClick={() => setShowReject(false)}>
                      Cancel
                    </Button>
                    <Button
                      variant="danger"
                      size="sm"
                      className="flex-1"
                      loading={pending}
                      onClick={() =>
                        onDecision({ id: proof.id, decision: "reject", reason: reason || undefined })
                      }
                    >
                      Confirm reject
                    </Button>
                  </div>
                </motion.div>
              ) : (
                <motion.div key="actions" className="flex gap-2">
                  <Button
                    variant="ghost"
                    size="sm"
                    className="flex-1"
                    onClick={() => setShowReject(true)}
                  >
                    <X className="size-4" /> Reject
                  </Button>
                  <Button
                    variant="success"
                    size="sm"
                    className="flex-1"
                    loading={pending}
                    onClick={() => onDecision({ id: proof.id, decision: "approve" })}
                  >
                    <Check className="size-4" /> Approve
                  </Button>
                </motion.div>
              )}
            </AnimatePresence>
          )}
        </div>
      </Card>
    </motion.div>
  );
}

export default function AdminReview() {
  const toast = useToast();
  const { data: proofs, isLoading, isError, error, refetch } = useProofs();
  const review = useReviewProof();
  const [activeId, setActiveId] = useState(null);

  const { pendingList, resolvedList } = useMemo(() => {
    const list = proofs || [];
    return {
      pendingList: list.filter((p) => p.is_approved === null),
      resolvedList: list.filter((p) => p.is_approved !== null),
    };
  }, [proofs]);

  async function handleDecision(payload) {
    setActiveId(payload.id);
    try {
      await review.mutateAsync(payload);
      toast.success(payload.decision === "approve" ? "Approved — dispatching to supplier." : "Proof rejected.");
    } catch (err) {
      const status = err?.response?.status;
      if (status === 403) {
        toast.error("Staff privileges required to review payments.");
      } else {
        toast.error(extractError(err, "Action failed."));
      }
    } finally {
      setActiveId(null);
    }
  }

  return (
    <PageTransition className="space-y-8">
      <div className="flex items-center gap-3">
        <span className="grid size-11 place-items-center rounded-2xl bg-violet/15 text-violet-soft">
          <ShieldCheck className="size-6" />
        </span>
        <div>
          <h1 className="font-display text-2xl font-bold">Payment review queue</h1>
          <p className="mt-0.5 text-sm text-muted">
            Verify proofs to release orders to the supplier. Staff only.
          </p>
        </div>
      </div>

      {isLoading && (
        <div className="grid gap-5 sm:grid-cols-2 lg:grid-cols-3">
          {Array.from({ length: 3 }).map((_, i) => (
            <Skeleton key={i} className="h-80" />
          ))}
        </div>
      )}

      {isError && (
        <EmptyState
          icon={AlertCircle}
          title="Couldn't load the queue"
          body={extractError(error)}
          action={<Button onClick={() => refetch()}>Retry</Button>}
        />
      )}

      {!isLoading && !isError && (proofs?.length ?? 0) === 0 && (
        <EmptyState
          icon={Inbox}
          title="Queue is clear"
          body="No payment proofs are waiting. New submissions will appear here."
        />
      )}

      {pendingList.length > 0 && (
        <section>
          <div className="mb-4 flex items-center gap-2">
            <h2 className="font-display text-lg font-semibold">Awaiting review</h2>
            <Badge tone="amber">{pendingList.length}</Badge>
          </div>
          <div className="grid gap-5 sm:grid-cols-2 lg:grid-cols-3">
            <AnimatePresence>
              {pendingList.map((p) => (
                <ProofCard
                  key={p.id}
                  proof={p}
                  onDecision={handleDecision}
                  pending={review.isPending && activeId === p.id}
                />
              ))}
            </AnimatePresence>
          </div>
        </section>
      )}

      {resolvedList.length > 0 && (
        <section>
          <h2 className="mb-4 font-display text-lg font-semibold text-muted">Recently resolved</h2>
          <div className="grid gap-5 sm:grid-cols-2 lg:grid-cols-3">
            {resolvedList.map((p) => (
              <ProofCard key={p.id} proof={p} onDecision={handleDecision} pending={false} />
            ))}
          </div>
        </section>
      )}
    </PageTransition>
  );
}
