import { gql } from '@apollo/client';

export const MY_STOCK_ALERTS = gql`
  query MyStockAlerts($limit: Int) {
    myStockAlerts(limit: $limit) {
      id
      productId
      productName
      stockStatus
      quantityOnHand
      reorderLevel
      suggestedReorderQty
      supplierName
      supplierPhone
      channels
      message
      createdAt
    }
  }
`;
