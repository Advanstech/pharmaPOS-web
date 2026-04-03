import { gql } from '@apollo/client';

export const REPORTS_DASHBOARD = gql`
  query ReportsDashboard(
    $periodStart: String!
    $periodEnd: String!
    $prevStart: String!
    $prevEnd: String!
    $limit: Float
  ) {
    current: revenueReport(periodStart: $periodStart, periodEnd: $periodEnd) {
      totalRevenuePesewas
      totalRevenueFormatted
      salesCount
      vatCollectedPesewas
      vatFormatted
      refundsPesewas
    }
    previous: revenueReport(periodStart: $prevStart, periodEnd: $prevEnd) {
      totalRevenuePesewas
    }
    topProducts(periodStart: $periodStart, periodEnd: $periodEnd, limit: $limit) {
      productId
      productName
      unitsSold
      revenuePesewas
      revenueFormatted
    }
  }
`;
