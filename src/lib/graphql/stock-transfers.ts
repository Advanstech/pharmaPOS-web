import { gql } from '@apollo/client';

export const LIST_STOCK_TRANSFERS = gql`
  query StockTransfers($status: TransferStatus) {
    stockTransfers(status: $status) {
      id
      fromBranchId
      fromBranchName
      toBranchId
      toBranchName
      status
      items { productId productName quantity receivedQuantity }
      notes
      createdByName
      approvedByName
      receivedByName
      createdAt
      approvedAt
      receivedAt
      totalItems
      totalQuantity
    }
  }
`;

export const BRANCHES_QUERY = gql`
  query Branches {
    branches {
      id
      name
      type
    }
  }
`;

export const CREATE_STOCK_TRANSFER = gql`
  mutation CreateStockTransfer($input: CreateStockTransferInput!) {
    createStockTransfer(input: $input) {
      id status totalItems totalQuantity
    }
  }
`;

export const APPROVE_STOCK_TRANSFER = gql`
  mutation ApproveStockTransfer($transferId: ID!) {
    approveStockTransfer(transferId: $transferId) {
      id status approvedByName approvedAt
    }
  }
`;

export const RECEIVE_STOCK_TRANSFER = gql`
  mutation ReceiveStockTransfer($transferId: ID!) {
    receiveStockTransfer(transferId: $transferId) {
      id status receivedByName receivedAt
    }
  }
`;

export const CANCEL_STOCK_TRANSFER = gql`
  mutation CancelStockTransfer($transferId: ID!, $reason: String!) {
    cancelStockTransfer(transferId: $transferId, reason: $reason) {
      id status
    }
  }
`;
