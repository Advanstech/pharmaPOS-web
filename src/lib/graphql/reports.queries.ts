import { gql } from '@apollo/client';

export const REPORTS_DASHBOARD = gql`
  query ReportsDashboard($periodStart: String!, $periodEnd: String!, $prevStart: String!, $prevEnd: String!, $limit: Float) {
    current: revenueReport(periodStart: $periodStart, periodEnd: $periodEnd) {
      totalRevenuePesewas totalRevenueFormatted salesCount vatCollectedPesewas vatFormatted refundsPesewas averageSaleGhs
    }
    previous: revenueReport(periodStart: $prevStart, periodEnd: $prevEnd) {
      totalRevenuePesewas salesCount
    }
    topProducts(periodStart: $periodStart, periodEnd: $periodEnd, limit: $limit) {
      productId productName unitsSold revenuePesewas revenueFormatted
    }
    dailyTrend: dailyRevenueTrend(periodStart: $periodStart, periodEnd: $periodEnd) {
      date revenuePesewas revenueFormatted salesCount refundsPesewas
    }
    hourlySales(periodStart: $periodStart, periodEnd: $periodEnd) {
      hour salesCount revenuePesewas
    }
    categoryBreakdown(periodStart: $periodStart, periodEnd: $periodEnd) {
      classification revenuePesewas revenueFormatted salesCount unitsSold
    }
    staffPerformance(periodStart: $periodStart, periodEnd: $periodEnd) {
      staffId staffName salesCount revenuePesewas revenueFormatted averageSaleGhs
    }
  }
`;
