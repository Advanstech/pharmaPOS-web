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
      supplierContactName
      supplierAddress
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

export const SUPPLIER_WITH_PRODUCTS_QUERY = gql`
  query SupplierWithProducts($id: String!) {
    supplierWithProducts(id: $id) {
      id
      name
      contactName
      phone
      email
      address
      aiScore
      isActive
      totalProducts
      products {
        id
        name
        genericName
        barcode
        unitPrice
        classification
        branchType
        isActive
        quantityOnHand
        reorderLevel
        nearestExpiry
        stockStatus
        sold7d
        sold30d
      }
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

export const SUSPEND_SUPPLIER_MUTATION = gql`
  mutation SuspendSupplier($id: String!) {
    suspendSupplier(id: $id)
  }
`;

export const REACTIVATE_SUPPLIER_MUTATION = gql`
  mutation ReactivateSupplier($id: String!) {
    reactivateSupplier(id: $id)
  }
`;

export const DELETE_SUPPLIER_WITH_PRODUCTS_MUTATION = gql`
  mutation DeleteSupplierWithProducts($id: String!) {
    deleteSupplierWithProducts(id: $id)
  }
`;

export const SUPPLIERS_LIST_ALL_QUERY = gql`
  query SuppliersListAll {
    suppliers {
      id
      name
      contactName
      phone
      email
      isActive
      aiScore
    }
  }
`;

export const BULK_REASSIGN_PRODUCTS_TO_SUPPLIER = gql`
  mutation BulkReassignProductsToSupplier($productIds: [String!]!, $supplierId: String) {
    bulkReassignProductsToSupplier(productIds: $productIds, supplierId: $supplierId)
  }
`;
