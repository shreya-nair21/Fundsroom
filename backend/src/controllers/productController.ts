import { Response } from 'express';
import { AuthenticatedRequest } from '../middlewares/authMiddleware';
import prisma from '../utils/prisma';
import { z } from 'zod';
import { MovementType } from '@prisma/client';

// Schema for product input
const productSchema = z.object({
  name: z.string().min(1, 'Name is required'),
  sku: z.string().min(1, 'SKU code is required'),
  category: z.string().min(1, 'Category is required'),
  unitPrice: z.number().positive('Unit price must be positive'),
  currentStock: z.number().int().nonnegative('Current stock cannot be negative'),
  minStockAlert: z.number().int().nonnegative('Minimum stock alert level cannot be negative'),
  location: z.string().min(1, 'Location/Warehouse bin is required'),
});

// Schema for manual stock adjustment
const stockAdjustmentSchema = z.object({
  quantity: z.number().int().positive('Quantity must be a positive integer'),
  movementType: z.nativeEnum(MovementType),
  reason: z.string().min(1, 'Reason for stock adjustment is required'),
});

// List and search products
export async function getProducts(req: AuthenticatedRequest, res: Response) {
  try {
    const page = parseInt(req.query.page as string) || 1;
    const limit = parseInt(req.query.limit as string) || 10;
    const search = (req.query.search as string) || '';
    const category = (req.query.category as string) || '';
    const lowStock = req.query.lowStock === 'true'; // Filter for products below alert level

    const skip = (page - 1) * limit;

    // Build filter query
    const where: any = {};

    if (search) {
      where.OR = [
        { name: { contains: search } },
        { sku: { contains: search } },
      ];
    }

    if (category) {
      where.category = category;
    }

    if (lowStock) {
      // Find products where currentStock <= minStockAlert
      where.AND = [
        {
          currentStock: {
            lte: prisma.product.fields.minStockAlert, // wait! prisma doesn't support field-to-field comparison inside 'where' easily in MySQL without raw query, or we can use standard filter if we do client-side filter, but prisma raw or filtering in javascript is fine if dataset is small. Let's do it with Javascript filtering or raw query.
          },
        },
      ];
      // Wait, field-to-field comparison is not supported directly in Prisma where object.
      // A standard work around in prisma is prisma.$queryRaw, or just reading products and filtering in memory, or using a raw SQL condition.
      // Let's use a raw query or just fetch all and filter in JS if paginated, or write a raw query.
      // Wait! We can write a raw SQL query or check if we can query for low stock products.
      // Let's write a simple prisma query and filter in memory, or write a clean raw query. In memory filtering is easy, but raw query is better. Let's do raw query if lowStock is true!
    }

    // Wait, let's refine the lowStock check.
    // If lowStock is true:
    if (lowStock) {
      // In MySQL: SELECT * FROM Product WHERE currentStock <= minStockAlert
      const rawProducts: any = await prisma.$queryRaw`
        SELECT * FROM Product 
        WHERE currentStock <= minStockAlert 
        AND (name LIKE ${'%' + search + '%'} OR sku LIKE ${'%' + search + '%'})
        ${category ? prisma.$queryRaw`AND category = ${category}` : prisma.$queryRaw``}
        ORDER BY name ASC
      `;
      // Let's handle pagination for raw products
      const total = rawProducts.length;
      const paginatedProducts = rawProducts.slice(skip, skip + limit);

      return res.status(200).json({
        success: true,
        data: paginatedProducts,
        meta: {
          total,
          page,
          limit,
          totalPages: Math.ceil(total / limit),
        },
      });
    }

    const [products, total] = await Promise.all([
      prisma.product.findMany({
        where,
        skip,
        take: limit,
        orderBy: { name: 'asc' },
      }),
      prisma.product.count({ where }),
    ]);

    return res.status(200).json({
      success: true,
      data: products,
      meta: {
        total,
        page,
        limit,
        totalPages: Math.ceil(total / limit),
      },
    });
  } catch (error) {
    console.error('Get products error:', error);
    return res.status(500).json({ success: false, message: 'Internal server error' });
  }
}

// Get single product detail
export async function getProductById(req: AuthenticatedRequest, res: Response) {
  try {
    const id = parseInt(req.params.id as string);
    if (isNaN(id)) {
      return res.status(400).json({ success: false, message: 'Invalid product ID' });
    }

    const product = await prisma.product.findUnique({
      where: { id },
      include: {
        stockMovements: {
          orderBy: { timestamp: 'desc' },
          include: {
            createdBy: {
              select: { id: true, name: true, role: true },
            },
          },
        },
      },
    });

    if (!product) {
      return res.status(404).json({ success: false, message: 'Product not found' });
    }

    return res.status(200).json({ success: true, data: product });
  } catch (error) {
    console.error('Get product detail error:', error);
    return res.status(500).json({ success: false, message: 'Internal server error' });
  }
}

// Create product
export async function createProduct(req: AuthenticatedRequest, res: Response) {
  try {
    const parseResult = productSchema.safeParse(req.body);
    if (!parseResult.success) {
      return res.status(400).json({
        success: false,
        message: 'Validation failed',
        errors: parseResult.error.flatten().fieldErrors,
      });
    }

    const data = parseResult.data;

    // Check unique SKU
    const existing = await prisma.product.findUnique({ where: { sku: data.sku } });
    if (existing) {
      return res.status(400).json({ success: false, message: 'Product with this SKU already exists' });
    }

    // Use Prisma transaction to create product and log stock intake
    const product = await prisma.$transaction(async (tx) => {
      const p = await tx.product.create({ data });
      
      if (p.currentStock > 0) {
        await tx.stockMovement.create({
          data: {
            productId: p.id,
            quantityChanged: p.currentStock,
            movementType: MovementType.IN,
            reason: 'Initial stock intake upon creation',
            createdById: req.user!.id,
          },
        });
      }
      return p;
    });

    return res.status(201).json({ success: true, message: 'Product created successfully', data: product });
  } catch (error) {
    console.error('Create product error:', error);
    return res.status(500).json({ success: false, message: 'Internal server error' });
  }
}

// Edit product
export async function updateProduct(req: AuthenticatedRequest, res: Response) {
  try {
    const id = parseInt(req.params.id as string);
    if (isNaN(id)) {
      return res.status(400).json({ success: false, message: 'Invalid product ID' });
    }

    const parseResult = productSchema.safeParse(req.body);
    if (!parseResult.success) {
      return res.status(400).json({
        success: false,
        message: 'Validation failed',
        errors: parseResult.error.flatten().fieldErrors,
      });
    }

    const data = parseResult.data;

    const existingProduct = await prisma.product.findUnique({ where: { id } });
    if (!existingProduct) {
      return res.status(404).json({ success: false, message: 'Product not found' });
    }

    // Check unique SKU if SKU changed
    if (data.sku !== existingProduct.sku) {
      const existingSku = await prisma.product.findUnique({ where: { sku: data.sku } });
      if (existingSku) {
        return res.status(400).json({ success: false, message: 'Product with this SKU already exists' });
      }
    }

    // Update product. Note: we do NOT update stock directly through standard update, 
    // but the API allows changing currentStock in edit? The case study requires:
    // "Required features: Add product, Edit product"
    // Let's check if the stock changed in the edit. If it did, we should log a stock movement!
    const updated = await prisma.$transaction(async (tx) => {
      const stockDiff = data.currentStock - existingProduct.currentStock;
      
      const p = await tx.product.update({
        where: { id },
        data,
      });

      if (stockDiff !== 0) {
        await tx.stockMovement.create({
          data: {
            productId: p.id,
            quantityChanged: Math.abs(stockDiff),
            movementType: stockDiff > 0 ? MovementType.IN : MovementType.OUT,
            reason: `Product stock manually updated from edit page (from ${existingProduct.currentStock} to ${data.currentStock})`,
            createdById: req.user!.id,
          },
        });
      }
      return p;
    });

    return res.status(200).json({ success: true, message: 'Product updated successfully', data: updated });
  } catch (error) {
    console.error('Update product error:', error);
    return res.status(500).json({ success: false, message: 'Internal server error' });
  }
}

// Adjust stock (manual IN/OUT)
export async function adjustStock(req: AuthenticatedRequest, res: Response) {
  try {
    const id = parseInt(req.params.id as string);
    if (isNaN(id)) {
      return res.status(400).json({ success: false, message: 'Invalid product ID' });
    }

    const parseResult = stockAdjustmentSchema.safeParse(req.body);
    if (!parseResult.success) {
      return res.status(400).json({
        success: false,
        message: 'Validation failed',
        errors: parseResult.error.flatten().fieldErrors,
      });
    }

    const { quantity, movementType, reason } = parseResult.data;

    const product = await prisma.product.findUnique({ where: { id } });
    if (!product) {
      return res.status(404).json({ success: false, message: 'Product not found' });
    }

    // Check if enough stock for issuing OUT
    if (movementType === MovementType.OUT && product.currentStock < quantity) {
      return res.status(400).json({
        success: false,
        message: `Insufficient stock. Available stock: ${product.currentStock}. Requested issue: ${quantity}.`,
      });
    }

    const updatedProduct = await prisma.$transaction(async (tx) => {
      // Calculate new stock level
      const newStock =
        movementType === MovementType.IN
          ? product.currentStock + quantity
          : product.currentStock - quantity;

      // Update product stock
      const p = await tx.product.update({
        where: { id },
        data: { currentStock: newStock },
      });

      // Create stock movement log
      await tx.stockMovement.create({
        data: {
          productId: id,
          quantityChanged: quantity,
          movementType,
          reason,
          createdById: req.user!.id,
        },
      });

      return p;
    });

    return res.status(200).json({
      success: true,
      message: `Stock adjusted successfully. New stock: ${updatedProduct.currentStock}`,
      data: updatedProduct,
    });
  } catch (error) {
    console.error('Adjust stock error:', error);
    return res.status(500).json({ success: false, message: 'Internal server error' });
  }
}

// Get global stock movement logs
export async function getStockMovements(req: AuthenticatedRequest, res: Response) {
  try {
    const page = parseInt(req.query.page as string) || 1;
    const limit = parseInt(req.query.limit as string) || 20;
    const skip = (page - 1) * limit;

    const [movements, total] = await Promise.all([
      prisma.stockMovement.findMany({
        skip,
        take: limit,
        orderBy: { timestamp: 'desc' },
        include: {
          product: {
            select: { id: true, name: true, sku: true },
          },
          createdBy: {
            select: { id: true, name: true, role: true },
          },
        },
      }),
      prisma.stockMovement.count(),
    ]);

    return res.status(200).json({
      success: true,
      data: movements,
      meta: {
        total,
        page,
        limit,
        totalPages: Math.ceil(total / limit),
      },
    });
  } catch (error) {
    console.error('Get stock movements error:', error);
    return res.status(500).json({ success: false, message: 'Internal server error' });
  }
}
