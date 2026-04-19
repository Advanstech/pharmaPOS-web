import { gql } from '@apollo/client';

/**
 * Query to get staff expenses with optional filters
 */
export const GET_STAFF_EXPENSES = gql`
  query GetStaffExpenses($status: ExpenseStatus, $startDate: String, $endDate: String) {
    staffExpenses(status: $status, startDate: $startDate, endDate: $endDate) {
      id
      category
      amountPesewas
      amountFormatted
      description
      merchantName
      expenseDate
      status
      paymentMethod
      createdByName
      approvedByName
      approvedAt
      approvalNotes
      createdAt
    }
  }
`;

/**
 * Query to get expense analytics for dashboard
 */
export const EXPENSE_ANALYTICS = gql`
  query ExpenseAnalytics($startDate: String!, $endDate: String!) {
    expenseAnalytics(startDate: $startDate, endDate: $endDate) {
      totalExpensesPesewas
      totalExpensesFormatted
      byCategory {
        category
        amountPesewas
        amountFormatted
        count
        percentOfTotal
      }
      byStaff {
        staffId
        staffName
        amountPesewas
        amountFormatted
        count
      }
      pendingApprovalCount
      pendingReimbursementPesewas
      pendingReimbursementFormatted
    }
  }
`;

/**
 * Query to get a single expense by ID
 */
export const GET_EXPENSE = gql`
  query GetExpense($id: ID!) {
    staffExpense(id: $id) {
      id
      category
      amountPesewas
      amountFormatted
      description
      merchantName
      expenseDate
      status
      paymentMethod
      createdByName
      approvedByName
      approvedAt
      approvalNotes
      reimbursementMethod
      reimbursedByName
      reimbursedAt
      createdAt
    }
  }
`;
