// Centralized pricing calculator used by both backend and frontend
// Inputs are plain numbers; all outputs are rounded to 2 decimals

function round2(value) {
  return Number((Math.round((value + Number.EPSILON) * 100) / 100).toFixed(2));
}

export function calculateTotals(params) {
  const {
    proratedDues = 0,
    proratedAddonsTotal = 0,
    taxRate = 0,
    initiationFee = 19,
    ptPackageAmount = 0,
  } = params || {};

  const combinedBase = round2(proratedDues + proratedAddonsTotal);
  const combinedProrateTax = round2(combinedBase * taxRate);
  const enrollmentFeeTax = round2(initiationFee * taxRate);

  const subtotal = round2(combinedBase + initiationFee + ptPackageAmount);
  const taxTotal = round2(combinedProrateTax + enrollmentFeeTax);
  const totalToday = round2(subtotal + taxTotal);

  const totalProrateBilledProrateOnly = round2(
    combinedBase + combinedProrateTax + ptPackageAmount
  );

  return {
    components: {
      proratedDues: round2(proratedDues),
      proratedAddonsTotal: round2(proratedAddonsTotal),
      combinedBase,
      combinedProrateTax,
      initiationFee: round2(initiationFee),
      enrollmentFeeTax,
      ptPackageAmount: round2(ptPackageAmount),
    },
    lineItems: [
      { kind: "prorate", base: combinedBase, tax: combinedProrateTax },
      {
        kind: "enrollment",
        base: round2(initiationFee),
        tax: enrollmentFeeTax,
      },
    ],
    totals: {
      subtotal,
      taxTotal,
      totalToday,
      totalProrateBilledProrateOnly,
    },
    insertProduction: {
      proratedDuesTaxForProd: combinedProrateTax,
      proratedAddonsTaxForProd: 0.0,
      proratedDuesAddon: combinedBase,
      proratedDuesAddonTax: combinedProrateTax,
      totalProrateBilledProrateOnly,
      finalTotalBilled: totalToday,
    },
  };
}

export default calculateTotals;
