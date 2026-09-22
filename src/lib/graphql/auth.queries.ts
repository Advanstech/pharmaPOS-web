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
        branch_name
        branch_type
      }
    }
  }
`;

export const REQUEST_PASSWORD_RESET_MUTATION = gql`
  mutation RequestPasswordReset($email: String!) {
    requestPasswordReset(email: $email)
  }
`;

export const RESET_PASSWORD_WITH_TOKEN_MUTATION = gql`
  mutation ResetPasswordWithToken($token: String!, $newPassword: String!) {
    resetPasswordWithToken(token: $token, newPassword: $newPassword)
  }
`;

export const CHANGE_PASSWORD_MUTATION = gql`
  mutation ChangePassword($input: ChangePasswordInput!) {
    changePassword(input: $input)
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
