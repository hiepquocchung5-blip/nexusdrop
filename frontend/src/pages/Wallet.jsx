import { motion } from "framer-motion";
import { Wallet as WalletIcon, ArrowDownLeft, ArrowUpRight, RotateCcw, AlertCircle, History } from "lucide-react";
import { useWallet, useLedger } from "../lib/queries";
import { extractError } from "../lib/api";
import { money, timeAgo } from "../lib/format";
import { Card, Skeleton, EmptyState, Badge } from "../components/ui";
import PageTransition from "../components/PageTransition";

const KIND_META = {
  credit: {
    icon: ArrowDownLeft,
    tone: "emerald",
    sign: "+",
    label: "Credit",
    chip: "bg-emerald/15 text-emerald",
    amount: "text-emerald",
  },
  debit: {
    icon: ArrowUpRight,
    tone: "rose",
    sign: "−",
    label: "Debit",
    chip: "bg-rose/15 text-rose",
    amount: "text-rose",
  },
  reversal: {
    icon: RotateCcw,
    tone: "amber",
    sign: "±",
    label: "Reversal",
    chip: "bg-amber/15 text-amber",
    amount: "text-amber",
  },
};

export default function WalletPage() {
  const wallet = useWallet();
  const ledger = useLedger();

  return (
    <PageTransition className="space-y-8">
      <div>
        <h1 className="font-display text-2xl font-bold">Reseller wallet</h1>
        <p className="mt-1 text-sm text-muted">Balance and immutable ledger history.</p>
      </div>

      {/* Balance card */}
      {wallet.isLoading ? (
        <Skeleton className="h-44" />
      ) : wallet.isError ? (
        <EmptyState
          icon={AlertCircle}
          title="Couldn't load wallet"
          body={extractError(wallet.error)}
        />
      ) : (
        <motion.div initial={{ opacity: 0, y: 16 }} animate={{ opacity: 1, y: 0 }}>
          <Card className="relative overflow-hidden p-8" glow>
            <div
              className="absolute inset-0 -z-10 opacity-60"
              style={{
                background:
                  "radial-gradient(50% 120% at 100% 0%, rgba(124,92,255,0.4), transparent 60%), radial-gradient(40% 100% at 0% 100%, rgba(34,211,238,0.3), transparent 60%)",
              }}
            />
            <div className="flex items-center gap-2 text-sm text-muted">
              <WalletIcon className="size-4 text-cyan" /> Available balance
            </div>
            <div className="mt-3 font-display text-5xl font-black tracking-tight">
              {money(wallet.data.balance)}
            </div>
            <div className="mt-2 text-xs text-faint">
              Updated {timeAgo(wallet.data.updated_at)}
            </div>
          </Card>
        </motion.div>
      )}

      {/* Ledger */}
      <div>
        <div className="mb-4 flex items-center gap-2">
          <History className="size-5 text-violet-soft" />
          <h2 className="font-display text-lg font-semibold">Ledger</h2>
        </div>

        {ledger.isLoading && (
          <div className="space-y-2">
            {Array.from({ length: 4 }).map((_, i) => (
              <Skeleton key={i} className="h-16" />
            ))}
          </div>
        )}

        {ledger.isError && (
          <EmptyState icon={AlertCircle} title="Couldn't load ledger" body={extractError(ledger.error)} />
        )}

        {!ledger.isLoading && !ledger.isError && ledger.data?.length === 0 && (
          <EmptyState
            icon={History}
            title="No transactions yet"
            body="Wallet credits and debits will show up here."
          />
        )}

        <div className="space-y-2">
          {ledger.data?.map((entry, i) => {
            const meta = KIND_META[entry.kind] || KIND_META.credit;
            const Icon = meta.icon;
            return (
              <motion.div
                key={entry.reference}
                initial={{ opacity: 0, x: -12 }}
                animate={{ opacity: 1, x: 0 }}
                transition={{ delay: i * 0.03 }}
              >
                <Card className="flex items-center gap-4 p-4">
                  <span
                    className={`grid size-10 shrink-0 place-items-center rounded-xl ${meta.chip}`}
                  >
                    <Icon className="size-5" />
                  </span>
                  <div className="min-w-0 flex-1">
                    <div className="flex items-center gap-2">
                      <Badge tone={meta.tone}>{meta.label}</Badge>
                      <span className="truncate text-xs text-faint">{entry.reference}</span>
                    </div>
                    {entry.note && (
                      <p className="mt-1 truncate text-sm text-muted">{entry.note}</p>
                    )}
                  </div>
                  <div className="text-right">
                    <div className={`font-display font-bold ${meta.amount}`}>
                      {meta.sign}
                      {money(entry.amount)}
                    </div>
                    <div className="text-xs text-faint">{timeAgo(entry.created_at)}</div>
                  </div>
                </Card>
              </motion.div>
            );
          })}
        </div>
      </div>
    </PageTransition>
  );
}
