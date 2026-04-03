import { gql } from '@apollo/client';

export const LIST_STAFF = gql`
  query ListStaff($branchId: ID) {
    listStaff(branchId: $branchId) {
      id
      name
      email
      role
      branch_id
      is_active
      is_on_duty
      position
      department
      employment_type
      professional_licence_no
      licence_expiry_date
      start_date
      photo_url
      certificate_s3_keys
      salary_amount_pesewas
      salary_period
      bank_name
      created_at
    }
  }
`;

export const STAFF_MEMBER = gql`
  query StaffMember($userId: ID!) {
    staffMember(userId: $userId) {
      id
      name
      email
      role
      branch_id
      is_active
      is_on_duty
      position
      department
      employment_type
      professional_licence_no
      licence_expiry_date
      start_date
      photo_url
      certificate_s3_keys
      salary_amount_pesewas
      salary_period
      bank_name
      created_at
    }
  }
`;

export const INVITE_STAFF = gql`
  mutation InviteStaff($input: InviteStaffInput!) {
    inviteStaff(input: $input) {
      userId
      name
      email
      role
      temporaryPassword
      emailSent
      message
    }
  }
`;

export const DEACTIVATE_STAFF = gql`
  mutation DeactivateStaff($userId: ID!) {
    deactivateStaff(userId: $userId)
  }
`;

export const RESET_STAFF_PASSWORD = gql`
  mutation ResetStaffPassword($input: ResetStaffPasswordInput!) {
    resetStaffPassword(input: $input)
  }
`;

export const UPDATE_STAFF_PROFILE = gql`
  mutation UpdateStaffProfile($input: UpdateStaffProfileInput!) {
    updateStaffProfile(input: $input) {
      id
      name
      email
      role
      branch_id
      is_active
      is_on_duty
      position
      department
      employment_type
      professional_licence_no
      licence_expiry_date
      start_date
      photo_url
      salary_amount_pesewas
      salary_period
      bank_name
      created_at
    }
  }
`;

export const STAFF_SESSION_HISTORY = gql`
  query StaffSessionHistory(
    $branchId: ID
    $limit: Int
    $offset: Int
    $fromDate: String
    $toDate: String
  ) {
    staffSessionHistory(
      branchId: $branchId
      limit: $limit
      offset: $offset
      fromDate: $fromDate
      toDate: $toDate
    ) {
      id
      userId
      user_name
      user_role
      branchId
      branch_name
      sessionId
      started_at
      ended_at
      last_seen_at
      ip_address
      user_agent
      is_open
    }
  }
`;
