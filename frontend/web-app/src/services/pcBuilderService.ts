import axios from 'axios';

export interface PCComponent {
  id: string;
  name: string;
  type: ComponentType;
  brand: string;
  model: string;
  price: number;
  specifications: Record<string, any>;
  compatibility: CompatibilityInfo;
  image: string;
  inStock: boolean;
  powerConsumption?: number;
  warranty?: string;
}

export enum ComponentType {
  CPU = 'CPU',
  MOTHERBOARD = 'MOTHERBOARD',
  RAM = 'RAM',
  GPU = 'GPU',
  STORAGE = 'STORAGE',
  PSU = 'PSU',
  CASE = 'CASE',
  CPU_COOLER = 'CPU_COOLER',
  CASE_FAN = 'CASE_FAN',
  MONITOR = 'MONITOR',
  KEYBOARD = 'KEYBOARD',
  MOUSE = 'MOUSE',
}

export interface CompatibilityInfo {
  socket?: string; // For CPU/Motherboard
  formFactor?: string; // For Motherboard/Case
  memoryType?: string; // For RAM
  memorySlots?: number;
  maxMemory?: number;
  pciSlots?: string[];
  powerConnectors?: string[];
  storageInterfaces?: string[];
  dimensions?: {
    length: number;
    width: number;
    height: number;
  };
}

export interface PCBuild {
  id?: string;
  name: string;
  userId?: string;
  components: {
    [ComponentType.CPU]?: PCComponent;
    [ComponentType.MOTHERBOARD]?: PCComponent;
    [ComponentType.RAM]?: PCComponent[];
    [ComponentType.GPU]?: PCComponent[];
    [ComponentType.STORAGE]?: PCComponent[];
    [ComponentType.PSU]?: PCComponent;
    [ComponentType.CASE]?: PCComponent;
    [ComponentType.CPU_COOLER]?: PCComponent;
    [ComponentType.CASE_FAN]?: PCComponent[];
    [ComponentType.MONITOR]?: PCComponent[];
    [ComponentType.KEYBOARD]?: PCComponent;
    [ComponentType.MOUSE]?: PCComponent;
  };
  totalPrice: number;
  totalPowerConsumption: number;
  compatibilityIssues: CompatibilityIssue[];
  isPublic?: boolean;
  description?: string;
  createdAt?: Date;
  updatedAt?: Date;
}

export interface CompatibilityIssue {
  severity: 'error' | 'warning' | 'info';
  component1: ComponentType;
  component2: ComponentType;
  message: string;
  details?: string;
}

export interface ComponentFilter {
  type: ComponentType;
  minPrice?: number;
  maxPrice?: number;
  brands?: string[];
  specifications?: Record<string, any>;
  inStockOnly?: boolean;
  sortBy?: 'price' | 'name' | 'popularity' | 'rating';
  sortOrder?: 'asc' | 'desc';
}

class PCBuilderService {
  private apiUrl = process.env.REACT_APP_API_URL || 'http://localhost:3000/api/v1';

  /**
   * Get available components by type with filters
   */
  async getComponents(filter: ComponentFilter): Promise<PCComponent[]> {
    try {
      const response = await axios.get(`${this.apiUrl}/pc-builder/components`, {
        params: filter,
      });
      return response.data.data;
    } catch (error) {
      console.error('Error fetching components:', error);
      throw error;
    }
  }

  /**
   * Get component details by ID
   */
  async getComponentById(componentId: string): Promise<PCComponent> {
    try {
      const response = await axios.get(`${this.apiUrl}/pc-builder/components/${componentId}`);
      return response.data.data;
    } catch (error) {
      console.error('Error fetching component details:', error);
      throw error;
    }
  }

  /**
   * Check compatibility between components
   */
  async checkCompatibility(build: PCBuild): Promise<CompatibilityIssue[]> {
    const issues: CompatibilityIssue[] = [];

    // CPU and Motherboard socket compatibility
    if (build.components.CPU && build.components.MOTHERBOARD) {
      const cpu = build.components.CPU;
      const motherboard = build.components.MOTHERBOARD;
      
      if (cpu.compatibility.socket !== motherboard.compatibility.socket) {
        issues.push({
          severity: 'error',
          component1: ComponentType.CPU,
          component2: ComponentType.MOTHERBOARD,
          message: 'CPU and Motherboard socket mismatch',
          details: `CPU socket: ${cpu.compatibility.socket}, Motherboard socket: ${motherboard.compatibility.socket}`,
        });
      }
    }

    // RAM and Motherboard compatibility
    if (build.components.RAM && build.components.MOTHERBOARD) {
      const ramModules = build.components.RAM;
      const motherboard = build.components.MOTHERBOARD;
      
      // Check memory type
      const ramType = ramModules[0]?.compatibility.memoryType;
      if (ramType && ramType !== motherboard.compatibility.memoryType) {
        issues.push({
          severity: 'error',
          component1: ComponentType.RAM,
          component2: ComponentType.MOTHERBOARD,
          message: 'RAM type incompatible with motherboard',
          details: `RAM type: ${ramType}, Motherboard supports: ${motherboard.compatibility.memoryType}`,
        });
      }

      // Check memory slots
      if (ramModules.length > (motherboard.compatibility.memorySlots || 0)) {
        issues.push({
          severity: 'error',
          component1: ComponentType.RAM,
          component2: ComponentType.MOTHERBOARD,
          message: 'Too many RAM modules',
          details: `Motherboard has ${motherboard.compatibility.memorySlots} slots, but ${ramModules.length} modules selected`,
        });
      }

      // Check total memory capacity
      const totalRam = ramModules.reduce((sum, ram) => 
        sum + (ram.specifications.capacity || 0), 0
      );
      if (totalRam > (motherboard.compatibility.maxMemory || Infinity)) {
        issues.push({
          severity: 'warning',
          component1: ComponentType.RAM,
          component2: ComponentType.MOTHERBOARD,
          message: 'RAM capacity exceeds motherboard maximum',
          details: `Total RAM: ${totalRam}GB, Maximum supported: ${motherboard.compatibility.maxMemory}GB`,
        });
      }
    }

    // Case and Motherboard form factor
    if (build.components.CASE && build.components.MOTHERBOARD) {
      const pcCase = build.components.CASE;
      const motherboard = build.components.MOTHERBOARD;
      
      const supportedFormFactors = pcCase.specifications.supportedFormFactors || [];
      if (!supportedFormFactors.includes(motherboard.compatibility.formFactor)) {
        issues.push({
          severity: 'error',
          component1: ComponentType.CASE,
          component2: ComponentType.MOTHERBOARD,
          message: 'Motherboard form factor not supported by case',
          details: `Motherboard: ${motherboard.compatibility.formFactor}, Case supports: ${supportedFormFactors.join(', ')}`,
        });
      }
    }

    // GPU clearance in case
    if (build.components.GPU && build.components.CASE) {
      const gpus = build.components.GPU;
      const pcCase = build.components.CASE;
      const maxGpuLength = pcCase.specifications.maxGpuLength || Infinity;

      gpus.forEach((gpu, index) => {
        const gpuLength = gpu.compatibility.dimensions?.length || 0;
        if (gpuLength > maxGpuLength) {
          issues.push({
            severity: 'error',
            component1: ComponentType.GPU,
            component2: ComponentType.CASE,
            message: `GPU ${index + 1} too long for case`,
            details: `GPU length: ${gpuLength}mm, Case maximum: ${maxGpuLength}mm`,
          });
        }
      });
    }

    // Power supply capacity check
    if (build.components.PSU) {
      const psu = build.components.PSU;
      const totalPower = this.calculateTotalPower(build);
      const psuWattage = psu.specifications.wattage || 0;
      
      // Recommend 20% headroom
      const recommendedWattage = totalPower * 1.2;
      
      if (psuWattage < totalPower) {
        issues.push({
          severity: 'error',
          component1: ComponentType.PSU,
          component2: ComponentType.PSU,
          message: 'Insufficient power supply capacity',
          details: `System requires ~${totalPower}W, PSU provides ${psuWattage}W`,
        });
      } else if (psuWattage < recommendedWattage) {
        issues.push({
          severity: 'warning',
          component1: ComponentType.PSU,
          component2: ComponentType.PSU,
          message: 'Low power supply headroom',
          details: `Recommended: ${Math.ceil(recommendedWattage)}W for 20% headroom, PSU provides ${psuWattage}W`,
        });
      }
    }

    // CPU Cooler compatibility
    if (build.components.CPU_COOLER && build.components.CPU) {
      const cooler = build.components.CPU_COOLER;
      const cpu = build.components.CPU;
      
      const supportedSockets = cooler.specifications.supportedSockets || [];
      if (!supportedSockets.includes(cpu.compatibility.socket || '')) {
        issues.push({
          severity: 'error',
          component1: ComponentType.CPU_COOLER,
          component2: ComponentType.CPU,
          message: 'CPU cooler incompatible with CPU socket',
          details: `CPU socket: ${cpu.compatibility.socket}, Cooler supports: ${supportedSockets.join(', ')}`,
        });
      }
    }

    return issues;
  }

  /**
   * Calculate total power consumption
   */
  calculateTotalPower(build: PCBuild): number {
    let totalPower = 0;

    // Add power from all components
    Object.values(build.components).forEach(component => {
      if (Array.isArray(component)) {
        component.forEach(item => {
          totalPower += item.powerConsumption || 0;
        });
      } else if (component) {
        totalPower += component.powerConsumption || 0;
      }
    });

    return totalPower;
  }

  /**
   * Calculate total price
   */
  calculateTotalPrice(build: PCBuild): number {
    let totalPrice = 0;

    Object.values(build.components).forEach(component => {
      if (Array.isArray(component)) {
        component.forEach(item => {
          totalPrice += item.price || 0;
        });
      } else if (component) {
        totalPrice += component.price || 0;
      }
    });

    return totalPrice;
  }

  /**
   * Get component recommendations based on current build
   */
  async getRecommendations(build: PCBuild, componentType: ComponentType): Promise<PCComponent[]> {
    try {
      const response = await axios.post(`${this.apiUrl}/pc-builder/recommendations`, {
        build,
        componentType,
      });
      return response.data.data;
    } catch (error) {
      console.error('Error fetching recommendations:', error);
      throw error;
    }
  }

  /**
   * Save build configuration
   */
  async saveBuild(build: PCBuild, token?: string): Promise<PCBuild> {
    try {
      const headers = token ? { Authorization: `Bearer ${token}` } : {};
      const response = await axios.post(`${this.apiUrl}/pc-builder/builds`, build, {
        headers,
      });
      return response.data.data;
    } catch (error) {
      console.error('Error saving build:', error);
      throw error;
    }
  }

  /**
   * Update existing build
   */
  async updateBuild(buildId: string, build: PCBuild, token: string): Promise<PCBuild> {
    try {
      const response = await axios.put(`${this.apiUrl}/pc-builder/builds/${buildId}`, build, {
        headers: { Authorization: `Bearer ${token}` },
      });
      return response.data.data;
    } catch (error) {
      console.error('Error updating build:', error);
      throw error;
    }
  }

  /**
   * Get user's saved builds
   */
  async getUserBuilds(token: string): Promise<PCBuild[]> {
    try {
      const response = await axios.get(`${this.apiUrl}/pc-builder/builds/user`, {
        headers: { Authorization: `Bearer ${token}` },
      });
      return response.data.data;
    } catch (error) {
      console.error('Error fetching user builds:', error);
      throw error;
    }
  }

  /**
   * Get public builds
   */
  async getPublicBuilds(filter?: {
    minPrice?: number;
    maxPrice?: number;
    sortBy?: string;
    page?: number;
    limit?: number;
  }): Promise<{ builds: PCBuild[]; total: number }> {
    try {
      const response = await axios.get(`${this.apiUrl}/pc-builder/builds/public`, {
        params: filter,
      });
      return response.data;
    } catch (error) {
      console.error('Error fetching public builds:', error);
      throw error;
    }
  }

  /**
   * Delete a build
   */
  async deleteBuild(buildId: string, token: string): Promise<void> {
    try {
      await axios.delete(`${this.apiUrl}/pc-builder/builds/${buildId}`, {
        headers: { Authorization: `Bearer ${token}` },
      });
    } catch (error) {
      console.error('Error deleting build:', error);
      throw error;
    }
  }

  /**
   * Add all components from a build to cart
   */
  async addBuildToCart(build: PCBuild, token: string): Promise<void> {
    try {
      const items = Object.values(build.components).flatMap(component => {
        if (Array.isArray(component)) {
          return component.map(item => ({
            productId: item.id,
            quantity: 1,
          }));
        } else if (component) {
          return [{
            productId: component.id,
            quantity: 1,
          }];
        }
        return [];
      });

      await axios.post(`${this.apiUrl}/cart/add-multiple`, { items }, {
        headers: { Authorization: `Bearer ${token}` },
      });
    } catch (error) {
      console.error('Error adding build to cart:', error);
      throw error;
    }
  }

  /**
   * Generate a build within budget
   */
  async generateBuild(budget: number, preferences?: {
    purpose?: 'gaming' | 'workstation' | 'general';
    prioritizeComponents?: ComponentType[];
  }): Promise<PCBuild> {
    try {
      const response = await axios.post(`${this.apiUrl}/pc-builder/generate`, {
        budget,
        preferences,
      });
      return response.data.data;
    } catch (error) {
      console.error('Error generating build:', error);
      throw error;
    }
  }

  /**
   * Get popular/featured builds
   */
  async getFeaturedBuilds(): Promise<PCBuild[]> {
    try {
      const response = await axios.get(`${this.apiUrl}/pc-builder/builds/featured`);
      return response.data.data;
    } catch (error) {
      console.error('Error fetching featured builds:', error);
      throw error;
    }
  }

  /**
   * Export build as shareable link or PDF
   */
  async exportBuild(build: PCBuild, format: 'link' | 'pdf'): Promise<string> {
    try {
      const response = await axios.post(`${this.apiUrl}/pc-builder/export`, {
        build,
        format,
      });
      return response.data.url;
    } catch (error) {
      console.error('Error exporting build:', error);
      throw error;
    }
  }
}

// Export singleton instance
export const pcBuilderService = new PCBuilderService();

// Export types and enums
export type { PCBuilderService };