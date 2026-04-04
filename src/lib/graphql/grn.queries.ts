import { gql } from '@apollo/client';

export const CREATE_GRN_MUTATION = gql`
  mutation CreateGRN($input: CreateGRNInput!) {
    createGRN(input: $input) {
      id
      branchId
      supplierId
      supplierName
      supplierInvoiceNumber
      invoiceDate
      dueDate
      totalAmountPesewas
      totalAmountFormatted
      items {
        id
        productId
        productName
        quantity
        batchNumber
        expiryDate
      }
      receivedBy
      receivedByName
      receivedAt
      isMatched
    }
  }
`;

export const LIST_GRNS_QUERY = gql`
  query ListGRNs($limit: Float) {
    listGRNs(limit: $limit) {
      id
      supplierName
      supplierInvoiceNumber
      totalAmountFormatted
      receivedAt
      isMatched
    }
  }
`;
