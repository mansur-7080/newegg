import { PrismaClient } from '@prisma/client';
import { getPrismaClient } from '../config/database';
import { logger } from '../utils/logger';

export interface CompatibilityResult {
  productId: string;
  compatibleWith: CompatibilityItem[];
  incompatibleWith: CompatibilityItem[];
  requirements: SystemRequirements;
  warnings: string[];
}

export interface CompatibilityItem {
  productId: string;
  productName: string;
  compatibility: 'full' | 'partial' | 'incompatible';
  reason?: string;
  notes?: string;
}

export interface SystemRequirements {
  minimumPSU?: number;
  recommendedPSU?: number;
  coolingRequirement?: string;
  socketType?: string;
  memoryType?: string[];
  pciSlots?: number;
}

export class CompatibilityService {
  private prisma: PrismaClient;

  constructor() {
    this.prisma = getPrismaClient();
  }

  async getProductCompatibility(productId: string): Promise<CompatibilityResult | null> {
    try {
      const product = await this.prisma.product.findUnique({
        where: { id: productId },
        include: {
          category: true,
          specifications: true,
          compatibilities: {
            include: {
              compatibleProduct: {
                include: {
                  category: true,
                }
              }
            }
          }
        }
      });

      if (!product) {
        return null;
      }

      const compatibleWith = product.compatibilities
        .filter(comp => comp.compatibility === 'COMPATIBLE')
        .map(comp => ({
          productId: comp.compatibleProductId,
          productName: comp.compatibleProduct.name,
          compatibility: 'full' as const,
          reason: comp.notes || undefined,
        }));

      const incompatibleWith = product.compatibilities
        .filter(comp => comp.compatibility === 'INCOMPATIBLE')
        .map(comp => ({
          productId: comp.compatibleProductId,
          productName: comp.compatibleProduct.name,
          compatibility: 'incompatible' as const,
          reason: comp.notes || undefined,
        }));

      const requirements = this.extractSystemRequirements(product.specifications);
      const warnings = this.generateCompatibilityWarnings(product);

      return {
        productId,
        compatibleWith,
        incompatibleWith,
        requirements,
        warnings,
      };
    } catch (error) {
      logger.error('Failed to get product compatibility', error);
      throw new Error('Failed to retrieve product compatibility');
    }
  }

  async checkCompatibility(productId: string, otherProductIds: string[]): Promise<CompatibilityItem[]> {
    try {
      const results: CompatibilityItem[] = [];

      for (const otherProductId of otherProductIds) {
        const compatibility = await this.checkProductPairCompatibility(productId, otherProductId);
        results.push(compatibility);
      }

      return results;
    } catch (error) {
      logger.error('Failed to check compatibility', error);
      throw new Error('Failed to check product compatibility');
    }
  }

  private async checkProductPairCompatibility(productId1: string, productId2: string): Promise<CompatibilityItem> {
    try {
      // Check existing compatibility record
      const existingCompatibility = await this.prisma.productCompatibility.findFirst({
        where: {
          OR: [
            { productId: productId1, compatibleProductId: productId2 },
            { productId: productId2, compatibleProductId: productId1 },
          ]
        },
        include: {
          compatibleProduct: true,
        }
      });

      if (existingCompatibility) {
        return {
          productId: productId2,
          productName: existingCompatibility.compatibleProduct.name,
          compatibility: existingCompatibility.compatibility === 'COMPATIBLE' ? 'full' : 'incompatible',
          reason: existingCompatibility.notes || undefined,
        };
      }

      // Auto-check compatibility based on specifications
      const [product1, product2] = await Promise.all([
        this.prisma.product.findUnique({
          where: { id: productId1 },
          include: { specifications: true, category: true }
        }),
        this.prisma.product.findUnique({
          where: { id: productId2 },
          include: { specifications: true, category: true }
        })
      ]);

      if (!product1 || !product2) {
        throw new Error('Products not found');
      }

      const compatibilityCheck = this.performAutomaticCompatibilityCheck(product1, product2);

      return {
        productId: productId2,
        productName: product2.name,
        compatibility: compatibilityCheck.compatible ? 'full' : 'incompatible',
        reason: compatibilityCheck.reason,
        notes: compatibilityCheck.notes,
      };
    } catch (error) {
      logger.error('Failed to check product pair compatibility', error);
      return {
        productId: productId2,
        productName: 'Unknown',
        compatibility: 'incompatible',
        reason: 'Error checking compatibility',
      };
    }
  }

  private performAutomaticCompatibilityCheck(product1: any, product2: any): {
    compatible: boolean;
    reason?: string;
    notes?: string;
  } {
    // Example compatibility logic for CPU and Motherboard
    if (product1.category.name === 'CPU' && product2.category.name === 'Motherboard') {
      return this.checkCpuMotherboardCompatibility(product1, product2);
    }

    if (product1.category.name === 'GPU' && product2.category.name === 'Motherboard') {
      return this.checkGpuMotherboardCompatibility(product1, product2);
    }

    if (product1.category.name === 'RAM' && product2.category.name === 'Motherboard') {
      return this.checkRamMotherboardCompatibility(product1, product2);
    }

    // Default: assume compatible if no specific rules
    return {
      compatible: true,
      notes: 'No specific compatibility rules defined',
    };
  }

  private checkCpuMotherboardCompatibility(cpu: any, motherboard: any): {
    compatible: boolean;
    reason?: string;
    notes?: string;
  } {
    const cpuSocket = this.getSpecValue(cpu.specifications, 'socket');
    const mbSocket = this.getSpecValue(motherboard.specifications, 'socket');

    if (!cpuSocket || !mbSocket) {
      return {
        compatible: false,
        reason: 'Socket information not available',
      };
    }

    if (cpuSocket.toLowerCase() === mbSocket.toLowerCase()) {
      return {
        compatible: true,
        notes: `Compatible socket: ${cpuSocket}`,
      };
    }

    return {
      compatible: false,
      reason: `Socket mismatch: CPU ${cpuSocket} vs Motherboard ${mbSocket}`,
    };
  }

  private checkGpuMotherboardCompatibility(gpu: any, motherboard: any): {
    compatible: boolean;
    reason?: string;
    notes?: string;
  } {
    const gpuInterface = this.getSpecValue(gpu.specifications, 'interface') || 'PCIe';
    const mbPcieSlots = this.getSpecValue(motherboard.specifications, 'pcie_slots');

    if (gpuInterface.includes('PCIe') && mbPcieSlots) {
      return {
        compatible: true,
        notes: 'PCIe interface compatible',
      };
    }

    return {
      compatible: true,
      notes: 'Assuming PCIe compatibility',
    };
  }

  private checkRamMotherboardCompatibility(ram: any, motherboard: any): {
    compatible: boolean;
    reason?: string;
    notes?: string;
  } {
    const ramType = this.getSpecValue(ram.specifications, 'type');
    const mbMemoryType = this.getSpecValue(motherboard.specifications, 'memory_type');

    if (!ramType || !mbMemoryType) {
      return {
        compatible: true,
        notes: 'Memory type information not available',
      };
    }

    if (mbMemoryType.includes(ramType)) {
      return {
        compatible: true,
        notes: `Compatible memory type: ${ramType}`,
      };
    }

    return {
      compatible: false,
      reason: `Memory type mismatch: ${ramType} not supported by motherboard`,
    };
  }

  private getSpecValue(specifications: any[], specName: string): string | null {
    const spec = specifications.find(s => 
      s.name.toLowerCase().includes(specName.toLowerCase())
    );
    return spec?.value || null;
  }

  private extractSystemRequirements(specifications: any[]): SystemRequirements {
    const requirements: SystemRequirements = {};

    // Extract power requirements
    const tdp = this.getSpecValue(specifications, 'tdp');
    if (tdp) {
      const tdpValue = parseInt(tdp);
      requirements.minimumPSU = Math.ceil(tdpValue * 2); // Simple calculation
      requirements.recommendedPSU = Math.ceil(tdpValue * 2.5);
    }

    // Extract socket type
    const socket = this.getSpecValue(specifications, 'socket');
    if (socket) {
      requirements.socketType = socket;
    }

    // Extract memory type
    const memoryType = this.getSpecValue(specifications, 'memory');
    if (memoryType) {
      requirements.memoryType = memoryType.split(',').map(t => t.trim());
    }

    return requirements;
  }

  private generateCompatibilityWarnings(product: any): string[] {
    const warnings: string[] = [];

    // Check for high power consumption
    const tdp = this.getSpecValue(product.specifications, 'tdp');
    if (tdp && parseInt(tdp) > 150) {
      warnings.push('High power consumption - ensure adequate PSU and cooling');
    }

    // Check for large form factor
    const length = this.getSpecValue(product.specifications, 'length');
    if (length && parseInt(length) > 300) {
      warnings.push('Large form factor - verify case clearance');
    }

    return warnings;
  }

  async createCompatibilityRule(data: {
    productId: string;
    compatibleProductId: string;
    compatibility: 'COMPATIBLE' | 'INCOMPATIBLE' | 'PARTIAL';
    notes?: string;
  }): Promise<void> {
    try {
      await this.prisma.productCompatibility.create({
        data: {
          productId: data.productId,
          compatibleProductId: data.compatibleProductId,
          compatibility: data.compatibility,
          notes: data.notes,
        }
      });
    } catch (error) {
      logger.error('Failed to create compatibility rule', error);
      throw new Error('Failed to create compatibility rule');
    }
  }
}