import { gql } from '@apollo/client';

export const RECEIVE_STOCK_MUTATION = gql`
  mutation ReceiveStock($input: ReceiveStockInput!) {
    receiveStock(input: $input) {
      productId
      productName
      classification
      quantityOnHand
      reorderLevel
      stockStatus
      nearestExpiry
      supplierId
      supplierName
    }
  }
`;

export const ADJUST_STOCK_MUTATION = gql`
  mutation AdjustStock($input: AdjustStockInput!) {
    adjustStock(input: $input) {
      productId
      productName
      classification
      quantityOnHand
      reorderLevel
      stockStatus
      nearestExpiry
      supplierId
      supplierName
    }
  }
`;
