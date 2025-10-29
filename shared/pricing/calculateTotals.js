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
    // Preferred input: PT base amount (without tax)
    ptPackageAmount = 0,
    // Optional alternative: PT gross amount (with tax). If provided and ptPackageAmount
    // is not provided, the base/tax will be derived from this using taxRate
    ptPackageGross = 0,
    // If true, treat PT price as tax-included (gross) for totals:
    // - subtotal uses gross
    // - taxTotal excludes PT tax
    // - totalToday = subtotal + tax (without PT tax)
    // This matches POS header behavior when PT is stored tax-included/non-taxable
    ptTaxIncludedGross = false,
  } = params || {};

  const combinedBase = round2(proratedDues + proratedAddonsTotal);
  const combinedProrateTax = round2(combinedBase * taxRate);
  const enrollmentFeeTax = round2(initiationFee * taxRate);

  // Resolve PT base and tax from either explicit base or gross
  let resolvedPtBase = round2(ptPackageAmount || 0);
  let resolvedPtTax = 0;
  if (resolvedPtBase > 0) {
    resolvedPtTax = round2(resolvedPtBase * taxRate);
  } else if (ptPackageGross && ptPackageGross > 0) {
    if (taxRate > 0) {
      const baseFromGross = round2(ptPackageGross / (1 + taxRate));
      resolvedPtBase = baseFromGross;
      resolvedPtTax = round2(ptPackageGross - baseFromGross);
    } else {
      resolvedPtBase = round2(ptPackageGross);
      resolvedPtTax = 0;
    }
  }

  const resolvedPtGross = ptPackageGross
    ? round2(ptPackageGross)
    : round2(resolvedPtBase + resolvedPtTax);

  const subtotal = ptTaxIncludedGross
    ? round2(combinedBase + initiationFee + resolvedPtGross)
    : round2(combinedBase + initiationFee + resolvedPtBase);

  // Sum of individually rounded item taxes; optionally exclude PT tax if treated as gross
  const taxTotal = ptTaxIncludedGross
    ? round2(combinedProrateTax + enrollmentFeeTax)
    : round2(combinedProrateTax + enrollmentFeeTax + resolvedPtTax);
  const totalToday = round2(subtotal + taxTotal);

  const totalProrateBilledProrateOnly = ptTaxIncludedGross
    ? round2(combinedBase + combinedProrateTax + resolvedPtGross)
    : round2(
        combinedBase + combinedProrateTax + resolvedPtBase + resolvedPtTax
      );

  return {
    components: {
      proratedDues: round2(proratedDues),
      proratedAddonsTotal: round2(proratedAddonsTotal),
      combinedBase,
      combinedProrateTax,
      initiationFee: round2(initiationFee),
      enrollmentFeeTax,
      ptPackageAmount: resolvedPtBase,
      ptPackageTax: resolvedPtTax,
      ptPackageGross: resolvedPtGross,
      ptTaxIncludedGross,
    },
    lineItems: [
      { kind: "prorate", base: combinedBase, tax: combinedProrateTax },
      {
        kind: "enrollment",
        base: round2(initiationFee),
        tax: enrollmentFeeTax,
      },
      {
        kind: "ptPackage",
        base: resolvedPtBase,
        tax: resolvedPtTax,
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
