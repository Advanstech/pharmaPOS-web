import { ApolloLink, Observable } from '@apollo/client';
import { print } from 'graphql';

/**
 * Custom Apollo Link for handling file uploads
 * Compatible with Apollo Client 3.x without external dependencies
 */
export function createUploadLink(uri: string) {
  return new ApolloLink((operation) => {
    // Extract files and get cleaned variables
    const { files, variables: cleanedVariables } = extractFiles(operation.variables || {});
    
    console.log('Upload link - Operation:', operation.operationName);
    console.log('Upload link - Variables:', operation.variables);
    console.log('Upload link - Files found:', files.length);
    console.log('Upload link - Cleaned variables:', cleanedVariables);
    
    if (files.length === 0) {
      // No files, use standard fetch (non-upload request)
      const context = operation.getContext();
      const token = context.headers?.Authorization;
      
      console.log('Upload link - No files, using standard JSON request');
      
      return new Observable((observer) => {
        fetch(uri, {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            ...(token ? { Authorization: token } : {}),
          },
          body: JSON.stringify({
            query: print(operation.query),
            variables: operation.variables || {},
            operationName: operation.operationName,
          }),
        })
          .then((response) => {
            if (!response.ok) {
              throw new Error(`HTTP ${response.status}: ${response.statusText}`);
            }
            return response.json();
          })
          .then((result) => {
            observer.next(result);
            observer.complete();
          })
          .catch((error) => {
            observer.error(error);
          });
      });
    }

    // Has files, use multipart/form-data
    console.log('Upload link - Using multipart/form-data');
    
    return new Observable((observer) => {
      const formData = new FormData();
      
      // Add GraphQL operation with cleaned variables (files replaced with null)
      const operations = {
        query: print(operation.query),
        variables: cleanedVariables,
        operationName: operation.operationName,
      };
      
      console.log('Upload link - Operations:', operations);
      formData.append('operations', JSON.stringify(operations));

      // Add file map
      const map: Record<string, string[]> = {};
      files.forEach((file, index) => {
        map[index.toString()] = [file.path];
        formData.append(index.toString(), file.file);
        console.log(`Upload link - File ${index}:`, file.file.name, 'Path:', file.path);
      });
      
      console.log('Upload link - Map:', map);
      formData.append('map', JSON.stringify(map));

      // Get auth token from operation context
      const token = operation.getContext().headers?.Authorization;
      
      console.log('Upload link - Auth token:', token ? 'Present' : 'Missing');

      // Make fetch request
      fetch(uri, {
        method: 'POST',
        headers: {
          ...(token ? { Authorization: token } : {}),
          // Don't set Content-Type - browser will set it with boundary
        },
        body: formData,
      })
        .then((response) => {
          console.log('Upload link - Response status:', response.status);
          return response.json();
        })
        .then((result) => {
          console.log('Upload link - Response data:', result);
          observer.next(result);
          observer.complete();
        })
        .catch((error) => {
          console.error('Upload link - Error:', error);
          observer.error(error);
        });
    });
  });
}

/**
 * Extract files from variables and replace with null
 * Returns both the files array and cleaned variables
 */
function extractFiles(variables: any): { 
  files: Array<{ file: File; path: string }>; 
  variables: any;
} {
  const files: Array<{ file: File; path: string }> = [];
  
  // Handle null/undefined variables
  if (!variables || typeof variables !== 'object') {
    return { files, variables: variables || {} };
  }
  
  function extract(obj: any, path: string): any {
    // Handle null/undefined
    if (obj === null || obj === undefined) {
      return obj;
    }
    
    if (obj instanceof File) {
      files.push({ file: obj, path });
      return null;
    }
    
    if (Array.isArray(obj)) {
      return obj.map((item, index) => extract(item, `${path}.${index}`));
    }
    
    if (typeof obj === 'object' && obj.constructor === Object) {
      const result: any = {};
      for (const key in obj) {
        if (obj.hasOwnProperty(key)) {
          result[key] = extract(obj[key], `${path}.${key}`);
        }
      }
      return result;
    }
    
    return obj;
  }
  
  const cleanedVariables = extract(variables, 'variables');
  return { files, variables: cleanedVariables };
}
