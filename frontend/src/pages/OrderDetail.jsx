import { Link, useParams } from "react-router-dom";
import { motion } from "framer-motion";
import { ArrowLeft, AlertCircle, Copy, Check, Cpu } from "lucide-react";
import { useState } from "react";
import clsx from "clsx";
import { useOrder } from "../lib/queries";
import { extractError } from "../lib/api";
import { money, timeAgo, shortId } from "../lib/format";
import { STATUS_META, FLOW, StatusBadge } from "../components/orderStatus";
import { Card, Skeleton, EmptyState, Button, Badge } from "../components/ui";
import PageTransition from "../components/PageTransition";
import { useToast } from "../components/Toast";

function Tracker({ status }) {
  const meta = STATUS_META[status] || {};
  const failed = status === "failed" || status === "refunded";
  const activeStep = failed ? 1 : meta.step ?? 0;

  return (
    <div className="relative">
      {FLOW.map((s, i) => {
        const sMeta = STATUS_META[s];
        const Icon = sMeta.icon;
        const done = i < activeStep;
        const active = i === activeStep && !failed;
        const isLast = i === FLOW.length - 1;
        return (
          <div key={s} className="relative flex gap-4 pb-8 last:pb-0">
            {!isLast && (
              <span
                className={clsx(
                  "absolute left-[18px] top-9 h-[calc(100%-1rem)] w-0.5",
                  done ? "bg-gradient-to-b from-emerald to-cyan" : "bg-line"
                )}
              />
            )}
            <div
              className={clsx(
                "relative z-10 grid size-9 shrink-0 place-items-center rounded-full border-2 transition-colors",
                done && "border-emerald bg-emerald text-void",
                active && "border-violet bg-violet/20 text-violet-soft",
                !done && !active && "border-line bg-abyss text-faint"
              )}
            >
              {active ? (
                <motion.span
                  animate={{ scale: [1, 1.25, 1] }}
                  transition={{ repeat: Infinity, duration: 1.6 }}
                >
                  <Icon className="size-4" />
                </motion.span>
              ) : (
                <Icon className="size-4" />
              )}
            </div>
            <div className="pt-1">
              <div
                className={clsx(
                  "font-medium",
                  done || active ? "text-ink" : "text-faint"
                )}
              >
                {sMeta.label}
              </div>
              {active && (
                <div className="text-xs text-violet-soft">In progress…</div>
              )}
            </div>
          </div>
        );
      })}
      {failed && (
        <div className="mt-2 rounded-2xl border border-rose/30 bg-rose/10 p-4 text-sm text-rose">
          This order was {status === "refunded" ? "refunded" : "marked failed"}.
        </div>
      )}
    </div>
  );
}

export default function OrderDetail() {
  const { id } = useParams();
  const toast = useToast();
  const [copied, setCopied] = useState(false);
  const { data: order, isLoading, isError, error } = useOrder(id, { poll: true });

  function copyId() {
    navigator.clipboard.writeText(id);
    setCopied(true);
    toast.success("Order ID copied");
    setTimeout(() => setCopied(false), 1500);
  }

  if (isLoading) {
    return (
      <PageTransition className="space-y-6">
        <Skeleton className="h-8 w-40" />
        <div className="grid gap-6 lg:grid-cols-[1fr_1.2fr]">
          <Skeleton className="h-80" />
          <Skeleton className="h-80" />
        </div>
      </PageTransition>
    );
  }

  if (isError || !order) {
    return (
      <PageTransition>
        <EmptyState
          icon={AlertCircle}
          title="Order not found"
          body={extractError(error)}
          action={<Button as={Link} to="/orders">Back to orders</Button>}
        />
      </PageTransition>
    );
  }

  return (
    <PageTransition className="space-y-6">
      <Link
        to="/orders"
        className="inline-flex items-center gap-2 text-sm text-muted transition hover:text-ink"
      >
        <ArrowLeft className="size-4" /> All orders
      </Link>

      <div className="flex flex-wrap items-center justify-between gap-3">
        <div className="flex items-center gap-3">
          <h1 className="font-display text-2xl font-bold">Order #{shortId(order.id)}</h1>
          <button
            onClick={copyId}
            className="inline-flex items-center gap-1.5 rounded-lg border border-line px-2 py-1 text-xs text-muted transition hover:text-ink"
          >
            {copied ? <Check className="size-3.5 text-emerald" /> : <Copy className="size-3.5" />}
            copy id
          </button>
        </div>
        <StatusBadge status={order.status} />
      </div>

      <div className="grid gap-6 lg:grid-cols-[1fr_1.2fr]">
        <Card className="p-6">
          <h2 className="mb-5 font-display text-lg font-semibold">Progress</h2>
          <Tracker status={order.status} />
        </Card>

        <div className="space-y-6">
          <Card className="p-6">
            <h2 className="mb-4 font-display text-lg font-semibold">Details</h2>
            <div className="space-y-3 text-sm">
              <Row label="Game" value={order.game} />
              <Row label="Package" value={order.package?.title} />
              <Row label="Amount" value={order.package?.amount_label} />
              <Row label="Player ID" value={order.player_id} />
              {order.zone_id && <Row label="Zone ID" value={order.zone_id} />}
              <Row label="Placed" value={timeAgo(order.created_at)} />
              <div className="flex items-center justify-between border-t border-line pt-3">
                <span className="text-muted">Total paid</span>
                <span className="font-display text-xl font-bold text-gradient">
                  {money(order.quoted_price)}
                </span>
              </div>
            </div>
          </Card>

          {order.supplier_reference && (
            <Card className="p-5">
              <div className="flex items-center gap-2 text-sm text-muted">
                <Cpu className="size-4 text-cyan" /> Supplier reference
              </div>
              <code className="mt-2 block break-all rounded-xl bg-abyss px-3 py-2 text-sm text-cyan">
                {order.supplier_reference}
              </code>
            </Card>
          )}

          {order.failure_reason && (
            <Card className="border-rose/30 bg-rose/5 p-5">
              <Badge tone="rose">Failure reason</Badge>
              <p className="mt-2 text-sm text-ink">{order.failure_reason}</p>
            </Card>
          )}
        </div>
      </div>
    </PageTransition>
  );
}

function Row({ label, value }) {
  return (
    <div className="flex items-center justify-between gap-4">
      <span className="text-muted">{label}</span>
      <span className="truncate font-medium text-ink">{value || "—"}</span>
    </div>
  );
}
