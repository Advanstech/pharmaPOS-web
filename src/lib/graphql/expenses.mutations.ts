import { gql } from '@apollo/client';

/**
 * Mutation to create a new staff expense
 */
export const CREATE_STAFF_EXPENSE = gql`
  mutation CreateStaffExpense($input: CreateStaffExpenseInput!) {
    createStaffExpense(input: $input) {
      id
      category
      amountFormatted
      status
      createdAt
    }
  }
`;

/**
 * Mutation to approve or reject a staff expense (Manager only)
 */
export const APPROVE_STAFF_EXPENSE = gql`
  mutation ApproveStaffExpense($input: ApproveStaffExpenseInput!) {
    approveStaffExpense(input: $input) {
      id
      status
      approvedByName
      approvedAt
      approvalNotes
    }
  }
`;

/**
 * Mutation to mark expense as reimbursed
 */
export const REIMBURSE_EXPENSE = gql`
  mutation ReimburseExpense($input: ReimburseExpenseInput!) {
    reimburseStaffExpense(input: $input) {
      id
      status
      reimbursedByName
      reimbursedAt
      reimbursementMethod
    }
  }
`;
