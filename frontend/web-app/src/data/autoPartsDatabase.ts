// Avto ehtiyot qismlari ma'lumotlar bazasi
export interface AutoPart {
  id: string;
  name: string;
  partNumber: string;
  category: string;
  brand: string;
  compatibleVehicles: string[];
  price: number;
  inStock: boolean;
  description: string;
  specifications: Record<string, any>;
}

export interface Vehicle {
  id: string;
  make: string;
  model: string;
  year: number;
  engine: string;
  transmission: string;
}

// O'zbekistonda keng tarqalgan avtomobil markalari
export const vehicles: Vehicle[] = [
  {
    id: 'nexia-1',
    make: 'Chevrolet',
    model: 'Nexia',
    year: 2020,
    engine: '1.5L',
    transmission: 'Manual'
  },
  {
    id: 'lacetti-1',
    make: 'Chevrolet',
    model: 'Lacetti',
    year: 2019,
    engine: '1.6L',
    transmission: 'Automatic'
  },
  {
    id: 'cobalt-1',
    make: 'Chevrolet',
    model: 'Cobalt',
    year: 2021,
    engine: '1.5L',
    transmission: 'Manual'
  },
  {
    id: 'spark-1',
    make: 'Chevrolet',
    model: 'Spark',
    year: 2018,
    engine: '1.0L',
    transmission: 'Manual'
  },
  {
    id: 'damas-1',
    make: 'Daewoo',
    model: 'Damas',
    year: 2020,
    engine: '0.8L',
    transmission: 'Manual'
  }
];

// Ehtiyot qismlar
export const autoParts: AutoPart[] = [
  {
    id: 'brake-pad-1',
    name: 'Tormoz kalodkalari',
    partNumber: 'BP-CHV-NEX-001',
    category: 'Tormoz tizimi',
    brand: 'Ferodo',
    compatibleVehicles: ['nexia-1', 'lacetti-1'],
    price: 120000,
    inStock: true,
    description: 'Yuqori sifatli tormoz kalodkalari',
    specifications: {
      material: 'Keramik',
      thickness: '12mm',
      warranty: '2 yil'
    }
  },
  {
    id: 'oil-filter-1',
    name: 'Moy filtri',
    partNumber: 'OF-CHV-001',
    category: 'Filtrlar',
    brand: 'Mann',
    compatibleVehicles: ['nexia-1', 'lacetti-1', 'cobalt-1'],
    price: 35000,
    inStock: true,
    description: 'Original moy filtri',
    specifications: {
      type: 'Spin-on',
      threadSize: '3/4-16 UNF',
      warranty: '1 yil'
    }
  },
  {
    id: 'air-filter-1',
    name: 'Havo filtri',
    partNumber: 'AF-CHV-002',
    category: 'Filtrlar',
    brand: 'Bosch',
    compatibleVehicles: ['nexia-1', 'spark-1'],
    price: 45000,
    inStock: true,
    description: 'Yuqori sifatli havo filtri',
    specifications: {
      dimensions: '240x190x50mm',
      material: 'Non-woven fabric',
      warranty: '1 yil'
    }
  },
  {
    id: 'spark-plug-1',
    name: 'Uchqun svechasi',
    partNumber: 'SP-CHV-003',
    category: 'Dvigatel qismlari',
    brand: 'NGK',
    compatibleVehicles: ['nexia-1', 'lacetti-1', 'cobalt-1', 'spark-1'],
    price: 25000,
    inStock: true,
    description: 'Original uchqun svechalari to\'plami',
    specifications: {
      gap: '0.8mm',
      heatRange: '6',
      quantity: '4 dona',
      warranty: '2 yil'
    }
  },
  {
    id: 'battery-1',
    name: 'Akkumulyator',
    partNumber: 'BAT-55AH-001',
    category: 'Elektr tizimi',
    brand: 'Varta',
    compatibleVehicles: ['nexia-1', 'lacetti-1', 'cobalt-1'],
    price: 450000,
    inStock: true,
    description: '55Ah akkumulyator batareya',
    specifications: {
      voltage: '12V',
      capacity: '55Ah',
      coldCrankingAmps: '460A',
      warranty: '3 yil'
    }
  }
];

// Mos kelish tekshiruvi
export function checkCompatibility(partId: string, vehicleId: string): boolean {
  const part = autoParts.find(p => p.id === partId);
  if (!part) return false;
  
  return part.compatibleVehicles.includes(vehicleId);
}

// Avtomobil bo'yicha qismlarni qidirish
export function getPartsForVehicle(vehicleId: string): AutoPart[] {
  return autoParts.filter(part => 
    part.compatibleVehicles.includes(vehicleId)
  );
}

// Kategoriya bo'yicha qismlar
export function getPartsByCategory(category: string): AutoPart[] {
  return autoParts.filter(part => part.category === category);
}

// Qism qidirish
export function searchParts(query: string): AutoPart[] {
  const lowerQuery = query.toLowerCase();
  return autoParts.filter(part => 
    part.name.toLowerCase().includes(lowerQuery) ||
    part.partNumber.toLowerCase().includes(lowerQuery) ||
    part.brand.toLowerCase().includes(lowerQuery) ||
    part.description.toLowerCase().includes(lowerQuery)
  );
}

export default {
  vehicles,
  autoParts,
  checkCompatibility,
  getPartsForVehicle,
  getPartsByCategory,
  searchParts
};
