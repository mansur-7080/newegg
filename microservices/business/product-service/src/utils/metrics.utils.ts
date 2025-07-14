/**
 * Product metrics and profitability calculations
 * Professional business metrics for UltraMarket
 */

/**
 * Product metrics interface
 */
export interface ProductMetrics {
  profit: number;
  profitMargin: number;
  discountPercentage: number;
  roi: number;
  markup: number;
}

/**
 * Price input for calculations
 */
export interface PriceInput {
  price: number;
  comparePrice?: number;
  costPrice?: number;
}

/**
 * Calculate comprehensive product metrics
 */
export function calculateProductMetrics(input: PriceInput): ProductMetrics {
  const { price, comparePrice, costPrice } = input;

  // Calculate profit (selling price - cost price)
  const profit = costPrice ? price - costPrice : 0;

  // Calculate profit margin ((selling price - cost price) / selling price * 100)
  const profitMargin = costPrice && price > 0 
    ? ((price - costPrice) / price) * 100 
    : 0;

  // Calculate discount percentage
  const discountPercentage = comparePrice && comparePrice > price
    ? ((comparePrice - price) / comparePrice) * 100
    : 0;

  // Calculate ROI (Return on Investment)
  const roi = costPrice && costPrice > 0
    ? (profit / costPrice) * 100
    : 0;

  // Calculate markup ((selling price - cost price) / cost price * 100)
  const markup = costPrice && costPrice > 0
    ? ((price - costPrice) / costPrice) * 100
    : 0;

  return {
    profit: Math.round(profit * 100) / 100,
    profitMargin: Math.round(profitMargin * 100) / 100,
    discountPercentage: Math.round(discountPercentage * 100) / 100,
    roi: Math.round(roi * 100) / 100,
    markup: Math.round(markup * 100) / 100,
  };
}

/**
 * Calculate price recommendations based on cost and target margin
 */
export function calculatePriceRecommendations(costPrice: number, targetMargin: number = 30): {
  recommendedPrice: number;
  minimumPrice: number;
  premiumPrice: number;
} {
  // Recommended price based on target margin
  const recommendedPrice = costPrice / (1 - targetMargin / 100);
  
  // Minimum price with 10% margin
  const minimumPrice = costPrice / (1 - 10 / 100);
  
  // Premium price with 50% margin
  const premiumPrice = costPrice / (1 - 50 / 100);

  return {
    recommendedPrice: Math.round(recommendedPrice * 100) / 100,
    minimumPrice: Math.round(minimumPrice * 100) / 100,
    premiumPrice: Math.round(premiumPrice * 100) / 100,
  };
}

/**
 * Calculate break-even analysis
 */
export function calculateBreakEven(
  costPrice: number,
  fixedCosts: number = 0,
  sellingPrice: number
): {
  breakEvenUnits: number;
  breakEvenRevenue: number;
  profitPerUnit: number;
} {
  const profitPerUnit = sellingPrice - costPrice;
  const breakEvenUnits = fixedCosts > 0 ? Math.ceil(fixedCosts / profitPerUnit) : 0;
  const breakEvenRevenue = breakEvenUnits * sellingPrice;

  return {
    breakEvenUnits,
    breakEvenRevenue: Math.round(breakEvenRevenue * 100) / 100,
    profitPerUnit: Math.round(profitPerUnit * 100) / 100,
  };
}

/**
 * Calculate competitive pricing analysis
 */
export function calculateCompetitivePricing(
  ourPrice: number,
  competitorPrices: number[]
): {
  averageCompetitorPrice: number;
  lowestCompetitorPrice: number;
  highestCompetitorPrice: number;
  pricePosition: 'LOW' | 'AVERAGE' | 'HIGH';
  priceDifferenceFromAverage: number;
} {
  if (competitorPrices.length === 0) {
    return {
      averageCompetitorPrice: 0,
      lowestCompetitorPrice: 0,
      highestCompetitorPrice: 0,
      pricePosition: 'AVERAGE',
      priceDifferenceFromAverage: 0,
    };
  }

  const averageCompetitorPrice = competitorPrices.reduce((sum, price) => sum + price, 0) / competitorPrices.length;
  const lowestCompetitorPrice = Math.min(...competitorPrices);
  const highestCompetitorPrice = Math.max(...competitorPrices);

  let pricePosition: 'LOW' | 'AVERAGE' | 'HIGH';
  const threshold = averageCompetitorPrice * 0.1; // 10% threshold

  if (ourPrice < averageCompetitorPrice - threshold) {
    pricePosition = 'LOW';
  } else if (ourPrice > averageCompetitorPrice + threshold) {
    pricePosition = 'HIGH';
  } else {
    pricePosition = 'AVERAGE';
  }

  const priceDifferenceFromAverage = ((ourPrice - averageCompetitorPrice) / averageCompetitorPrice) * 100;

  return {
    averageCompetitorPrice: Math.round(averageCompetitorPrice * 100) / 100,
    lowestCompetitorPrice,
    highestCompetitorPrice,
    pricePosition,
    priceDifferenceFromAverage: Math.round(priceDifferenceFromAverage * 100) / 100,
  };
}

/**
 * Calculate inventory turnover metrics
 */
export function calculateInventoryMetrics(
  currentStock: number,
  averageMonthlySales: number,
  costPrice: number
): {
  daysOfInventory: number;
  turnoverRate: number;
  inventoryValue: number;
  reorderPoint: number;
} {
  const dailySales = averageMonthlySales / 30;
  const daysOfInventory = dailySales > 0 ? currentStock / dailySales : 0;
  const turnoverRate = averageMonthlySales > 0 ? (averageMonthlySales * 12) / currentStock : 0;
  const inventoryValue = currentStock * costPrice;
  const reorderPoint = Math.ceil(dailySales * 7); // 7 days buffer

  return {
    daysOfInventory: Math.round(daysOfInventory * 100) / 100,
    turnoverRate: Math.round(turnoverRate * 100) / 100,
    inventoryValue: Math.round(inventoryValue * 100) / 100,
    reorderPoint,
  };
}

/**
 * Calculate seasonal pricing adjustments
 */
export function calculateSeasonalPricing(
  basePrice: number,
  season: 'SPRING' | 'SUMMER' | 'FALL' | 'WINTER',
  productCategory: string
): {
  adjustedPrice: number;
  adjustmentPercentage: number;
  reason: string;
} {
  let adjustmentPercentage = 0;
  let reason = '';

  // Electronics - higher demand in winter (New Year) and summer (cooling)
  if (productCategory === 'electronics') {
    switch (season) {
      case 'WINTER':
        adjustmentPercentage = 10;
        reason = 'High demand during New Year season';
        break;
      case 'SUMMER':
        adjustmentPercentage = 5;
        reason = 'Increased demand for cooling devices';
        break;
      default:
        adjustmentPercentage = 0;
        reason = 'Regular seasonal pricing';
    }
  }
  
  // Clothing - higher demand in season transitions
  else if (productCategory === 'clothing') {
    switch (season) {
      case 'SPRING':
        adjustmentPercentage = 15;
        reason = 'Spring fashion season';
        break;
      case 'FALL':
        adjustmentPercentage = 15;
        reason = 'Fall fashion season';
        break;
      case 'WINTER':
        adjustmentPercentage = -10;
        reason = 'End of winter sale';
        break;
      default:
        adjustmentPercentage = -5;
        reason = 'Summer clearance';
    }
  }
  
  // Food & Beverages - seasonal variations
  else if (productCategory === 'food-beverages') {
    switch (season) {
      case 'SUMMER':
        adjustmentPercentage = 8;
        reason = 'High demand for beverages and fresh produce';
        break;
      case 'WINTER':
        adjustmentPercentage = 5;
        reason = 'Holiday season premium';
        break;
      default:
        adjustmentPercentage = 0;
        reason = 'Regular seasonal pricing';
    }
  }

  const adjustedPrice = basePrice * (1 + adjustmentPercentage / 100);

  return {
    adjustedPrice: Math.round(adjustedPrice * 100) / 100,
    adjustmentPercentage,
    reason,
  };
}

/**
 * Calculate product performance score
 */
export function calculateProductPerformanceScore(
  salesVolume: number,
  profitMargin: number,
  customerRating: number,
  inventoryTurnover: number,
  reviewCount: number
): {
  score: number;
  grade: 'A+' | 'A' | 'B+' | 'B' | 'C+' | 'C' | 'D';
  insights: string[];
} {
  // Weighted scoring system
  const salesScore = Math.min(salesVolume / 100, 10) * 2; // Sales volume (20%)
  const profitScore = Math.min(profitMargin / 10, 10) * 2; // Profit margin (20%)
  const ratingScore = (customerRating / 5) * 10 * 2.5; // Customer rating (25%)
  const turnoverScore = Math.min(inventoryTurnover / 6, 10) * 1.5; // Inventory turnover (15%)
  const engagementScore = Math.min(reviewCount / 50, 10) * 2; // Customer engagement (20%)

  const totalScore = salesScore + profitScore + ratingScore + turnoverScore + engagementScore;
  const score = Math.round(totalScore * 100) / 100;

  // Assign grade
  let grade: 'A+' | 'A' | 'B+' | 'B' | 'C+' | 'C' | 'D';
  if (score >= 90) grade = 'A+';
  else if (score >= 85) grade = 'A';
  else if (score >= 80) grade = 'B+';
  else if (score >= 75) grade = 'B';
  else if (score >= 70) grade = 'C+';
  else if (score >= 60) grade = 'C';
  else grade = 'D';

  // Generate insights
  const insights: string[] = [];
  
  if (salesScore < 5) insights.push('Low sales volume - consider marketing boost');
  if (profitScore < 5) insights.push('Low profit margin - review pricing strategy');
  if (ratingScore < 15) insights.push('Poor customer rating - improve product quality');
  if (turnoverScore < 5) insights.push('Slow inventory turnover - reduce stock levels');
  if (engagementScore < 5) insights.push('Low customer engagement - encourage reviews');

  if (score >= 85) insights.push('Excellent performance - maintain current strategy');
  else if (score >= 75) insights.push('Good performance - minor optimizations needed');
  else if (score >= 60) insights.push('Average performance - significant improvements needed');
  else insights.push('Poor performance - immediate action required');

  return {
    score,
    grade,
    insights,
  };
}