import { gql } from '@apollo/client';

export const SEARCH_PRODUCTS_QUERY = gql`
  query SearchProducts($query: String!, $branchId: String!, $limit: Int) {
    searchProducts(query: $query, branchId: $branchId, limit: $limit) {
      id
      name
      genericName
      barcode
      unitPrice
      classification
      branchType
      vatExempt
      requiresRx
      image {
        cdnUrl
        urlThumb
        source
        isApproved
      }
      inventory {
        quantityOnHand
        reorderLevel
        batches {
          batchNumber
          quantity
          expiryDate
        }
      }
      supplier {
        id
        name
        aiScore
      }
      category {
        name
      }
    }
  }
`;

export const CREATE_PRODUCT_MUTATION = gql`
  mutation CreateProduct($input: CreateProductInput!) {
    createProduct(input: $input) {
      id
      name
      classification
      unitPrice
      branchType
      supplier {
        id
        name
      }
      category {
        id
        name
      }
    }
  }
`;

export const STOCK_CHANGED_SUBSCRIPTION = gql`
  # WS: stockChanged triggers on inventory update; omit branchId to receive all branches
  subscription StockChanged($branchId: ID) {
    stockChanged(branchId: $branchId) {
      productId
      quantityOnHand
      reorderLevel
      stockStatus
      branchId
      changedAt
    }
  }
`;
