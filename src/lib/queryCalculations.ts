// ═══════════════════════════════════════════════
// QUERY PRICING CALCULATIONS
// ═══════════════════════════════════════════════

export interface PricingResult {
  totalCost: number;
  totalSelling: number;
  totalProfit: number;
  totalCostPKR: number;
  totalSellingPKR: number;
  totalProfitPKR: number;
  margin: number;
}

export const calculateHotelPricing = (
  costPerNight: number,
  sellingPerNight: number,
  rooms: number,
  nights: number,
  roe: number
): PricingResult => {
  const totalCost = costPerNight * nights * rooms;
  const totalSelling = sellingPerNight * nights * rooms;
  const totalProfit = totalSelling - totalCost;
  return {
    totalCost,
    totalSelling,
    totalProfit,
    totalCostPKR: totalCost * roe,
    totalSellingPKR: totalSelling * roe,
    totalProfitPKR: totalProfit * roe,
    margin: totalSelling > 0 ? ((totalProfit / totalSelling) * 100) : 0,
  };
};

export const calculateFlightPricing = (
  adult: { cost: number; selling: number; count: number },
  child: { cost: number; selling: number; count: number },
  infant: { cost: number; selling: number; count: number },
  roe: number
): PricingResult => {
  const totalCost = (adult.cost * adult.count) + (child.cost * child.count) + (infant.cost * infant.count);
  const totalSelling = (adult.selling * adult.count) + (child.selling * child.count) + (infant.selling * infant.count);
  const totalProfit = totalSelling - totalCost;
  return {
    totalCost,
    totalSelling,
    totalProfit,
    totalCostPKR: totalCost * roe,
    totalSellingPKR: totalSelling * roe,
    totalProfitPKR: totalProfit * roe,
    margin: totalSelling > 0 ? ((totalProfit / totalSelling) * 100) : 0,
  };
};

export const calculateSimplePricing = (
  cost: number,
  selling: number,
  quantity: number,
  roe: number
): PricingResult => {
  const totalCost = cost * quantity;
  const totalSelling = selling * quantity;
  const totalProfit = totalSelling - totalCost;
  return {
    totalCost,
    totalSelling,
    totalProfit,
    totalCostPKR: totalCost * roe,
    totalSellingPKR: totalSelling * roe,
    totalProfitPKR: totalProfit * roe,
    margin: totalSelling > 0 ? ((totalProfit / totalSelling) * 100) : 0,
  };
};

export const formatMargin = (margin: number): string =>
  `${margin >= 0 ? '+' : ''}${margin.toFixed(1)}%`;
