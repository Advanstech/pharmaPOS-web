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
