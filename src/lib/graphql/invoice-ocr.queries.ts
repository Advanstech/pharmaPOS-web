import { gql } from '@apollo/client';

/**
 * Query to get OCR job status and extracted data
 * Poll this every 2-3 seconds until status is COMPLETED
 */
export const GET_OCR_JOB = gql`
  query GetOcrJob($id: ID!) {
    invoiceOcrJob(id: $id) {
      id
      status
      progress
      confidenceScore
      requiresReview
      supplierId
      
      extractedData {
        invoiceNumber
        invoiceDate
        dueDate
        supplierName
        
        items {
          description
          quantity
          unitPrice
          totalPrice
          batchNumber
          expiryDate
          confidence
          
          matches {
            productId
            productName
            matchScore
            matchReason
          }
          
          suggestedImageUrl
          imageSource
          imageConfidence
        }
        
        subtotal
        vat
        totalAmount
        confidence
      }
      
      errorMessage
    }
  }
`;

/**
 * Query to get supplier invoice details with payment tracking
 */
export const GET_SUPPLIER_INVOICE = gql`
  query GetSupplierInvoice($id: ID!) {
    supplierInvoice(id: $id) {
      id
      invoiceNumber
      invoiceDate
      dueDate
      
      totalAmountFormatted
      paidAmountFormatted
      balanceFormatted
      
      paymentTerms
      paymentStatus
      
      daysOutstanding
      isOverdue
      overdueByDays
      
      payments {
        id
        amountFormatted
        paymentMethod
        reference
        paidByName
        paidAt
      }
      
      supplierName
    }
  }
`;
