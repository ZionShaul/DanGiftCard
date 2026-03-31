import { OrderStatus, UserRole } from "@prisma/client";

type Transition = {
  from: OrderStatus;
  to: OrderStatus;
  allowedRoles: UserRole[];
};

const TRANSITIONS: Transition[] = [
  { from: "draft", to: "pending_signatory", allowedRoles: ["requester"] },
  { from: "draft", to: "cancelled", allowedRoles: ["requester", "admin"] },
  { from: "pending_signatory", to: "pending_admin", allowedRoles: ["signatory"] },
  { from: "pending_signatory", to: "rejected_signatory", allowedRoles: ["signatory"] },
  { from: "rejected_signatory", to: "pending_signatory", allowedRoles: ["requester"] },
  { from: "rejected_signatory", to: "cancelled", allowedRoles: ["requester", "admin"] },
  { from: "pending_admin", to: "approved", allowedRoles: ["admin"] },
  { from: "pending_admin", to: "rejected_signatory", allowedRoles: ["admin"] },
];

export function getAllowedTransitions(currentStatus: OrderStatus, role: UserRole): OrderStatus[] {
  return TRANSITIONS.filter(
    (t) => t.from === currentStatus && t.allowedRoles.includes(role)
  ).map((t) => t.to);
}

export function canTransition(from: OrderStatus, to: OrderStatus, role: UserRole): boolean {
  return TRANSITIONS.some(
    (t) => t.from === from && t.to === to && t.allowedRoles.includes(role)
  );
}

export const STATUS_LABELS: Record<OrderStatus, string> = {
  draft: "טיוטה",
  pending_signatory: "ממתין לאישור חתם",
  rejected_signatory: "נדחה ע״י חתם",
  pending_admin: "ממתין לאישור מנהל",
  approved: "מאושר",
  cancelled: "בוטל",
};
