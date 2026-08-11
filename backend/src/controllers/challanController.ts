import { Response } from 'express';
import { AuthenticatedRequest } from '../middlewares/authMiddleware';
import prisma from '../utils/prisma';
import { z } from 'zod';
import { ChallanStatus, MovementType } from '@prisma/client';

// Schema for creating/editing challan
const challanProductSchema = z.object({
  productId: z.number().int().positive('Product ID is required'),
  quantityOrdered: z.number().int().positive('Quantity must be at least 1'),
});

const challanSchema = z.object({
  customerId: z.number().int().positive('Customer ID is required'),
  status: z.nativeEnum(ChallanStatus).default(ChallanStatus.DRAFT),
  products: z.array(challanProductSchema).min(1, 'At least one product is required'),
});

// Helper to generate a unique challan number
async function generateChallanNumber(): Promise<string> {
  const now = new Date();
  const year = now.getFullYear();
  const month = String(now.getMonth() + 1).padStart(2, '0');
  const day = String(now.getDate()).padStart(2, '0');
  const dateStr = `${year}${month}${day}`;

  // Find number of challans created today
  const startOfDay = new Date(now.getFullYear(), now.getMonth(), now.getDate());
  const countToday = await prisma.challan.count({
    where: {
      createdAt: {
        gte: startOfDay,
      },
    },
  });

  const serial = String(countToday + 1).padStart(4, '0');
  return `CH-${dateStr}-${serial}`;
}

// List all challans
export async function getChallans(req: AuthenticatedRequest, res: Response) {
  try {
    const page = parseInt(req.query.page as string) || 1;
    const limit = parseInt(req.query.limit as string) || 10;
    const search = (req.query.search as string) || '';
    const status = (req.query.status as string) || '';

    const skip = (page - 1) * limit;

    const where: any = {};

    if (status) {
      where.status = status as ChallanStatus;
    }

    if (search) {
      where.OR = [
        { challanNumber: { contains: search } },
        {
          customer: {
            name: { contains: search },
          },
        },
        {
          customer: {
            businessName: { contains: search },
          },
        },
      ];
    }

    const [challans, total] = await Promise.all([
      prisma.challan.findMany({
        where,
        skip,
        take: limit,
        orderBy: { createdAt: 'desc' },
        include: {
          customer: {
            select: { id: true, name: true, businessName: true },
          },
          createdBy: {
            select: { id: true, name: true, role: true },
          },
        },
      }),
      prisma.challan.count({ where }),
    ]);

    return res.status(200).json({
      success: true,
      data: challans,
      meta: {
        total,
        page,
        limit,
        totalPages: Math.ceil(total / limit),
      },
    });
  } catch (error) {
    console.error('Get challans error:', error);
    return res.status(500).json({ success: false, message: 'Internal server error' });
  }
}

// Get single challan detail (with products and snapshots)
export async function getChallanById(req: AuthenticatedRequest, res: Response) {
  try {
    const id = parseInt(req.params.id as string);
    if (isNaN(id)) {
      return res.status(400).json({ success: false, message: 'Invalid challan ID' });
    }

    const challan = await prisma.challan.findUnique({
      where: { id },
      include: {
        customer: true,
        createdBy: {
          select: { id: true, name: true, role: true },
        },
        products: true,
      },
    });

    if (!challan) {
      return res.status(404).json({ success: false, message: 'Challan not found' });
    }

    return res.status(200).json({ success: true, data: challan });
  } catch (error) {
    console.error('Get challan detail error:', error);
    return res.status(500).json({ success: false, message: 'Internal server error' });
  }
}

// Create challan
export async function createChallan(req: AuthenticatedRequest, res: Response) {
  try {
    const parseResult = challanSchema.safeParse(req.body);
    if (!parseResult.success) {
      return res.status(400).json({
        success: false,
        message: 'Validation failed',
        errors: parseResult.error.flatten().fieldErrors,
      });
    }

    const { customerId, status, products: inputProducts } = parseResult.data;

    // Verify customer exists
    const customer = await prisma.customer.findUnique({ where: { id: customerId } });
    if (!customer) {
      return res.status(404).json({ success: false, message: 'Customer not found' });
    }

    // Get the product details from DB to build snapshots and check stock
    const dbProductIds = inputProducts.map((p) => p.productId);
    const dbProducts = await prisma.product.findMany({
      where: { id: { in: dbProductIds } },
    });

    if (dbProducts.length !== dbProductIds.length) {
      return res.status(400).json({ success: false, message: 'One or more products were not found' });
    }

    const productMap = new Map(dbProducts.map((p) => [p.id, p]));

    // Perform validation and stock checks
    const snapshotItems: {
      productId: number;
      nameSnapshot: string;
      skuSnapshot: string;
      unitPriceSnapshot: number;
      quantityOrdered: number;
      totalPrice: number;
    }[] = [];
    let totalQuantity = 0;

    for (const item of inputProducts) {
      const dbProduct = productMap.get(item.productId)!;

      // If status is CONFIRMED, check stock levels
      if (status === ChallanStatus.CONFIRMED) {
        if (dbProduct.currentStock < item.quantityOrdered) {
          return res.status(400).json({
            success: false,
            message: `Insufficient stock for product '${dbProduct.name}' (SKU: ${dbProduct.sku}). Available: ${dbProduct.currentStock}, Requested: ${item.quantityOrdered}`,
          });
        }
      }

      totalQuantity += item.quantityOrdered;

      snapshotItems.push({
        productId: item.productId,
        nameSnapshot: dbProduct.name,
        skuSnapshot: dbProduct.sku,
        unitPriceSnapshot: dbProduct.unitPrice,
        quantityOrdered: item.quantityOrdered,
        totalPrice: dbProduct.unitPrice * item.quantityOrdered,
      });
    }

    const challanNumber = await generateChallanNumber();

    // Use a transaction to create the challan and deduct stock if confirmed
    const resultChallan = await prisma.$transaction(async (tx) => {
      // 1. Create challan record
      const challan = await tx.challan.create({
        data: {
          challanNumber,
          customerId,
          status,
          totalQuantity,
          createdById: req.user!.id,
          products: {
            create: snapshotItems,
          },
        },
        include: {
          products: true,
        },
      });

      // 2. If status is CONFIRMED, deduct stock and log stock movements
      if (status === ChallanStatus.CONFIRMED) {
        for (const item of inputProducts) {
          const dbProduct = productMap.get(item.productId)!;
          
          await tx.product.update({
            where: { id: item.productId },
            data: {
              currentStock: {
                decrement: item.quantityOrdered,
              },
            },
          });

          await tx.stockMovement.create({
            data: {
              productId: item.productId,
              quantityChanged: item.quantityOrdered,
              movementType: MovementType.OUT,
              reason: `Sales Challan ${challanNumber} Confirmed`,
              createdById: req.user!.id,
            },
          });
        }
      }

      return challan;
    });

    return res.status(201).json({
      success: true,
      message: `Challan created successfully as ${status}`,
      data: resultChallan,
    });
  } catch (error) {
    console.error('Create challan error:', error);
    return res.status(500).json({ success: false, message: 'Internal server error' });
  }
}

// Update Challan Status (Draft -> Confirmed, Draft/Confirmed -> Cancelled)
export async function updateChallanStatus(req: AuthenticatedRequest, res: Response) {
  try {
    const id = parseInt(req.params.id as string);
    if (isNaN(id)) {
      return res.status(400).json({ success: false, message: 'Invalid challan ID' });
    }

    const statusSchema = z.object({
      status: z.nativeEnum(ChallanStatus),
    });

    const parseResult = statusSchema.safeParse(req.body);
    if (!parseResult.success) {
      return res.status(400).json({
        success: false,
        message: 'Validation failed',
        errors: parseResult.error.flatten().fieldErrors,
      });
    }

    const targetStatus = parseResult.data.status;

    // Fetch the existing challan
    const challan = await prisma.challan.findUnique({
      where: { id },
      include: { products: true },
    });

    if (!challan) {
      return res.status(404).json({ success: false, message: 'Challan not found' });
    }

    // Check if the transition is valid
    if (challan.status === targetStatus) {
      return res.status(400).json({ success: false, message: `Challan is already ${targetStatus}` });
    }

    if (challan.status === ChallanStatus.CANCELLED) {
      return res.status(400).json({ success: false, message: 'Cannot update status of a cancelled challan' });
    }

    // Transition: DRAFT -> CONFIRMED
    if (challan.status === ChallanStatus.DRAFT && targetStatus === ChallanStatus.CONFIRMED) {
      // Validate stock levels
      const productIds = challan.products.map((p) => p.productId);
      const dbProducts = await prisma.product.findMany({
        where: { id: { in: productIds } },
      });

      const productMap = new Map(dbProducts.map((p) => [p.id, p]));

      for (const item of challan.products) {
        const dbProduct = productMap.get(item.productId);
        if (!dbProduct) {
          return res.status(400).json({ success: false, message: `Product for snapshot '${item.nameSnapshot}' no longer exists in inventory.` });
        }
        if (dbProduct.currentStock < item.quantityOrdered) {
          return res.status(400).json({
            success: false,
            message: `Insufficient stock for product '${dbProduct.name}' (SKU: ${dbProduct.sku}). Available: ${dbProduct.currentStock}, Required: ${item.quantityOrdered}`,
          });
        }
      }

      // Execute transaction to update status, reduce stock, and log movement
      const updated = await prisma.$transaction(async (tx) => {
        const c = await tx.challan.update({
          where: { id },
          data: { status: ChallanStatus.CONFIRMED },
          include: { products: true },
        });

        for (const item of challan.products) {
          await tx.product.update({
            where: { id: item.productId },
            data: {
              currentStock: {
                decrement: item.quantityOrdered,
              },
            },
          });

          await tx.stockMovement.create({
            data: {
              productId: item.productId,
              quantityChanged: item.quantityOrdered,
              movementType: MovementType.OUT,
              reason: `Sales Challan ${challan.challanNumber} Confirmed`,
              createdById: req.user!.id,
            },
          });
        }

        return c;
      });

      return res.status(200).json({ success: true, message: 'Challan confirmed and stock reduced', data: updated });
    }

    // Transition: CONFIRMED -> CANCELLED
    if (challan.status === ChallanStatus.CONFIRMED && targetStatus === ChallanStatus.CANCELLED) {
      // Return stock to inventory and log movements
      const updated = await prisma.$transaction(async (tx) => {
        const c = await tx.challan.update({
          where: { id },
          data: { status: ChallanStatus.CANCELLED },
          include: { products: true },
        });

        for (const item of challan.products) {
          await tx.product.update({
            where: { id: item.productId },
            data: {
              currentStock: {
                increment: item.quantityOrdered,
              },
            },
          });

          await tx.stockMovement.create({
            data: {
              productId: item.productId,
              quantityChanged: item.quantityOrdered,
              movementType: MovementType.IN,
              reason: `Sales Challan ${challan.challanNumber} Cancelled (Restocked)`,
              createdById: req.user!.id,
            },
          });
        }

        return c;
      });

      return res.status(200).json({ success: true, message: 'Challan cancelled and items returned to stock', data: updated });
    }

    // Transition: DRAFT -> CANCELLED
    if (challan.status === ChallanStatus.DRAFT && targetStatus === ChallanStatus.CANCELLED) {
      // Just update status, no stock adjustment needed
      const updated = await prisma.challan.update({
        where: { id },
        data: { status: ChallanStatus.CANCELLED },
        include: { products: true },
      });

      return res.status(200).json({ success: true, message: 'Challan cancelled successfully', data: updated });
    }

    return res.status(400).json({ success: false, message: 'Invalid status transition' });
  } catch (error) {
    console.error('Update challan status error:', error);
    return res.status(500).json({ success: false, message: 'Internal server error' });
  }
}
