import { gql } from '@apollo/client';

const EOD_FIELDS = `
  id branchId branchName cashierName businessDate
  totalSalesCount
  grossRevenuePesewas grossRevenueFormatted
  vatCollectedPesewas vatCollectedFormatted
  refundsCount refundsPesewas refundsFormatted
  expensesCount expensesPesewas expensesFormatted
  netRevenuePesewas netRevenueFormatted
  expectedCashPesewas expectedCashFormatted
  cashCountedPesewas cashCountedFormatted
  momoCountedPesewas momoCountedFormatted
  totalCountedPesewas totalCountedFormatted
  variancePesewas varianceFormatted
  isBalanced closingNotes closedAt
  approvalStatus approvedByName approvedAt managerNotes
`;

export const CLOSE_REGISTER = gql`
  mutation CloseRegister($input: CloseRegisterInput!) {
    closeRegister(input: $input) { ${EOD_FIELDS} }
  }
`;

export const TODAY_EOD_STATUS = gql`
  query TodayEodStatus {
    todayEodStatus {
      isClosed
      record { ${EOD_FIELDS} }
    }
  }
`;

export const EOD_HISTORY = gql`
  query EodHistory($limit: Int) {
    eodHistory(limit: $limit) { ${EOD_FIELDS} }
  }
`;

export const PENDING_EOD_APPROVALS = gql`
  query PendingEodApprovals {
    pendingEodApprovals { ${EOD_FIELDS} }
  }
`;

export const APPROVE_EOD = gql`
  mutation ApproveEodRecord($input: ApproveEodInput!) {
    approveEodRecord(input: $input) { ${EOD_FIELDS} }
  }
`;

export const DECLINE_EOD = gql`
  mutation DeclineEodRecord($input: ApproveEodInput!) {
    declineEodRecord(input: $input) { ${EOD_FIELDS} }
  }
`;

export const TODAY_PAYMENT_BREAKDOWN = gql`
  query TodayPaymentBreakdown($periodStart: String!, $periodEnd: String!) {
    paymentMethodBreakdown(periodStart: $periodStart, periodEnd: $periodEnd) {
      method
      count
      totalPesewas
      totalFormatted
    }
  }
`;

export const BRANCH_EOD_FOR_DATE = gql`
  query BranchEodForDate($businessDate: String!) {
    branchEodForDate(businessDate: $businessDate) { ${EOD_FIELDS} }
  }
`;

export const STAFF_PENDING_EOD = gql`
  query StaffPendingEod($businessDate: String!) {
    staffPendingEod(businessDate: $businessDate) {
      id
      name
      role
    }
  }
`;
