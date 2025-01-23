"use server"

import { prisma } from "@/lib/prisma"
import { 
    AdminActionType,
    CategoryEnum, 
    PartnerType, 
    TourThemeType 
  } from "@prisma/client"
  import z from 'zod';

// 1. admin created the -> category, subcategory, tour types (that partner can select) and tour theme -> (partner can select)
// 2. admin upserted the -> category, subcategory for the partner.
// sending emails -> if necessary, or present in the requested documentation.

// update the status of the partner ie;- reject or approve the partner
export const updatePartnerVerificationStatus = async (
    adminId: string, 
    partnerId: string, 
    status: "APPROVED" | "REJECTED"
  ) => {
    // Verify admin is Super Admin or has permission
    const admin = await prisma.user.findUnique({
      where: { id: adminId }
    })
  
    if (admin?.role !== "SUPER_ADMIN") {
      const adminAction = await prisma.adminAction.findFirst({
        where: {
          adminId,
          actionType: "PARTNER_APPROVAL" || "PARTNER_MANAGEMENT"
        }
      })
  
      if (!adminAction) {
        throw new Error("Not authorized to update partner status")
      }
    }
  
    // Update partner verification status
    const updatedPartner = await prisma.partner.update({
      where: { id: partnerId },
      data: { 
        verificationStatus: status,
        ...(status === "APPROVED" && {})
      }
    })
    return updatedPartner;
  }

// update the partner comission -> admin or super_admin
export const updatePartnerCommision = async (
    adminId: string, 
    partnerId: string, 
    commission: number, // percenttage => commision -> 5%
  ) => {
    // Verify admin is Super Admin or has permission
    const admin = await prisma.user.findUnique({
      where: { id: adminId }
    })
  
    if (admin?.role !== "SUPER_ADMIN") {
      const adminAction = await prisma.adminAction.findFirst({
        where: {
          adminId,
          actionType: "PARTNER_MANAGEMENT"
        }
      })
  
      if (!adminAction) {
        throw new Error("Not authorized to update partner status")
      }
    }
  
    // Update partner verification status
    const updatedPartner = await prisma.partner.update({
      where: { id: partnerId },
      data: { 
        commission: commission,
      }
    })
    return updatedPartner;
  }

//   update the partner categories and sub-categories;

// Category Creation Schema
const CategoryCreationSchema = z.object({
  name: z.string().min(2, "Category name is required"),
  enumName: z.nativeEnum(CategoryEnum),
  description: z.string().optional()
})

// Sub-Category Creation Schema
const SubCategoryCreationSchema = z.object({
  categoryId: z.string(),
  name: z.string().min(2, "Sub-category name is required"),
  description: z.string().optional(),
  requiredFields: z.record(z.string(), z.any()).optional()
})

// Tour Type Creation Schema
const TourTypeCreationSchema = z.object({
  name: z.string().min(2, "Tour type name is required"),
  description: z.string().optional()
})

// Tour Theme Creation Schema
const TourThemeCreationSchema = z.object({
  name: z.nativeEnum(TourThemeType),
  description: z.string().optional()
})

// Category Permission Update Schema
const CategoryPermissionUpdateSchema = z.object({
  partnerId: z.string(),
  categoryId: z.string().optional(),
  subCategoryIds: z.array(z.string()).optional(),
  tourTypeIds: z.array(z.string()).optional(),
  tourThemeIds: z.array(z.string()).optional()
})

// Admin-only Category Management Actions
export async function createCategory(
  adminId: string, 
  data: z.infer<typeof CategoryCreationSchema>
) {
  // Validate admin permissions
  await validateAdminPermission(adminId, "CATEGORY_MANAGEMENT")

  // Create category
  const category = await prisma.category.create({ data })

  return category
}

export async function createSubCategory(
  adminId: string, 
  data: z.infer<typeof SubCategoryCreationSchema>
) {
  // Validate admin permissions
  await validateAdminPermission(adminId, "CATEGORY_MANAGEMENT")

  // Create sub-category
  const subCategory = await prisma.subCategory.create({ 
    data: {
      categoryId: data.categoryId,
      name: data.name,
      description: data.description,
      requiredFields: data.requiredFields || {}
    } 
  })
  return subCategory
}

export async function createTourType(
  adminId: string, 
  data: z.infer<typeof TourTypeCreationSchema>
) {
  // Validate admin permissions
  await validateAdminPermission(adminId, "CATEGORY_MANAGEMENT")

  // Create tour type
  const tourType = await prisma.tourType.create({ data })

  return tourType
}

export async function createTourTheme(
  adminId: string, 
  data: z.infer<typeof TourThemeCreationSchema>
) {
  // Validate admin permissions
  await validateAdminPermission(adminId, "CATEGORY_MANAGEMENT")

  // Create tour theme
  const tourTheme = await prisma.tourTheme.create({ data })

  return tourTheme
}

export async function updatePartnerCategories(
  adminId: string, 
  data: z.infer<typeof CategoryPermissionUpdateSchema>
) {
  // Validate admin permissions
  await validateAdminPermission(adminId, "CATEGORY_MANAGEMENT")

  // Find existing category permission or create new
  const existingPermission = await prisma.categoryPermission.findUnique({
    where: { 
      partnerId_categoryId: {
        partnerId: data.partnerId,
        categoryId: data.categoryId || ''
      }
    }
  })

  // Update or create category permission
  const updatedPermission = await prisma.categoryPermission.upsert({
    where: { 
      id: existingPermission?.id || undefined,
      partnerId_categoryId: {
        partnerId: data.partnerId,
        categoryId: data.categoryId || ''
      }
    },
    update: {
      subCategories: data.subCategoryIds 
        ? { set: data.subCategoryIds.map(id => ({ id })) } 
        : undefined,
      tourTypes: data.tourTypeIds
        ? { set: data.tourTypeIds.map(id => ({ id })) }
        : undefined,
      tourThemes: data.tourThemeIds
        ? { set: data.tourThemeIds.map(id => ({ id })) }
        : undefined
    },
    create: {
      partnerId: data.partnerId,
      categoryId: data.categoryId || '',
      subCategories: { 
        connect: data.subCategoryIds?.map(id => ({ id })) 
      },
      tourTypes: {
        connect: data.tourTypeIds?.map(id => ({ id }))
      },
      tourThemes: {
        connect: data.tourThemeIds?.map(id => ({ id }))
      }
    }
  })

  return updatedPermission
}

// Helper function to validate admin permission
async function validateAdminPermission(adminId: string, actionType: AdminActionType) {
  const admin = await prisma.user.findUnique({
    where: { id: adminId }
  })

  if (admin?.role !== "SUPER_ADMIN") {
    const adminAction = await prisma.adminAction.findFirst({
      where: {
        adminId,
        actionType
      }
    })

    if (!adminAction) {
      throw new Error("Not authorized to perform this action")
    }
  }
}