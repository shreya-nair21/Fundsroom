import { Response } from 'express';
import { AuthenticatedRequest } from '../middlewares/authMiddleware';
import prisma from '../utils/prisma';
import { z } from 'zod';
import { CustomerType, CustomerStatus } from '@prisma/client';

// Schema for customer input
const customerSchema = z.object({
  name: z.string().min(1, 'Name is required'),
  mobile: z.string().min(10, 'Mobile must be at least 10 digits'),
  email: z.string().email('Invalid email address'),
  businessName: z.string().min(1, 'Business name is required'),
  gstNumber: z.string().optional().nullable(),
  customerType: z.nativeEnum(CustomerType),
  address: z.string().min(1, 'Address is required'),
  status: z.nativeEnum(CustomerStatus),
  followUpDate: z.string().optional().nullable().transform(val => val ? new Date(val) : null),
  notes: z.string().optional().nullable(),
});

// Schema for follow-up note input
const followUpSchema = z.object({
  note: z.string().min(1, 'Note content is required'),
});

// List and search customers
export async function getCustomers(req: AuthenticatedRequest, res: Response) {
  try {
    const page = parseInt(req.query.page as string) || 1;
    const limit = parseInt(req.query.limit as string) || 10;
    const search = (req.query.search as string) || '';
    const status = (req.query.status as string) || '';
    const type = (req.query.type as string) || '';

    const skip = (page - 1) * limit;

    // Build filter query
    const where: any = {};

    if (search) {
      where.OR = [
        { name: { contains: search } },
        { email: { contains: search } },
        { businessName: { contains: search } },
        { mobile: { contains: search } },
      ];
    }

    if (status) {
      where.status = status as CustomerStatus;
    }

    if (type) {
      where.customerType = type as CustomerType;
    }

    const [customers, total] = await Promise.all([
      prisma.customer.findMany({
        where,
        skip,
        take: limit,
        orderBy: { createdAt: 'desc' },
      }),
      prisma.customer.count({ where }),
    ]);

    return res.status(200).json({
      success: true,
      data: customers,
      meta: {
        total,
        page,
        limit,
        totalPages: Math.ceil(total / limit),
      },
    });
  } catch (error) {
    console.error('Get customers error:', error);
    return res.status(500).json({ success: false, message: 'Internal server error' });
  }
}

// Get single customer detail (includes followUps)
export async function getCustomerById(req: AuthenticatedRequest, res: Response) {
  try {
    const id = parseInt(req.params.id as string);
    if (isNaN(id)) {
      return res.status(400).json({ success: false, message: 'Invalid customer ID' });
    }

    const customer = await prisma.customer.findUnique({
      where: { id },
      include: {
        followUps: {
          orderBy: { createdAt: 'desc' },
          include: {
            createdBy: {
              select: { id: true, name: true, role: true },
            },
          },
        },
        challans: {
          orderBy: { createdAt: 'desc' },
          select: { id: true, challanNumber: true, status: true, totalQuantity: true, createdAt: true },
        },
      },
    });

    if (!customer) {
      return res.status(404).json({ success: false, message: 'Customer not found' });
    }

    return res.status(200).json({ success: true, data: customer });
  } catch (error) {
    console.error('Get customer detail error:', error);
    return res.status(500).json({ success: false, message: 'Internal server error' });
  }
}

// Add customer
export async function createCustomer(req: AuthenticatedRequest, res: Response) {
  try {
    const parseResult = customerSchema.safeParse(req.body);
    if (!parseResult.success) {
      return res.status(400).json({
        success: false,
        message: 'Validation failed',
        errors: parseResult.error.flatten().fieldErrors,
      });
    }

    const customer = await prisma.customer.create({
      data: parseResult.data,
    });

    return res.status(201).json({ success: true, message: 'Customer added successfully', data: customer });
  } catch (error) {
    console.error('Create customer error:', error);
    return res.status(500).json({ success: false, message: 'Internal server error' });
  }
}

// Edit customer
export async function updateCustomer(req: AuthenticatedRequest, res: Response) {
  try {
    const id = parseInt(req.params.id as string);
    if (isNaN(id)) {
      return res.status(400).json({ success: false, message: 'Invalid customer ID' });
    }

    const parseResult = customerSchema.safeParse(req.body);
    if (!parseResult.success) {
      return res.status(400).json({
        success: false,
        message: 'Validation failed',
        errors: parseResult.error.flatten().fieldErrors,
      });
    }

    const existingCustomer = await prisma.customer.findUnique({ where: { id } });
    if (!existingCustomer) {
      return res.status(404).json({ success: false, message: 'Customer not found' });
    }

    const customer = await prisma.customer.update({
      where: { id },
      data: parseResult.data,
    });

    return res.status(200).json({ success: true, message: 'Customer updated successfully', data: customer });
  } catch (error) {
    console.error('Update customer error:', error);
    return res.status(500).json({ success: false, message: 'Internal server error' });
  }
}

// Add follow-up note
export async function addFollowUp(req: AuthenticatedRequest, res: Response) {
  try {
    const id = parseInt(req.params.id as string);
    if (isNaN(id)) {
      return res.status(400).json({ success: false, message: 'Invalid customer ID' });
    }

    const parseResult = followUpSchema.safeParse(req.body);
    if (!parseResult.success) {
      return res.status(400).json({
        success: false,
        message: 'Validation failed',
        errors: parseResult.error.flatten().fieldErrors,
      });
    }

    const customer = await prisma.customer.findUnique({ where: { id } });
    if (!customer) {
      return res.status(404).json({ success: false, message: 'Customer not found' });
    }

    const followUp = await prisma.followUp.create({
      data: {
        customerId: id,
        note: parseResult.data.note,
        createdById: req.user!.id,
      },
      include: {
        createdBy: {
          select: { id: true, name: true, role: true },
        },
      },
    });

    return res.status(201).json({ success: true, message: 'Follow-up note added', data: followUp });
  } catch (error) {
    console.error('Add follow up note error:', error);
    return res.status(500).json({ success: false, message: 'Internal server error' });
  }
}
