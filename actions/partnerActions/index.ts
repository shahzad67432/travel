"use server"

// fetch partner details -> calculate analytics and return
// create partner
// admin-action -> Assign partner a related category.


// 1. partnerActions: create an operator and then admin can update and delete so
// 2. AdminAction -> partnerOnboard -> partnerCategories -> partnerCommision -> partnerPermissions
// sending emails -> if necessary, or present in the requested documentation.

import { prisma } from "@/lib/prisma"
import { PartnerType, UserRole } from "@prisma/client"
import { PartnerCreationPayload, PartnerValidationSchemas } from "../types/partnerTypes"



export async function initiatePartnerOnboarding(payload: PartnerCreationPayload) {
    // Validate partner data based on type
    const partnerSchema = PartnerValidationSchemas[payload.partnerType]
    const validationResult = partnerSchema.safeParse(payload.partnerSpecificData)
    
    if (!validationResult.success) {
      throw new Error(validationResult.error.errors[0].message)
    }
  
    // Ensure payoutDetails is a valid JSON object or undefined
    const partnerData = {
      ...payload.partnerSpecificData,
      payoutDetails: payload.partnerSpecificData.payoutDetails 
        ? JSON.parse(JSON.stringify(payload.partnerSpecificData.payoutDetails)) 
        : undefined
    }
  
    // Create user with pending partner
    const partner = await prisma.user.update({
      where: { email: payload.userData.email },
      data: {
        role: UserRole.PARTNER,
        partner: {
          create: {
            ...partnerData,
            partnerType: payload.partnerType,
            email: payload.userData.email,
            verificationStatus: "PENDING"
          }
        }
      },
      include: { partner: true }
    })
  }