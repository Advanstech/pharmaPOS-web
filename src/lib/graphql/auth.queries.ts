import { gql } from '@apollo/client';

export const LOGIN_MUTATION = gql`
  mutation Login($email: String!, $password: String!) {
    login(input: { email: $email, password: $password }) {
      access_token
      refresh_token
      expires_in
      user {
        id
        name
        email
        role
        branch_id
      }
    }
  }
`;

export const ME_QUERY = gql`
  query Me {
    me {
      id
      name
      email
      role
      branch_id
    }
  }
`;

export const SUBSCRIPTION_OVERVIEW_QUERY = gql`
  query SubscriptionOverview {
    subscriptionOverview {
      tier
      status
      currentPeriodStart
      currentPeriodEnd
      cancelAtPeriodEnd
      usage {
        branches
        users
        products
        sales
      }
      limits {
        branches
        users
        products
        sales
      }
    }
  }
`;
