export interface OrderItemInput {
  quantity: number;
  loadAmount: number;
  discountPct: number;
}

export interface ItemTotals {
  faceValueTotal: number;
  payableTotal: number;
}

export function calculateItemTotals(item: OrderItemInput): ItemTotals {
  const faceValueTotal = item.quantity * item.loadAmount;
  const discount = faceValueTotal * (item.discountPct / 100);
  const payableTotal = faceValueTotal - discount;
  return {
    faceValueTotal: Math.round(faceValueTotal * 100) / 100,
    payableTotal: Math.round(payableTotal * 100) / 100,
  };
}

export function calculateOrderTotals(items: Array<ItemTotals & { quantity: number }>) {
  return items.reduce(
    (acc, item) => ({
      totalCards: acc.totalCards + item.quantity,
      totalFaceValue: acc.totalFaceValue + item.faceValueTotal,
      totalPayable: acc.totalPayable + item.payableTotal,
    }),
    { totalCards: 0, totalFaceValue: 0, totalPayable: 0 }
  );
}
