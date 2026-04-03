import { gql } from '@apollo/client';

export const INGEST_SUPPLIER_INVOICE_OCR = gql`
  mutation IngestSupplierInvoiceOcr($input: IngestSupplierInvoiceOcrInput!) {
    ingestSupplierInvoiceOcr(input: $input) {
      invoiceId
      totalLines
      matchedLines
      unmatchedLines
      costSnapshotsCreated
      unmatchedHints
    }
  }
`;

export const UPSERT_OCR_COLUMN_MAPPING_PRESET = gql`
  mutation UpsertOcrColumnMappingPreset($input: UpsertOcrColumnMappingPresetInput!) {
    upsertOcrColumnMappingPreset(input: $input) {
      id
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

export const DELETE_OCR_COLUMN_MAPPING_PRESET = gql`
  mutation DeleteOcrColumnMappingPreset($presetId: ID!) {
    deleteOcrColumnMappingPreset(presetId: $presetId)
  }
`;
