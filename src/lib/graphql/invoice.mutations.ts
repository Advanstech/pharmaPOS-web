import { gql } from '@apollo/client';

export const UPLOAD_SUPPLIER_INVOICE = gql`
  mutation UploadSupplierInvoice($input: UploadSupplierInvoiceInput!) {
    uploadSupplierInvoice(input: $input) {
      id
      status
      ocrJobId
      message
    }
  }
`;
