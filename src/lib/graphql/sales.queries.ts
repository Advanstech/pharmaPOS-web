import { gql } from '@apollo/client';

export const RECENT_SALES = gql`
  query RecentSales($limit: Float) {
    recentSales(limit: $limit) {
      id
      branchId
      branchName
      cashierId
      cashierName
      totalPesewas
      totalFormatted
      vatPesewas
      status
      idempotencyKey
      soldAt
      createdAt
      items {
        id
        productId
        productName
        classification
        quantity
        unitPricePesewas
        vatExempt
        supplierId
        supplierName
        stockAfterSale
        reorderLevel
        stockStatus
      }
    }
  }
`;

export const SALE_DETAIL = gql`
  query SaleDetail($id: ID!) {
    sale(id: $id) {
      id
      branchId
      branchName
      cashierId
      cashierName
      totalPesewas
      totalFormatted
      vatPesewas
      status
      idempotencyKey
      soldAt
      createdAt
      items {
        id
        productId
        productName
        classification
        quantity
        unitPricePesewas
        vatExempt
        supplierId
        supplierName
        stockAfterSale
        reorderLevel
        stockStatus
      }
    }
  }
`;

export const DAILY_SUMMARY = gql`
  query DailySummary($date: String) {
    dailySummary(date: $date) {
      salesCount
      totalRevenuePesewas
      totalRevenueFormatted
      vatCollectedPesewas
      averageSaleGhs
    }
  }
`;
