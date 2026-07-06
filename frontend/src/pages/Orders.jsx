import { Link } from "react-router-dom";
import { motion } from "framer-motion";
import { Receipt, AlertCircle, Gamepad2, ArrowRight } from "lucide-react";
import { useOrders } from "../lib/queries";
import { extractError } from "../lib/api";
import { money, timeAgo, shortId } from "../lib/format";
import { StatusBadge } from "../components/orderStatus";
import { Card, Skeleton, EmptyState, Button } from "../components/ui";
import PageTransition from "../components/PageTransition";

export default function Orders() {
  const { data: orders, isLoading, isError, error, refetch } = useOrders({ poll: true });

  return (
    <PageTransition className="space-y-6">
      <div>
        <h1 className="font-display text-2xl font-bold">Your orders</h1>
        <p className="mt-1 text-sm text-muted">Live status — updates automatically.</p>
      </div>

      {isLoading && (
        <div className="space-y-3">
          {Array.from({ length: 4 }).map((_, i) => (
            <Skeleton key={i} className="h-24" />
          ))}
        </div>
      )}

      {isError && (
        <EmptyState
          icon={AlertCircle}
          title="Couldn't load your orders"
          body={extractError(error)}
          action={<Button onClick={() => refetch()}>Retry</Button>}
        />
      )}

      {!isLoading && !isError && orders?.length === 0 && (
        <EmptyState
          icon={Receipt}
          title="No orders yet"
          body="Your top-ups will appear here once you place them."
          action={
            <Button as={Link} to="/">
              <Gamepad2 className="size-4" /> Browse games
            </Button>
          }
        />
      )}

      <div className="space-y-3">
        {orders?.map((o, i) => (
          <motion.div
            key={o.id}
            initial={{ opacity: 0, y: 12 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: i * 0.04 }}
          >
            <Link to={`/orders/${o.id}`}>
              <Card className="card-hover flex items-center gap-4 p-4 sm:p-5">
                <div className="grid size-12 shrink-0 place-items-center rounded-2xl bg-gradient-to-br from-violet/20 to-cyan/20 font-display text-sm font-bold text-violet-soft">
                  #{shortId(o.id)}
                </div>
                <div className="min-w-0 flex-1">
                  <div className="flex flex-wrap items-center gap-2">
                    <span className="truncate font-semibold text-ink">
                      {o.game} — {o.package?.title}
                    </span>
                  </div>
                  <div className="mt-1 flex flex-wrap items-center gap-x-3 gap-y-1 text-xs text-faint">
                    <span>Player {o.player_id}</span>
                    <span>·</span>
                    <span>{timeAgo(o.created_at)}</span>
                  </div>
                </div>
                <div className="flex flex-col items-end gap-2">
                  <StatusBadge status={o.status} />
                  <span className="font-display font-bold text-ink">{money(o.quoted_price)}</span>
                </div>
                <ArrowRight className="hidden size-5 text-faint sm:block" />
              </Card>
            </Link>
          </motion.div>
        ))}
      </div>
    </PageTransition>
  );
}
