import { gql } from '@apollo/client';

export const INVENTORY_LIST_QUERY = gql`
  query InventoryList {
    inventory {
      productId
      productName
      classification
      quantityOnHand
      reorderLevel
      stockStatus
      nearestExpiry
      supplierId
      supplierName
      unitPricePesewas
      unitPriceFormatted
    }
  }
`;

export const STOCK_MOVEMENTS_QUERY = gql`
  query StockMovements($productId: ID!, $limit: Int) {
    stockMovements(productId: $productId, limit: $limit) {
      id
      productId
      productName
      quantity
      movementType
      batchNumber
      expiryDate
      createdAt
    }
  }
`;

export const LOW_STOCK_ALERTS_QUERY = gql`
  query LowStockAlerts {
    lowStockAlerts {
      productId
    }
  }
`;
