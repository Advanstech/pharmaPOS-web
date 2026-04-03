import { gql } from '@apollo/client';

export const CREATE_SALE = gql`
  mutation CreateSale($input: CreateSaleInput!) {
    createSale(input: $input) {
      id
      totalPesewas
      totalFormatted
      vatPesewas
      status
      soldAt
      createdAt
      idempotencyKey
      items {
        productId
        quantity
        stockAfterSale
        reorderLevel
        stockStatus
      }
    }
  }
`;
