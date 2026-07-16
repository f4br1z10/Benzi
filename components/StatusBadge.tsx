import { STATUS_LABELS } from "@/lib/constants";
export default function StatusBadge({ status }: { status: string }) { return <span className={`badge badge-${status.toLowerCase()}`}>{STATUS_LABELS[status] || status}</span>; }
