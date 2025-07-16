import React, { useState, useEffect } from 'react';

interface Component {
  id: string;
  name: string;
  type: string;
  brand: string;
  price: number;
  specifications: Record<string, any>;
  image: string;
  compatibility: {
    socket?: string;
    chipset?: string;
    formFactor?: string;
    memoryType?: string;
    powerRequirement?: number;
    maxMemorySupport?: number;
    slots?: number;
  };
}

interface CompatibilityResult {
  isCompatible: boolean;
  warnings: string[];
  errors: string[];
  recommendations: string[];
}

interface CompatibilityCheckerProps {
  selectedComponents: Record<string, Component>;
  onCompatibilityChange: (result: CompatibilityResult) => void;
}

const CompatibilityChecker: React.FC<CompatibilityCheckerProps> = ({
  selectedComponents,
  onCompatibilityChange,
}) => {
  const [compatibilityResult, setCompatibilityResult] = useState<CompatibilityResult>({
    isCompatible: true,
    warnings: [],
    errors: [],
    recommendations: [],
  });

  useEffect(() => {
    const result = checkCompatibility(selectedComponents);
    setCompatibilityResult(result);
    onCompatibilityChange(result);
  }, [selectedComponents, onCompatibilityChange]);

  const checkCompatibility = (components: Record<string, Component>): CompatibilityResult => {
    const result: CompatibilityResult = {
      isCompatible: true,
      warnings: [],
      errors: [],
      recommendations: [],
    };

    const { cpu, motherboard, ram, gpu, psu, case: pcCase } = components;

    // CPU va Motherboard uyg'unligi
    if (cpu && motherboard) {
      if (cpu.compatibility.socket !== motherboard.compatibility.socket) {
        result.errors.push(
          `CPU socket (${cpu.compatibility.socket}) Motherboard socket (${motherboard.compatibility.socket}) bilan mos kelmaydi`
        );
        result.isCompatible = false;
      }
    }

    // RAM va Motherboard uyg'unligi
    if (ram && motherboard) {
      if (ram.compatibility.memoryType !== motherboard.compatibility.memoryType) {
        result.errors.push(
          `RAM turi (${ram.compatibility.memoryType}) Motherboard bilan mos kelmaydi`
        );
        result.isCompatible = false;
      }

      // RAM hajmi tekshiruvi
      if (motherboard.compatibility.maxMemorySupport && 
          ram.specifications.capacity > motherboard.compatibility.maxMemorySupport) {
        result.warnings.push(
          `RAM hajmi (${ram.specifications.capacity}GB) Motherboard maksimal qo'llab-quvvatlaydigan hajmidan oshadi`
        );
      }
    }

    // GPU va PSU quvvat tekshiruvi
    if (gpu && psu) {
      const totalPowerRequired = calculateTotalPowerRequirement(components);
      if (totalPowerRequired > psu.specifications.wattage) {
        result.errors.push(
          `PSU quvvati (${psu.specifications.wattage}W) tizim talabi (${totalPowerRequired}W) uchun yetarli emas`
        );
        result.isCompatible = false;
      } else if (totalPowerRequired > psu.specifications.wattage * 0.8) {
        result.warnings.push(
          `PSU quvvati chegarasiga yaqin (${totalPowerRequired}W/${psu.specifications.wattage}W)`
        );
      }
    }

    // Case va Motherboard o'lcham uyg'unligi
    if (pcCase && motherboard) {
      if (!isFormFactorCompatible(motherboard.compatibility.formFactor, pcCase.compatibility.formFactor)) {
        result.errors.push(
          `Motherboard o'lchami (${motherboard.compatibility.formFactor}) Case bilan mos kelmaydi`
        );
        result.isCompatible = false;
      }
    }

    // GPU va Case uyg'unligi
    if (gpu && pcCase) {
      if (gpu.specifications.length > pcCase.specifications.maxGpuLength) {
        result.errors.push(
          `GPU uzunligi (${gpu.specifications.length}mm) Case maksimal uzunligidan oshadi`
        );
        result.isCompatible = false;
      }
    }

    // Tavsiyalar
    if (cpu && !gpu) {
      result.recommendations.push('Yaxshi gaming tajriba uchun alohida GPU qo\'shishni tavsiya qilamiz');
    }

    if (ram && ram.specifications.capacity < 16) {
      result.recommendations.push('Zamonaviy dasturlar uchun kamida 16GB RAM tavsiya qilinadi');
    }

    return result;
  };

  const calculateTotalPowerRequirement = (components: Record<string, Component>): number => {
    let totalPower = 0;

    // Base system power (motherboard, storage, etc.)
    totalPower += 100;

    if (components.cpu) {
      totalPower += components.cpu.compatibility.powerRequirement || 95;
    }

    if (components.gpu) {
      totalPower += components.gpu.compatibility.powerRequirement || 150;
    }

    if (components.ram) {
      totalPower += components.ram.specifications.sticks * 5; // 5W per stick
    }

    return totalPower;
  };

  const isFormFactorCompatible = (mbFormFactor: string, caseFormFactor: string): boolean => {
    const compatibilityMatrix: Record<string, string[]> = {
      'ATX': ['ATX', 'Mid Tower', 'Full Tower'],
      'Micro-ATX': ['ATX', 'Micro-ATX', 'Mid Tower', 'Full Tower', 'Mini Tower'],
      'Mini-ITX': ['ATX', 'Micro-ATX', 'Mini-ITX', 'Mid Tower', 'Full Tower', 'Mini Tower'],
    };

    return compatibilityMatrix[mbFormFactor]?.includes(caseFormFactor) || false;
  };

  const getStatusColor = () => {
    if (compatibilityResult.errors.length > 0) return 'text-red-600';
    if (compatibilityResult.warnings.length > 0) return 'text-yellow-600';
    return 'text-green-600';
  };

  const getStatusText = () => {
    if (compatibilityResult.errors.length > 0) return 'Mos kelmaydi';
    if (compatibilityResult.warnings.length > 0) return 'Ogohlantirishlar mavjud';
    return 'Mos keladi';
  };

  return (
    <div className="bg-white rounded-lg shadow-lg p-6 mt-6">
      <h3 className="text-xl font-bold mb-4">Uyg'unlik Tekshiruvi</h3>
      
      <div className={`mb-4 p-3 rounded ${compatibilityResult.isCompatible ? 'bg-green-50' : 'bg-red-50'}`}>
        <div className={`font-semibold ${getStatusColor()}`}>
          Holat: {getStatusText()}
        </div>
      </div>

      {compatibilityResult.errors.length > 0 && (
        <div className="mb-4">
          <h4 className="font-semibold text-red-600 mb-2">Xatolar:</h4>
          <ul className="list-disc pl-5 space-y-1">
            {compatibilityResult.errors.map((error, index) => (
              <li key={index} className="text-red-600 text-sm">{error}</li>
            ))}
          </ul>
        </div>
      )}

      {compatibilityResult.warnings.length > 0 && (
        <div className="mb-4">
          <h4 className="font-semibold text-yellow-600 mb-2">Ogohlantirishlar:</h4>
          <ul className="list-disc pl-5 space-y-1">
            {compatibilityResult.warnings.map((warning, index) => (
              <li key={index} className="text-yellow-600 text-sm">{warning}</li>
            ))}
          </ul>
        </div>
      )}

      {compatibilityResult.recommendations.length > 0 && (
        <div className="mb-4">
          <h4 className="font-semibold text-blue-600 mb-2">Tavsiyalar:</h4>
          <ul className="list-disc pl-5 space-y-1">
            {compatibilityResult.recommendations.map((recommendation, index) => (
              <li key={index} className="text-blue-600 text-sm">{recommendation}</li>
            ))}
          </ul>
        </div>
      )}

      {Object.keys(selectedComponents).length === 0 && (
        <p className="text-gray-500 text-center py-8">
          Komponentlarni tanlang va uyg'unlik tekshiruvi avtomatik ishga tushadi
        </p>
      )}
    </div>
  );
};

export default CompatibilityChecker;
export type { Component };
