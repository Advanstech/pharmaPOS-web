import { gql } from '@apollo/client';

export const CFO_BRIEFING = gql`
  query CfoBriefing {
    cfoBriefing {
      branchName
      generatedAt
      healthScoreNumeric
      executiveSummary
      alerts {
        severity
        title
        message
        action
      }
      keyRatios {
        name
        value
        benchmark
        status
        interpretation
      }
      workingCapital {
        currentRatio
        cashAndEquivalentsPesewas
        cashAndEquivalentsFormatted
        currentAssetsPesewas
        currentAssetsFormatted
        currentLiabilitiesPesewas
        currentLiabilitiesFormatted
        workingCapitalPesewas
        workingCapitalFormatted
        cashRunwayDays
      }
      revenueIntelligence {
        momGrowthPct
        projectedNextMonthPesewas
        projectedNextMonthFormatted
        trendSignal
        insight
      }
      investmentIntelligence {
        qualifiesForInvestment
        qualificationReason
        recommendations {
          type
          title
          rationale
          estimatedRoi12MonthPct
          estimatedInvestmentPesewas
          estimatedInvestmentFormatted
          paybackMonths
          urgency
        }
      }
      monthRevenuePesewas
      monthRevenueFormatted
    }
  }
`;

export const ACCOUNTING_WORKBOOK = gql`
  query AccountingWorkbook($periodStart: String!, $periodEnd: String!) {
    accountingWorkbook(periodStart: $periodStart, periodEnd: $periodEnd) {
      fileName
      mimeType
      base64Content
    }
  }
`;

export const WORKING_CAPITAL = gql`
  query WorkingCapital {
    workingCapital {
      cashAndEquivalentsFormatted
      workingCapitalFormatted
      cashRunwayDays
      currentRatio
    }
  }
`;

export const SUPPLIER_INVOICES = gql`
  query SupplierInvoices {
    supplierInvoices {
      id
      supplierId
      supplierName
      invoiceNumber
      dueDate
      status
      balancePesewas
      balanceFormatted
    }
  }
`;

export const OCR_COLUMN_MAPPING_PRESETS = gql`
  query OcrColumnMappingPresets($supplierId: ID) {
    ocrColumnMappingPresets(supplierId: $supplierId) {
      id
      branchId
      supplierId
      supplierName
      name
      mappings {
        sourceHeader
        targetField
      }
      updatedAt
    }
  }
`;

export const PROFIT_LOSS = gql`
  query ProfitLoss($periodStart: String!, $periodEnd: String!) {
    profitLoss(periodStart: $periodStart, periodEnd: $periodEnd) {
      periodStart
      periodEnd
      revenuePesewas
      revenueFormatted
      cogsPesewas
      cogsFormatted
      grossProfitPesewas
      grossProfitFormatted
      grossProfitMarginPct
      operatingExpensesPesewas
      operatingExpensesFormatted
      netProfitPesewas
      netProfitFormatted
      netProfitMarginPct
    }
  }
`;

export const CASH_FLOW_FORECAST = gql`
  query CashFlowForecast {
    cashFlowForecast {
      currentCashPesewas
      currentCashFormatted
      payablesDue7DaysPesewas
      payablesDue7DaysFormatted
      payablesDue30DaysPesewas
      payablesDue30DaysFormatted
      projectedRevenue7DaysPesewas
      projectedRevenue7DaysFormatted
      projectedRevenue30DaysPesewas
      projectedRevenue30DaysFormatted
      cashRunwayDays
      recommendation
      recommendationReason
    }
  }
`;

export const LIST_EXPENSES = gql`
  query ListExpenses($status: String) {
    listExpenses(status: $status) {
      id
      category
      amountPesewas
      amountFormatted
      description
      expenseDate
      status
      createdByName
      approvedByName
      createdAt
    }
  }
`;
