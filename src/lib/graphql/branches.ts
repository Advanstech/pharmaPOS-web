import { gql } from '@apollo/client';

const BRANCH_FIELDS = `
  id
  organizationId
  name
  type
  address
  phone
  isActive
  createdAt
  updatedAt
`;

export const BRANCHES_QUERY = gql`
  query Branches {
    branches {
      ${BRANCH_FIELDS}
    }
  }
`;

export const BRANCHES_ADMIN_QUERY = gql`
  query BranchesAdmin($includeInactive: Boolean) {
    branchesAdmin(includeInactive: $includeInactive) {
      ${BRANCH_FIELDS}
    }
  }
`;

export const CREATE_BRANCH_MUTATION = gql`
  mutation CreateBranch($input: CreateBranchInput!) {
    createBranch(input: $input) {
      ${BRANCH_FIELDS}
    }
  }
`;

export const UPDATE_BRANCH_MUTATION = gql`
  mutation UpdateBranch($id: ID!, $input: UpdateBranchInput!) {
    updateBranch(id: $id, input: $input) {
      ${BRANCH_FIELDS}
    }
  }
`;

export const DEACTIVATE_BRANCH_MUTATION = gql`
  mutation DeactivateBranch($id: ID!) {
    deactivateBranch(id: $id)
  }
`;

export const REACTIVATE_BRANCH_MUTATION = gql`
  mutation ReactivateBranch($id: ID!) {
    reactivateBranch(id: $id)
  }
`;
