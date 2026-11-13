export const formatNpr = (amount: number) =>
  `Rs. ${new Intl.NumberFormat("en-IN", { maximumFractionDigits: 2 }).format(amount)}`;
