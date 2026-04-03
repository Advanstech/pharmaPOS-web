import { gql } from '@apollo/client';

export const LIST_CUSTOMERS = gql`
  query ListCustomers($limit: Int, $offset: Int) {
    listCustomers(limit: $limit, offset: $offset) {
      id
      branchId
      customerCode
      name
      hasPhone
      sex
      ageYears
      hasGhanaCard
      createdAt
    }
  }
`;

export const SEARCH_CUSTOMERS = gql`
  query SearchCustomers($query: String!, $limit: Int) {
    searchCustomers(query: $query, limit: $limit) {
      id
      customerCode
      name
      hasPhone
      sex
      ageYears
      hasGhanaCard
    }
  }
`;

export const CREATE_CUSTOMER = gql`
  mutation CreateCustomer($input: CreateCustomerInput!) {
    createCustomer(input: $input) {
      id
      customerCode
      name
      hasPhone
      sex
      ageYears
      hasGhanaCard
      createdAt
    }
  }
`;

export const UPDATE_CUSTOMER = gql`
  mutation UpdateCustomer($input: UpdateCustomerInput!) {
    updateCustomer(input: $input) {
      id
      customerCode
      name
      hasPhone
      sex
      ageYears
      hasGhanaCard
      createdAt
    }
  }
`;
