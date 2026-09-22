import {
  CapsuleGeometry,
  TorusGeometry,
  SphereGeometry,
  OctahedronGeometry,
  ConeGeometry,
  IcosahedronGeometry,
  PlaneGeometry,
  DodecahedronGeometry,
  BoxGeometry,
} from 'three';

export interface CategoryMeshConfig {
  geometry: any;
  color: string;
}

export function getCategoryObject(category: string | undefined): CategoryMeshConfig {
  const normCategory = (category || '').toLowerCase();

  if (normCategory.includes('antibiotic')) {
    return {
      geometry: new CapsuleGeometry(0.8, 1.2, 4, 16),
      color: '#FF5252',
    };
  }
  
  if (normCategory.includes('antimalarial') || normCategory.includes('malaria')) {
    return {
      geometry: new TorusGeometry(1, 0.4, 16, 32),
      color: '#00BFA6',
    };
  }

  if (normCategory.includes('cardio') || normCategory.includes('heart') || normCategory.includes('blood')) {
    return {
      geometry: new SphereGeometry(1.2, 32, 32),
      color: '#FF3D57',
    };
  }

  if (normCategory.includes('vitamin') || normCategory.includes('supplement')) {
    return {
      geometry: new OctahedronGeometry(1.2),
      color: '#FFB300',
    };
  }

  if (normCategory.includes('diabet')) {
    return {
      geometry: new TorusGeometry(1.2, 0.2, 16, 64),
      color: '#7C4DFF',
    };
  }

  if (normCategory.includes('respiratory') || normCategory.includes('cough') || normCategory.includes('asthma')) {
    return {
      geometry: new ConeGeometry(1, 2, 32),
      color: '#29B6F6',
    };
  }

  if (normCategory.includes('analgesic') || normCategory.includes('nsaid') || normCategory.includes('pain')) {
    return {
      geometry: new IcosahedronGeometry(1.2),
      color: '#FF7043',
    };
  }

  if (normCategory.includes('derma') || normCategory.includes('topical') || normCategory.includes('cream')) {
    return {
      geometry: new PlaneGeometry(2, 2, 8, 8),
      color: '#66BB6A',
    };
  }

  if (normCategory.includes('eye') || normCategory.includes('ent') || normCategory.includes('ear')) {
    return {
      geometry: new SphereGeometry(1, 32, 32),
      color: '#42A5F5', // Iris color
    };
  }

  if (normCategory.includes('antifungal') || normCategory.includes('fungal')) {
    return {
      geometry: new DodecahedronGeometry(1.2),
      color: '#AB47BC',
    };
  }

  // Default fallback
  return {
    geometry: new BoxGeometry(1.5, 1.5, 1.5),
    color: '#00BFA6',
  };
}
