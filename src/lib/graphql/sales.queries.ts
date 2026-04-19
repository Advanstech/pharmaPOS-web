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


export const REFUND_SALE = gql`
  mutation RefundSale($saleId: ID!, $reason: String!) {
    refundSale(saleId: $saleId, reason: $reason) {
      id
      status
      totalFormatted
    }
  }
`;


export const REQUEST_REFUND = gql`
  mutation RequestRefund($saleId: ID!, $reason: String!) {
    requestRefund(saleId: $saleId, reason: $reason) {
      id
      status
      saleId
    }
  }
`;

export const REFUND_REQUESTS = gql`
  query RefundRequests {
    refundRequests {
      id
      saleId
      saleTotalFormatted
      reason
      status
      requestedByName
      reviewedByName
      reviewNotes
      reviewedAt
      createdAt
      saleItemCount
    }
  }
`;

export const APPROVE_REFUND_REQUEST = gql`
  mutation ApproveRefundRequest($requestId: ID!, $notes: String) {
    approveRefundRequest(requestId: $requestId, notes: $notes) {
      id
      status
    }
  }
`;

export const REJECT_REFUND_REQUEST = gql`
  mutation RejectRefundRequest($requestId: ID!, $notes: String!) {
    rejectRefundRequest(requestId: $requestId, notes: $notes)
  }
`;
