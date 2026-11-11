import type { FixPackageId, Tone } from "./grid";

export const FIX_NOTE_MAX = 500;

export const FIX_REQUEST_STATUS_LIST = [
  "new",
  "quoted",
  "in_progress",
  "delivered",
  "declined",
  "cancelled",
] as const;

export type FixRequestStatus =
  (typeof FIX_REQUEST_STATUS_LIST)[number];

export const FIX_REQUEST_STATUS_META: Record<
  FixRequestStatus,
  { label: string; tone: Tone; next: readonly FixRequestStatus[] }
> = {
  new: {
    label: "New",
    tone: "neutral",
    next: ["quoted", "declined", "cancelled"],
  },
  quoted: {
    label: "Quoted",
    tone: "primary",
    next: ["in_progress", "declined", "cancelled"],
  },
  in_progress: {
    label: "In progress",
    tone: "amber",
    next: ["delivered", "cancelled"],
  },
  delivered: {
    label: "Delivered",
    tone: "mint",
    next: [],
  },
  declined: {
    label: "Declined",
    tone: "red",
    next: [],
  },
  cancelled: {
    label: "Cancelled",
    tone: "red",
    next: [],
  },
};

export function canTransitionFix(
  from: FixRequestStatus,
  to: FixRequestStatus,
): boolean {
  return FIX_REQUEST_STATUS_META[from].next.includes(to);
}

export interface RequestFixInput {
  leadId: number;
  packages: FixPackageId[];
  note?: string;
}