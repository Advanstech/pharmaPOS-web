import { gql } from '@apollo/client';

export const PENDING_PRESCRIPTIONS = gql`
  query PendingPrescriptions {
    pendingPrescriptions {
      id
      branchId
      customerId
      prescriberLicenceNo
      prescriberName
      prescribedDate
      expiryDate
      status
      approvalCount
      createdAt
      items {
        id
        productId
        productName
        quantity
        dosageInstructions
      }
    }
  }
`;

export const VERIFY_PRESCRIPTION = gql`
  mutation VerifyPrescription($input: VerifyPrescriptionInput!) {
    verifyPrescription(input: $input) {
      id
      status
      approvalCount
    }
  }
`;

export const PRESCRIPTIONS_FOR_PRODUCT = gql`
  query PrescriptionsForProduct($productId: ID!) {
    prescriptionsForProduct(productId: $productId) {
      id
      branchId
      customerId
      prescriberLicenceNo
      prescriberName
      prescribedDate
      expiryDate
      status
      approvalCount
      createdAt
      items {
        id
        productId
        productName
        quantity
        dosageInstructions
      }
    }
  }
`;
