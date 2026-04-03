import { gql } from '@apollo/client';

export const SUPPLIERS_LIST_QUERY = gql`
  query Suppliers {
    suppliers {
      id
      name
      isActive
    }
  }
`;

export const SUPPLIER_RESTOCK_WATCH = gql`
  query SupplierRestockWatch {
    supplierRestockWatch {
      supplierId
      supplierName
      supplierPhone
      supplierEmail
      supplierAiScore
      totalTrackedProducts
      lowStockCount
      criticalStockCount
      outOfStockCount
      affectedProducts {
        productId
        productName
        quantityOnHand
        reorderLevel
        stockStatus
        recentSoldQuantity7d
        suggestedReorderQuantity
      }
    }
  }
`;
