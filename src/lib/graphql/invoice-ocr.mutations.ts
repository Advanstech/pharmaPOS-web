import { gql } from '@apollo/client';

/**
 * Mutation to upload supplier invoice for OCR processing
 */
export const UPLOAD_INVOICE = gql`
  mutation UploadSupplierInvoice($input: UploadSupplierInvoiceInput!) {
    uploadSupplierInvoice(input: $input) {
      id
      status
      ocrJobId
      message
    }
  }
`;

/**
 * Mutation to confirm OCR results and create GRN
 */
export const CONFIRM_OCR_INVOICE = gql`
  mutation ConfirmOcrInvoice($input: ConfirmOcrInvoiceInput!) {
    confirmOcrInvoice(input: $input) {
      grnId
      supplierInvoiceId
      stockUpdated
      imagesProcessed
      message
    }
  }
`;

/**
 * Mutation to record a supplier payment
 */
export const RECORD_SUPPLIER_PAYMENT = gql`
  mutation RecordSupplierPayment($input: RecordSupplierPaymentInput!) {
    recordSupplierPayment(input: $input) {
      id
      balanceFormatted
      paymentStatus
      payments {
        id
        amountFormatted
        paymentMethod
        paidAt
      }
    }
  }
`;
