import { PrismaClient, ProductSpecification, Prisma } from '@prisma/client';
import { getPrismaClient } from '../config/database';
import { logger } from '../utils/logger';

export interface DetailedSpecifications {
  productId: string;
  generalSpecs: Record<string, any>;
  performanceSpecs: Record<string, any>;
  technicalSpecs: Record<string, any>;
  features: string[];
  categories: SpecificationCategory[];
}

export interface SpecificationCategory {
  name: string;
  specifications: Array<{
    name: string;
    value: string;
    unit?: string;
    description?: string;
  }>;
}

export interface SpecificationTemplate {
  categoryId: string;
  specifications: Array<{
    name: string;
    type: string;
    required: boolean;
    defaultValue?: string;
    options?: string[];
    unit?: string;
    description?: string;
  }>;
}

export class SpecificationService {
  private prisma: PrismaClient;

  constructor() {
    this.prisma = getPrismaClient();
  }

  async getDetailedSpecifications(productId: string): Promise<DetailedSpecifications | null> {
    try {
      const product = await this.prisma.product.findUnique({
        where: { id: productId },
        include: {
          specifications: true,
          category: true,
          brand: true,
        }
      });

      if (!product) {
        return null;
      }

      // Group specifications by category
      const specsByCategory = this.groupSpecificationsByCategory(product.specifications);

      // Build detailed specifications object
      const detailedSpecs: DetailedSpecifications = {
        productId,
        generalSpecs: this.buildGeneralSpecs(product, specsByCategory),
        performanceSpecs: this.buildPerformanceSpecs(specsByCategory),
        technicalSpecs: this.buildTechnicalSpecs(specsByCategory),
        features: this.extractFeatures(product.specifications),
        categories: this.buildSpecificationCategories(specsByCategory),
      };

      return detailedSpecs;
    } catch (error) {
      logger.error('Failed to get detailed specifications', error);
      throw new Error('Failed to retrieve product specifications');
    }
  }

  private groupSpecificationsByCategory(specifications: ProductSpecification[]): Record<string, ProductSpecification[]> {
    const grouped: Record<string, ProductSpecification[]> = {};

    specifications.forEach(spec => {
      const category = spec.group || 'General';
      if (!grouped[category]) {
        grouped[category] = [];
      }
      grouped[category].push(spec);
    });

    return grouped;
  }

  private buildGeneralSpecs(product: any, specsByCategory: Record<string, ProductSpecification[]>): Record<string, any> {
    const general = specsByCategory['General'] || [];
    const generalSpecs: Record<string, any> = {
      brand: product.brand?.name,
      model: product.name,
      sku: product.sku,
      price: product.price,
      currency: product.currency || 'UZS',
    };

    // Add general specifications
    general.forEach(spec => {
      generalSpecs[spec.name] = spec.value;
    });

    return generalSpecs;
  }

  private buildPerformanceSpecs(specsByCategory: Record<string, ProductSpecification[]>): Record<string, any> {
    const performance = specsByCategory['Performance'] || [];
    const performanceSpecs: Record<string, any> = {};

    performance.forEach(spec => {
      performanceSpecs[spec.name] = {
        value: spec.value,
        unit: spec.unit,
      };
    });

    return performanceSpecs;
  }

  private buildTechnicalSpecs(specsByCategory: Record<string, ProductSpecification[]>): Record<string, any> {
    const technical = specsByCategory['Technical'] || [];
    const technicalSpecs: Record<string, any> = {};

    technical.forEach(spec => {
      technicalSpecs[spec.name] = {
        value: spec.value,
        unit: spec.unit,
      };
    });

    return technicalSpecs;
  }

  private extractFeatures(specifications: ProductSpecification[]): string[] {
    const features = specifications
      .filter(spec => spec.group === 'Features' || spec.name.toLowerCase().includes('feature'))
      .map(spec => spec.value);

    return [...new Set(features)];
  }

  private buildSpecificationCategories(specsByCategory: Record<string, ProductSpecification[]>): SpecificationCategory[] {
    return Object.entries(specsByCategory).map(([categoryName, specs]) => ({
      name: categoryName,
      specifications: specs.map(spec => ({
        name: spec.name,
        value: spec.value,
        unit: spec.unit || undefined,
        description: undefined, // Could be added to schema
      }))
    }));
  }

  async createSpecification(productId: string, specification: {
    name: string;
    value: string;
    unit?: string;
    group?: string;
  }): Promise<ProductSpecification> {
    try {
      return await this.prisma.productSpecification.create({
        data: {
          productId,
          name: specification.name,
          value: specification.value,
          unit: specification.unit,
          group: specification.group || 'General',
        }
      });
    } catch (error) {
      logger.error('Failed to create specification', error);
      throw new Error('Failed to create product specification');
    }
  }

  async updateSpecification(id: string, updates: {
    name?: string;
    value?: string;
    unit?: string;
    group?: string;
  }): Promise<ProductSpecification> {
    try {
      return await this.prisma.productSpecification.update({
        where: { id },
        data: updates,
      });
    } catch (error) {
      logger.error('Failed to update specification', error);
      throw new Error('Failed to update product specification');
    }
  }

  async deleteSpecification(id: string): Promise<void> {
    try {
      await this.prisma.productSpecification.delete({
        where: { id },
      });
    } catch (error) {
      logger.error('Failed to delete specification', error);
      throw new Error('Failed to delete product specification');
    }
  }

  async getSpecificationTemplate(categoryId: string): Promise<SpecificationTemplate | null> {
    try {
      const template = await this.prisma.techSpecTemplate.findUnique({
        where: { categoryId },
        include: {
          category: true,
        }
      });

      if (!template) {
        return null;
      }

      // Parse template specifications from JSON or structured data
      const specifications = this.parseTemplateSpecifications(template.specifications as any);

      return {
        categoryId,
        specifications,
      };
    } catch (error) {
      logger.error('Failed to get specification template', error);
      return null;
    }
  }

  private parseTemplateSpecifications(templateData: any): SpecificationTemplate['specifications'] {
    if (!templateData || typeof templateData !== 'object') {
      return [];
    }

    // Convert template data to specification array
    return Object.entries(templateData).map(([name, config]: [string, any]) => ({
      name,
      type: config.type || 'text',
      required: config.required || false,
      defaultValue: config.defaultValue,
      options: config.options,
      unit: config.unit,
      description: config.description,
    }));
  }

  async createSpecificationTemplate(categoryId: string, specifications: SpecificationTemplate['specifications']): Promise<void> {
    try {
      // Convert specifications array to JSON structure
      const templateData = specifications.reduce((acc, spec) => {
        acc[spec.name] = {
          type: spec.type,
          required: spec.required,
          defaultValue: spec.defaultValue,
          options: spec.options,
          unit: spec.unit,
          description: spec.description,
        };
        return acc;
      }, {} as Record<string, any>);

      await this.prisma.techSpecTemplate.upsert({
        where: { categoryId },
        create: {
          categoryId,
          specifications: templateData,
        },
        update: {
          specifications: templateData,
        },
      });
    } catch (error) {
      logger.error('Failed to create specification template', error);
      throw new Error('Failed to create specification template');
    }
  }

  async compareSpecifications(productIds: string[]): Promise<{
    products: Array<{ id: string; name: string; specifications: Record<string, any> }>;
    commonSpecs: string[];
    differences: Record<string, Record<string, any>>;
  }> {
    try {
      const products = await this.prisma.product.findMany({
        where: { id: { in: productIds } },
        include: {
          specifications: true,
        }
      });

      const productsWithSpecs = products.map(product => {
        const specs: Record<string, any> = {};
        product.specifications.forEach(spec => {
          specs[spec.name] = {
            value: spec.value,
            unit: spec.unit,
          };
        });

        return {
          id: product.id,
          name: product.name,
          specifications: specs,
        };
      });

      // Find common specifications
      const allSpecNames = new Set<string>();
      productsWithSpecs.forEach(product => {
        Object.keys(product.specifications).forEach(specName => {
          allSpecNames.add(specName);
        });
      });

      const commonSpecs = Array.from(allSpecNames).filter(specName => {
        return productsWithSpecs.every(product => 
          product.specifications.hasOwnProperty(specName)
        );
      });

      // Find differences
      const differences: Record<string, Record<string, any>> = {};
      Array.from(allSpecNames).forEach(specName => {
        const values = productsWithSpecs.map(product => ({
          productId: product.id,
          value: product.specifications[specName]?.value || 'N/A',
        }));

        // Check if values are different
        const uniqueValues = new Set(values.map(v => v.value));
        if (uniqueValues.size > 1) {
          differences[specName] = values.reduce((acc, item) => {
            acc[item.productId] = item.value;
            return acc;
          }, {} as Record<string, any>);
        }
      });

      return {
        products: productsWithSpecs,
        commonSpecs,
        differences,
      };
    } catch (error) {
      logger.error('Failed to compare specifications', error);
      throw new Error('Failed to compare product specifications');
    }
  }

  async getSpecificationStatistics(categoryId?: string): Promise<{
    totalSpecs: number;
    specsByCategory: Record<string, number>;
    mostCommonSpecs: Array<{ name: string; count: number }>;
    specValueDistribution: Record<string, Record<string, number>>;
  }> {
    try {
      const whereCondition = categoryId 
        ? { product: { categoryId } }
        : {};

      const [totalSpecs, specsByGroup, commonSpecs] = await Promise.all([
        // Total specifications count
        this.prisma.productSpecification.count({
          where: whereCondition,
        }),

        // Specifications by group/category
        this.prisma.productSpecification.groupBy({
          by: ['group'],
          where: whereCondition,
          _count: true,
        }),

        // Most common specification names
        this.prisma.productSpecification.groupBy({
          by: ['name'],
          where: whereCondition,
          _count: true,
          orderBy: { _count: { name: 'desc' } },
          take: 20,
        }),
      ]);

      const specsByCategory = specsByGroup.reduce((acc, item) => {
        acc[item.group || 'General'] = item._count;
        return acc;
      }, {} as Record<string, number>);

      const mostCommonSpecs = commonSpecs.map(spec => ({
        name: spec.name,
        count: spec._count,
      }));

      // Get value distribution for top specs
      const specValueDistribution: Record<string, Record<string, number>> = {};
      const topSpecNames = mostCommonSpecs.slice(0, 10).map(s => s.name);

      for (const specName of topSpecNames) {
        const values = await this.prisma.productSpecification.groupBy({
          by: ['value'],
          where: {
            ...whereCondition,
            name: specName,
          },
          _count: true,
          orderBy: { _count: { value: 'desc' } },
          take: 10,
        });

        specValueDistribution[specName] = values.reduce((acc, item) => {
          acc[item.value] = item._count;
          return acc;
        }, {} as Record<string, number>);
      }

      return {
        totalSpecs,
        specsByCategory,
        mostCommonSpecs,
        specValueDistribution,
      };
    } catch (error) {
      logger.error('Failed to get specification statistics', error);
      throw new Error('Failed to retrieve specification statistics');
    }
  }
}