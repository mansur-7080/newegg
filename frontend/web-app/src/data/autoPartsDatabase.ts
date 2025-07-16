// Uzbekistan Auto Parts Database
// Maksusi Uzbekistondagi mashinalar uchun avtoehtiyot qismlar ma'lumotlar bazasi

export interface VehicleMake {
  id: string;
  name: string;
  nameUz: string;
  country: string;
  isPopular: boolean;
}

export interface VehicleModel {
  id: string;
  makeId: string;
  name: string;
  nameUz: string;
  generations: string[];
  isPopular: boolean;
}

export interface VehicleGeneration {
  id: string;
  modelId: string;
  name: string;
  nameUz: string;
  yearRange: {
    start: number;
    end: number | null;
  };
  engineOptions: string[];
  transmissionOptions: string[];
}

export interface AutoPart {
  id: string;
  name: string;
  nameUz: string;
  category: string;
  subcategory: string;
  partNumber: string;
  description: string;
  descriptionUz: string;
  compatibleVehicles: {
    makeId: string;
    modelId: string;
    generationId: string;
    yearRange: {
      start: number;
      end: number | null;
    };
    engineTypes?: string[];
  }[];
  price: {
    original: number;
    aftermarket: number;
    currency: 'UZS';
  };
  availability: {
    inStock: boolean;
    quantity: number;
    supplier: string;
    location: string;
  };
  brands: string[];
  condition: 'new' | 'used' | 'refurbished';
  warranty: {
    months: number;
    description: string;
  };
  images: string[];
  specifications?: Record<string, any>;
}

export interface AutoPartCategory {
  id: string;
  name: string;
  nameUz: string;
  subcategories: {
    id: string;
    name: string;
    nameUz: string;
    icon: string;
  }[];
  icon: string;
  isPopular: boolean;
}

// Uzbekistonda mashhur avtomobil markalari
export const vehicleMakes: VehicleMake[] = [
  {
    id: 'chevrolet',
    name: 'Chevrolet',
    nameUz: 'Shevrole',
    country: 'USA',
    isPopular: true,
  },
  {
    id: 'daewoo',
    name: 'Daewoo',
    nameUz: 'Deu',
    country: 'South Korea',
    isPopular: true,
  },
  {
    id: 'toyota',
    name: 'Toyota',
    nameUz: 'Toyota',
    country: 'Japan',
    isPopular: true,
  },
  {
    id: 'hyundai',
    name: 'Hyundai',
    nameUz: 'Hyundai',
    country: 'South Korea',
    isPopular: true,
  },
  {
    id: 'kia',
    name: 'KIA',
    nameUz: 'KIA',
    country: 'South Korea',
    isPopular: true,
  },
  {
    id: 'volkswagen',
    name: 'Volkswagen',
    nameUz: 'Folksvagen',
    country: 'Germany',
    isPopular: false,
  },
  {
    id: 'bmw',
    name: 'BMW',
    nameUz: 'BMW',
    country: 'Germany',
    isPopular: false,
  },
  {
    id: 'mercedes',
    name: 'Mercedes-Benz',
    nameUz: 'Mercedes',
    country: 'Germany',
    isPopular: false,
  },
];

// Uzbekistonda mashhur avtomobil modellari
export const vehicleModels: VehicleModel[] = [
  // Chevrolet
  {
    id: 'nexia',
    makeId: 'chevrolet',
    name: 'Nexia',
    nameUz: 'Neksiya',
    generations: ['nexia-1', 'nexia-2', 'nexia-3'],
    isPopular: true,
  },
  {
    id: 'lacetti',
    makeId: 'chevrolet',
    name: 'Lacetti',
    nameUz: 'Lasetti',
    generations: ['lacetti-1'],
    isPopular: true,
  },
  {
    id: 'cobalt',
    makeId: 'chevrolet',
    name: 'Cobalt',
    nameUz: 'Kobalt',
    generations: ['cobalt-1'],
    isPopular: true,
  },
  {
    id: 'spark',
    makeId: 'chevrolet',
    name: 'Spark',
    nameUz: 'Spark',
    generations: ['spark-1', 'spark-2'],
    isPopular: true,
  },

  // Daewoo
  {
    id: 'damas',
    makeId: 'daewoo',
    name: 'Damas',
    nameUz: 'Damas',
    generations: ['damas-1'],
    isPopular: true,
  },
  {
    id: 'tico',
    makeId: 'daewoo',
    name: 'Tico',
    nameUz: 'Tiko',
    generations: ['tico-1'],
    isPopular: true,
  },
  {
    id: 'matiz',
    makeId: 'daewoo',
    name: 'Matiz',
    nameUz: 'Matiz',
    generations: ['matiz-1', 'matiz-2'],
    isPopular: true,
  },

  // Toyota
  {
    id: 'corolla',
    makeId: 'toyota',
    name: 'Corolla',
    nameUz: 'Korolla',
    generations: ['corolla-e150', 'corolla-e160', 'corolla-e170'],
    isPopular: true,
  },
  {
    id: 'camry',
    makeId: 'toyota',
    name: 'Camry',
    nameUz: 'Kamri',
    generations: ['camry-v40', 'camry-v50', 'camry-v70'],
    isPopular: true,
  },

  // Hyundai
  {
    id: 'accent',
    makeId: 'hyundai',
    name: 'Accent',
    nameUz: 'Aksent',
    generations: ['accent-lc', 'accent-mc', 'accent-rb'],
    isPopular: true,
  },
  {
    id: 'elantra',
    makeId: 'hyundai',
    name: 'Elantra',
    nameUz: 'Elantra',
    generations: ['elantra-md', 'elantra-ad'],
    isPopular: true,
  },
];

// Avto-generatsiyalar
export const vehicleGenerations: VehicleGeneration[] = [
  // Chevrolet Nexia
  {
    id: 'nexia-1',
    modelId: 'nexia',
    name: 'Nexia I (1995-2008)',
    nameUz: 'Neksiya I (1995-2008)',
    yearRange: { start: 1995, end: 2008 },
    engineOptions: ['1.5L DOHC', '1.6L DOHC'],
    transmissionOptions: ['5MT', '4AT'],
  },
  {
    id: 'nexia-2',
    modelId: 'nexia',
    name: 'Nexia II (2008-2015)',
    nameUz: 'Neksiya II (2008-2015)',
    yearRange: { start: 2008, end: 2015 },
    engineOptions: ['1.5L DOHC', '1.6L DOHC'],
    transmissionOptions: ['5MT', '4AT'],
  },
  {
    id: 'nexia-3',
    modelId: 'nexia',
    name: 'Nexia III (2015-present)',
    nameUz: 'Neksiya III (2015-hozir)',
    yearRange: { start: 2015, end: null },
    engineOptions: ['1.5L DOHC'],
    transmissionOptions: ['5MT', 'CVT'],
  },

  // Chevrolet Lacetti
  {
    id: 'lacetti-1',
    modelId: 'lacetti',
    name: 'Lacetti (2004-2013)',
    nameUz: 'Lasetti (2004-2013)',
    yearRange: { start: 2004, end: 2013 },
    engineOptions: ['1.4L', '1.6L', '1.8L'],
    transmissionOptions: ['5MT', '4AT'],
  },

  // Chevrolet Cobalt
  {
    id: 'cobalt-1',
    modelId: 'cobalt',
    name: 'Cobalt (2012-present)',
    nameUz: 'Kobalt (2012-hozir)',
    yearRange: { start: 2012, end: null },
    engineOptions: ['1.5L DOHC'],
    transmissionOptions: ['5MT', '6AT'],
  },

  // Daewoo Damas
  {
    id: 'damas-1',
    modelId: 'damas',
    name: 'Damas (1991-present)',
    nameUz: 'Damas (1991-hozir)',
    yearRange: { start: 1991, end: null },
    engineOptions: ['0.8L'],
    transmissionOptions: ['5MT'],
  },
];

// Avtoehtiyot qismlar kategoriyalari
export const autoPartCategories: AutoPartCategory[] = [
  {
    id: 'engine',
    name: 'Engine Parts',
    nameUz: 'Dvigatel qismlari',
    icon: '🔧',
    isPopular: true,
    subcategories: [
      { id: 'filters', name: 'Filters', nameUz: 'Filtrlar', icon: '🔍' },
      { id: 'oils', name: 'Engine Oils', nameUz: 'Dvigatel moylari', icon: '🛢️' },
      { id: 'spark-plugs', name: 'Spark Plugs', nameUz: 'Shamlar', icon: '⚡' },
      { id: 'belts', name: 'Belts', nameUz: 'Kamarlar', icon: '🔗' },
      { id: 'pistons', name: 'Pistons', nameUz: 'Pistonlar', icon: '⚙️' },
    ],
  },
  {
    id: 'transmission',
    name: 'Transmission',
    nameUz: 'Transmissiya',
    icon: '⚙️',
    isPopular: true,
    subcategories: [
      { id: 'clutch', name: 'Clutch', nameUz: 'Mufta', icon: '🔄' },
      { id: 'gearbox', name: 'Gearbox', nameUz: 'Vites qutisi', icon: '📦' },
      { id: 'transmission-oil', name: 'Transmission Oil', nameUz: 'Transmissiya moyi', icon: '🛢️' },
    ],
  },
  {
    id: 'suspension',
    name: 'Suspension',
    nameUz: 'Osma',
    icon: '🏗️',
    isPopular: true,
    subcategories: [
      { id: 'shock-absorbers', name: 'Shock Absorbers', nameUz: 'Amortizatorlar', icon: '📏' },
      { id: 'springs', name: 'Springs', nameUz: 'Prujinalar', icon: '〰️' },
      { id: 'ball-joints', name: 'Ball Joints', nameUz: 'Shar sharnirlar', icon: '⚽' },
    ],
  },
  {
    id: 'brakes',
    name: 'Braking System',
    nameUz: 'Tormoz tizimi',
    icon: '🛑',
    isPopular: true,
    subcategories: [
      { id: 'brake-pads', name: 'Brake Pads', nameUz: 'Tormoz kalodkalari', icon: '🟫' },
      { id: 'brake-discs', name: 'Brake Discs', nameUz: 'Tormoz disklari', icon: '💿' },
      { id: 'brake-fluid', name: 'Brake Fluid', nameUz: 'Tormoz suyuqligi', icon: '🧪' },
    ],
  },
  {
    id: 'electrical',
    name: 'Electrical',
    nameUz: 'Elektr',
    icon: '⚡',
    isPopular: false,
    subcategories: [
      { id: 'battery', name: 'Battery', nameUz: 'Akkumulyator', icon: '🔋' },
      { id: 'alternator', name: 'Alternator', nameUz: 'Generator', icon: '⚡' },
      { id: 'starter', name: 'Starter', nameUz: 'Starter', icon: '🔌' },
    ],
  },
  {
    id: 'body',
    name: 'Body Parts',
    nameUz: 'Kuzov qismlari',
    icon: '🚗',
    isPopular: false,
    subcategories: [
      { id: 'bumpers', name: 'Bumpers', nameUz: 'Bamperlar', icon: '🛡️' },
      { id: 'mirrors', name: 'Mirrors', nameUz: 'Nometliklar', icon: '🪞' },
      { id: 'lights', name: 'Lights', nameUz: 'Chiroqlar', icon: '💡' },
    ],
  },
];

// Avtoehtiyot qismlar namunasi
export const autoParts: AutoPart[] = [
  // Chevrolet Nexia uchun qismlar
  {
    id: 'nexia-oil-filter-1',
    name: 'Oil Filter',
    nameUz: 'Moy filtri',
    category: 'engine',
    subcategory: 'filters',
    partNumber: 'GM96570765',
    description: 'Original oil filter for Chevrolet Nexia',
    descriptionUz: 'Chevrolet Nexia uchun asl moy filtri',
    compatibleVehicles: [
      {
        makeId: 'chevrolet',
        modelId: 'nexia',
        generationId: 'nexia-1',
        yearRange: { start: 1995, end: 2008 },
        engineTypes: ['1.5L DOHC', '1.6L DOHC'],
      },
      {
        makeId: 'chevrolet',
        modelId: 'nexia',
        generationId: 'nexia-2',
        yearRange: { start: 2008, end: 2015 },
        engineTypes: ['1.5L DOHC', '1.6L DOHC'],
      },
    ],
    price: {
      original: 45000,
      aftermarket: 35000,
      currency: 'UZS',
    },
    availability: {
      inStock: true,
      quantity: 50,
      supplier: 'GM Uzbekistan',
      location: 'Tashkent',
    },
    brands: ['GM', 'Bosch', 'Mann'],
    condition: 'new',
    warranty: {
      months: 12,
      description: '1 year warranty',
    },
    images: [
      '/images/parts/nexia-oil-filter-1.jpg',
      '/images/parts/nexia-oil-filter-2.jpg',
    ],
    specifications: {
      diameter: '68mm',
      height: '85mm',
      thread: 'M20x1.5',
    },
  },
  {
    id: 'nexia-brake-pads-front',
    name: 'Front Brake Pads',
    nameUz: 'Old tormoz kalodkalari',
    category: 'brakes',
    subcategory: 'brake-pads',
    partNumber: 'GM94535047',
    description: 'Front brake pads for Chevrolet Nexia',
    descriptionUz: 'Chevrolet Nexia uchun old tormoz kalodkalari',
    compatibleVehicles: [
      {
        makeId: 'chevrolet',
        modelId: 'nexia',
        generationId: 'nexia-2',
        yearRange: { start: 2008, end: 2015 },
      },
      {
        makeId: 'chevrolet',
        modelId: 'nexia',
        generationId: 'nexia-3',
        yearRange: { start: 2015, end: null },
      },
    ],
    price: {
      original: 180000,
      aftermarket: 140000,
      currency: 'UZS',
    },
    availability: {
      inStock: true,
      quantity: 25,
      supplier: 'UzAuto Parts',
      location: 'Andijan',
    },
    brands: ['GM', 'Brembo', 'ATE'],
    condition: 'new',
    warranty: {
      months: 24,
      description: '2 years warranty',
    },
    images: [
      '/images/parts/nexia-brake-pads-1.jpg',
    ],
    specifications: {
      thickness: '17mm',
      width: '140mm',
      length: '52mm',
      material: 'Semi-metallic',
    },
  },
  // Daewoo Damas uchun qismlar
  {
    id: 'damas-spark-plugs',
    name: 'Spark Plugs Set',
    nameUz: 'Shamlar to\'plami',
    category: 'engine',
    subcategory: 'spark-plugs',
    partNumber: 'DAE96350547',
    description: 'Spark plugs set for Daewoo Damas 0.8L engine',
    descriptionUz: 'Daewoo Damas 0.8L dvigatel uchun shamlar to\'plami',
    compatibleVehicles: [
      {
        makeId: 'daewoo',
        modelId: 'damas',
        generationId: 'damas-1',
        yearRange: { start: 1991, end: null },
        engineTypes: ['0.8L'],
      },
    ],
    price: {
      original: 65000,
      aftermarket: 45000,
      currency: 'UZS',
    },
    availability: {
      inStock: true,
      quantity: 40,
      supplier: 'Korea Parts',
      location: 'Tashkent',
    },
    brands: ['NGK', 'Denso', 'Bosch'],
    condition: 'new',
    warranty: {
      months: 6,
      description: '6 months warranty',
    },
    images: [
      '/images/parts/damas-spark-plugs-1.jpg',
    ],
    specifications: {
      gap: '0.7-0.8mm',
      thread: 'M14x1.25',
      reach: '19mm',
      heat_range: '7',
    },
  },
];

// Utility funksiyalar
export const getVehiclesByMake = (makeId: string) => {
  return vehicleModels.filter(model => model.makeId === makeId);
};

export const getGenerationsByModel = (modelId: string) => {
  return vehicleGenerations.filter(gen => gen.modelId === modelId);
};

export const getCompatibleParts = (
  makeId: string,
  modelId: string,
  generationId?: string,
  year?: number
) => {
  return autoParts.filter(part =>
    part.compatibleVehicles.some(vehicle =>
      vehicle.makeId === makeId &&
      vehicle.modelId === modelId &&
      (!generationId || vehicle.generationId === generationId) &&
      (!year || (
        year >= vehicle.yearRange.start &&
        (vehicle.yearRange.end === null || year <= vehicle.yearRange.end)
      ))
    )
  );
};

export const getPartsByCategory = (categoryId: string) => {
  return autoParts.filter(part => part.category === categoryId);
};

export const searchParts = (query: string) => {
  const searchTerm = query.toLowerCase();
  return autoParts.filter(part =>
    part.name.toLowerCase().includes(searchTerm) ||
    part.nameUz.toLowerCase().includes(searchTerm) ||
    part.description.toLowerCase().includes(searchTerm) ||
    part.descriptionUz.toLowerCase().includes(searchTerm) ||
    part.partNumber.toLowerCase().includes(searchTerm)
  );
};
