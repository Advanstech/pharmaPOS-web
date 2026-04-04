import { gql } from '@apollo/client';

export const SUPPLIERS_LIST_QUERY = gql`
  query Suppliers {
    suppliers {
      id
      name
      isActive
    }
  }
`;

export const SUPPLIER_RESTOCK_WATCH = gql`
  query SupplierRestockWatch {
    supplierRestockWatch {
      supplierId
      supplierName
      supplierPhone
      supplierEmail
      supplierAiScore
      totalTrackedProducts
      lowStockCount
      criticalStockCount
      outOfStockCount
      affectedProducts {
        productId
        productName
        quantityOnHand
        reorderLevel
        stockStatus
        recentSoldQuantity7d
        suggestedReorderQuantity
      }
    }
  }
`;

export const SUPPLIER_DETAIL_QUERY = gql`
  query SupplierDetail($id: String!) {
    supplier(id: $id) {
      id
      name
      contactName
      phone
      email
      address
      aiScore
      isActive
      createdAt
      updatedAt
    }
  }
`;

export const CREATE_SUPPLIER_MUTATION = gql`
  mutation CreateSupplier($input: CreateSupplierInput!) {
    createSupplier(input: $input) {
      id
      name
      contactName
      phone
      email
      address
      isActive
    }
  }
`;

export const UPDATE_SUPPLIER_MUTATION = gql`
  mutation UpdateSupplier($id: String!, $input: UpdateSupplierInput!) {
    updateSupplier(id: $id, input: $input) {
      id
      name
      contactName
      phone
      email
      address
      aiScore
      isActive
    }
  }
`;

export const DELETE_SUPPLIER_MUTATION = gql`
  mutation DeleteSupplier($id: String!) {
    deleteSupplier(id: $id)
  }
`;
