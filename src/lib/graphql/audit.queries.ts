import { gql } from '@apollo/client';

const FINDING_FRAGMENT = gql`
  fragment FindingFields on AuditFinding {
    id
    severity
    category
    title
    description
    regulatoryReference
    recommendation
    financialImpactPesewas
    financialImpactFormatted
    implicatedUserId
    entityType
    entityId
    detectedAt
  }
`;

export const INTERNAL_AUDIT_REPORT = gql`
  ${FINDING_FRAGMENT}
  query InternalAuditReport($input: AuditPeriodInput!) {
    internalAuditReport(input: $input) {
      reportId
      generatedAt
      branchName
      auditPeriod
      auditedBy
      overallRiskScore
      overallRiskRating
      criticalFindingsCount
      highFindingsCount
      totalFindingsCount
      totalFinancialExposurePesewas
      totalFinancialExposureFormatted
      auditorOpinion
      opinionNarrative
      immediateActionPlan
      dispensingCompliance {
        pomSalesWithoutRxCount
        pomSalesWithoutRxFormatted
        expiredRxDispensedCount
        controlledDrugSingleSignoffCount
        rxWithoutGmdcValidationCount
        rxWithExpiredGmdcLicenceCount
        rxMissingPdfCount
        rxPdfCompliancePct
        majorInteractionOverrideCount
        contraindicatedAttemptCount
        overallStatus
        findings { ...FindingFields }
      }
      financialIntegrity {
        expectedRevenueFormatted
        recordedRevenueFormatted
        revenueDiscrepancyFormatted
        totalVoidsFormatted
        voidRatePct
        voidBenchmarkStatus
        totalRefundsFormatted
        refundRatePct
        cashDominanceFlag
        unmatchedInvoiceCount
        duplicateInvoiceCount
        roundNumberExpenseFlag
        unbalancedGlEntriesCount
        integrityStatus
        findings { ...FindingFields }
      }
      inventoryIntegrity {
        shrinkageRatePct
        shrinkageStatus
        phantomStockSalesCount
        expiredStockDispensedCount
        grnWithoutInvoiceCount
        highValueAdjustmentByOneUserCount
        integrityStatus
        findings { ...FindingFields }
      }
      taxCompliance {
        vatCollectedFormatted
        vatRemittedFormatted
        vatGapFormatted
        vatFilingStatus
        exemptionAbuseFlag
        payeComplianceFlag
        supplierPaymentsWithoutWhtCount
        overallTaxStatus
        findings { ...FindingFields }
      }
      licenceCompliance {
        pharmacistsWithExpiredLicenceCount
        licencesExpiringIn30DaysCount
        branchLicenceStatus
        controlledDrugRegisterCompliant
        overallStatus
        findings { ...FindingFields }
      }
      staffProfiles {
        userId
        role
        totalSalesCount
        totalRevenueFormatted
        voidCount
        refundCount
        pomAttemptBlockCount
        afterHoursTransactionCount
        riskRating
        riskScore
        summary
        anomalies {
          anomalyType
          description
          occurrenceCount
          deviationSigma
          riskLevel
        }
      }
      riskMatrix {
        riskTitle
        riskType
        likelihood
        impact
        inherentRisk
        mitigationStatus
        recommendedControl
      }
      allFindings { ...FindingFields }
    }
  }
`;

export const DISPENSING_COMPLIANCE_AUDIT = gql`
  ${FINDING_FRAGMENT}
  query DispensingComplianceAudit($input: AuditPeriodInput!) {
    dispensingComplianceAudit(input: $input) {
      pomSalesWithoutRxCount
      pomSalesWithoutRxFormatted
      expiredRxDispensedCount
      rxPdfCompliancePct
      overallStatus
      findings { ...FindingFields }
    }
  }
`;

export const STAFF_BEHAVIOUR_PROFILES = gql`
  query StaffBehaviourProfiles($input: AuditPeriodInput!) {
    staffBehaviourProfiles(input: $input) {
      userId
      role
      totalSalesCount
      totalRevenueFormatted
      voidCount
      pomAttemptBlockCount
      riskRating
      riskScore
      summary
      anomalies {
        anomalyType
        description
        occurrenceCount
        riskLevel
      }
    }
  }
`;
