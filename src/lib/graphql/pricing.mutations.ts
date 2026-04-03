import { gql } from '@apollo/client';

export const UPDATE_PRODUCT_PRICE = gql`
  mutation UpdateProductPrice($input: UpdatePriceInput!) {
    updateProductPrice(input: $input) {
      productId
      productName
      updatedAt
      price {
        ghsPesewas
        ghsFormatted
      }
    }
  }
`;

export const BULK_UPDATE_PRODUCT_PRICES = gql`
  mutation BulkUpdateProductPrices($input: BulkUpdatePriceInput!) {
    bulkUpdateProductPrices(input: $input) {
      productId
      productName
      updatedAt
      price {
        ghsPesewas
        ghsFormatted
      }
    }
  }
`;
