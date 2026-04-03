import { gql } from '@apollo/client';

export const LATEST_PRODUCT_COSTS = gql`
  query LatestProductCosts($productIds: [ID!]!) {
    latestProductCosts(productIds: $productIds) {
      productId
      latestCostPesewas
      latestCostFormatted
      supplierId
      supplierName
      sourceType
      observedAt
    }
  }
`;

export const PRODUCT_PRICE_HISTORY = gql`
  query ProductPriceHistory($productId: String!, $limit: Int) {
    productPriceHistory(productId: $productId, limit: $limit) {
      id
      productId
      productName
      oldPriceGhsPesewas
      oldPriceFormatted
      newPriceGhsPesewas
      newPriceFormatted
      reason
      changedByName
      changedAt
    }
  }
`;
