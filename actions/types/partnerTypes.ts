import { z } from "zod"
import { PartnerType } from "@prisma/client"

// Base validation for common fields
const BasePartnerSchema = z.object({
  businessName: z.string().min(2, "Business name is required"),
  contactPerson: z.string().min(2, "Contact person name is required"),
  phoneNumber: z.string().min(10, "Invalid phone number"),
  
  // Make these truly optional
  regionsOperated: z.array(z.string()).optional(),
  servicesOffered: z.array(z.string()).optional(),
  
  // Optional social and contact links
  website: z.string().url().optional(),
  facebookLink: z.string().url().optional(),
  instagramLink: z.string().url().optional(),
  
  // Optional logo and payout details
  logoUrl: z.string().url().optional(),
  payoutDetails: z.record(z.string(), z.unknown()).optional()
})

// Hotel Partner Schema
const HotelPartnerSchema = BasePartnerSchema.extend({
  yearEstablished: z.number().int().min(1800).optional(), // Fixed typo, added validation
  hotelType: z.string().optional(),
  location: z.string().optional(),
  whatsappNo: z.string().optional(), // Changed from number to string
  maxOccupancy: z.number().int().optional(),
  hotelPolicy: z.string().optional(),
  totalRooms: z.number().int().min(1, "Number of rooms is required"),
  amenities: z.array(z.string()).optional() // Made optional
})

// Tour Operator Schema
const TourOperatorPartnerSchema = BasePartnerSchema.extend({
  dtsLicenseNo: z.string().optional(),
  officeAddress: z.string().optional(),
  operatingCity: z.string().optional(),
  caterInternational: z.boolean().default(false),
  organizeTreks: z.boolean().optional(),
  toursEachMonth: z.number().int().optional(),
  tourTypes: z.array(z.string()).optional(), // Made optional
  tourTheme: z.string().optional(),
  specializations: z.array(z.string()).optional()
})

// Activity Provider Schema
const ActivityProviderPartnerSchema = BasePartnerSchema.extend({
  yearEstablished: z.number().int().min(1800).optional(), // Fixed typo
  officeAddress: z.string().optional(),
  licenseNo: z.string().optional(),
  activityTypes: z.array(z.string()).optional() // Made optional
})

// Vehicle Rental Schema
const VehicleRentalPartnerSchema = BasePartnerSchema.extend({
  yearEstablished: z.number().int().min(1800).optional(), // Fixed typo
  businessRegistrationNo: z.string().optional(),
  officeAddress: z.string().optional(),
  vehicleTypes: z.array(z.string()).optional(), // Made optional
  vehicleCount: z.number().int().optional(), // Removed min validation
  pickupAddress: z.string().optional(),
  rentalPolicy: z.string().optional(),
  depositRequirements: z.string().optional()
})

// Tour Guide Schema
const TourGuidePartnerSchema = BasePartnerSchema.extend({
  languages: z.array(z.string()).optional(), // Made optional
  specializations: z.array(z.string()).optional(),
  certificates: z.array(z.string()).optional(),
  yearsOfExperience: z.number().int().optional()
})

// Validation Schemas mapping
export const PartnerValidationSchemas = {
  [PartnerType.HOTEL]: HotelPartnerSchema,
  [PartnerType.OPERATOR]: TourOperatorPartnerSchema,
  [PartnerType.ACTIVITY_PROVIDER]: ActivityProviderPartnerSchema,
  [PartnerType.RENTAL_PROVIDERS]: VehicleRentalPartnerSchema,
  [PartnerType.TOUR_GUIDE]: TourGuidePartnerSchema
}

// Type inference
export type HotelPartnerData = z.infer<typeof HotelPartnerSchema>
export type TourOperatorPartnerData = z.infer<typeof TourOperatorPartnerSchema>
export type ActivityProviderPartnerData = z.infer<typeof ActivityProviderPartnerSchema>
export type VehicleRentalPartnerData = z.infer<typeof VehicleRentalPartnerSchema>
export type TourGuidePartnerData = z.infer<typeof TourGuidePartnerSchema>

// Partner Creation Payload
export interface PartnerCreationPayload {
  partnerType: PartnerType
  userData: {
    name: string
    email: string
  }
  partnerSpecificData:
    | HotelPartnerData
    | TourOperatorPartnerData
    | ActivityProviderPartnerData
    | VehicleRentalPartnerData
    | TourGuidePartnerData
}