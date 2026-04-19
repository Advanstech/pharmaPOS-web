import { gql } from '@apollo/client';

export const GET_TAX_CONFIG = gql`
  query TaxConfig {
    taxConfig {
      branchId
      vatRate vatRatePct
      nhilRate nhilRatePct
      getfundRate getfundRatePct
      covidLevyRate covidLevyRatePct
      totalRate totalRatePct
      applyVatOnOtc
      applyVatOnPom
      applyVatOnControlled
      updatedAt
    }
  }
`;

export const UPDATE_TAX_CONFIG = gql`
  mutation UpdateTaxConfig($input: UpdateTaxConfigInput!) {
    updateTaxConfig(input: $input) {
      branchId
      vatRate vatRatePct
      nhilRate nhilRatePct
      getfundRate getfundRatePct
      covidLevyRate covidLevyRatePct
      totalRate totalRatePct
      applyVatOnOtc
      applyVatOnPom
      applyVatOnControlled
      updatedAt
    }
  }
`;
