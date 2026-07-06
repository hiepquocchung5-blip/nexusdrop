import { Clock, ShieldCheck, Cpu, CheckCircle2, XCircle, RotateCcw } from "lucide-react";
import { Badge } from "./ui";

export const STATUS_META = {
  pending_payment: { label: "Pending payment", tone: "amber", icon: Clock, step: 0 },
  verifying: { label: "Verifying proof", tone: "cyan", icon: ShieldCheck, step: 1 },
  processing: { label: "Processing", tone: "violet", icon: Cpu, step: 2 },
  completed: { label: "Completed", tone: "emerald", icon: CheckCircle2, step: 3 },
  failed: { label: "Failed", tone: "rose", icon: XCircle, step: -1 },
  refunded: { label: "Refunded", tone: "faint", icon: RotateCcw, step: -1 },
};

export const FLOW = ["pending_payment", "verifying", "processing", "completed"];

export function StatusBadge({ status }) {
  const meta = STATUS_META[status] || STATUS_META.pending_payment;
  const Icon = meta.icon;
  return (
    <Badge tone={meta.tone}>
      <Icon className="size-3.5" />
      {meta.label}
    </Badge>
  );
}
