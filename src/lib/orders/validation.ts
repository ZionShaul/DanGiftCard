import { OrderWindow, CardType } from "@prisma/client";

export interface ValidationError {
  field: string;
  message: string;
}

export function validateOrderWindow(window: OrderWindow): ValidationError | null {
  const now = new Date();
  if (now < window.orderOpenAt) {
    return { field: "orderWindow", message: "חלון ההזמנות טרם נפתח" };
  }
  if (now > window.orderCloseAt) {
    return { field: "orderWindow", message: "המועד האחרון להזמנות עבר" };
  }
  return null;
}

export function validateCardLoad(
  loadAmount: number,
  cardType: Pick<CardType, "minLoadAmount" | "maxLoadAmount" | "nameHe">
): ValidationError | null {
  const min = Number(cardType.minLoadAmount);
  const max = Number(cardType.maxLoadAmount);
  if (loadAmount < min) {
    return {
      field: "loadAmount",
      message: `סכום טעינה מינימלי עבור ${cardType.nameHe} הוא ₪${min}`,
    };
  }
  if (loadAmount > max) {
    return {
      field: "loadAmount",
      message: `סכום טעינה מקסימלי עבור ${cardType.nameHe} הוא ₪${max}`,
    };
  }
  return null;
}

export function validateOrderTotal(
  totalPayable: number,
  minOrderTotal: number
): ValidationError | null {
  if (totalPayable < minOrderTotal) {
    return {
      field: "totalPayable",
      message: `סכום ההזמנה המינימלי הוא ₪${minOrderTotal}. הסכום הנוכחי: ₪${totalPayable}`,
    };
  }
  return null;
}
