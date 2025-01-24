// create listings verifying the partner access for that category and sub-cat
// verifying the partner access for that specific listing type (group, both, international,,,)
// verify if the partner selected values and values he is allowed are correct or not.
// getting the cordinates from the location as location is zip code:

import { 
    PrismaClient, 
    Listing, 
    Partner, 
    PartnerType, 
    FOR_CUSTOMER, 
    listingApprovedStatus 
  } from '@prisma/client'
  import { S3Client, PutObjectCommand } from "@aws-sdk/client-s3"
  import sharp from "sharp"
  import { v4 as uuidv4 } from "uuid"
  
  // Image Upload Functions
  async function processAndUploadImages(
    s3Client: S3Client, 
    bucketName: string, 
    files: Express.Multer.File[]
  ): Promise<string[]> {
    const processedUrls: string[] = []
  
    for (const file of files) {
      // Validate file size (5MB limit)
      if (file.size > 5 * 1024 * 1024) {
        throw new Error(`Image ${file.originalname} exceeds 5MB limit`)
      }
  
      // Process image
      const processedImage = await sharp(file.buffer)
        .resize({ 
          width: 1920, 
          height: 1080, 
          fit: 'inside' 
        })
        .webp({ quality: 80 })
        .toBuffer()
  
      // Upload to S3
      const uniqueFileName = `listings/${uuidv4()}.webp`
      const uploadParams = {
        Bucket: bucketName,
        Key: uniqueFileName,
        Body: processedImage,
        ContentType: 'image/webp'
      }
  
      await s3Client.send(new PutObjectCommand(uploadParams))
      processedUrls.push(`https://${bucketName}.s3.amazonaws.com/${uniqueFileName}`)
    }
  
    return processedUrls
  }
  
  function validateCustomerTypeAccess(partner: Partner, customerType?: FOR_CUSTOMER): void {
    const customerTypeMap = {
      'LOCAL': !partner.allowInternational,
      'INTERNATIONAL': partner.allowInternational,
      'BOTH': partner.allowInternational
    }
  
    if (customerType && !customerTypeMap[customerType]) {
      throw new Error(`Unauthorized customer type: ${customerType}`)
    }
  }
  
  function validateTourRestrictions(partner: Partner, listingData: Partial<Listing>): void {
    if (listingData.Type === 'group' && !partner.groupTourAccess) {
      throw new Error('Group tours not allowed')
    }
    if (listingData.Type === 'private' && !partner.privateTourAccess) {
      throw new Error('Private tours not allowed')
    }
  }
  
  function validateCategoryPermissions(partner: any, listingData: Partial<Listing>): void {
    const categoryPermission = partner.permissions.find(
      (perm:any) => perm.categoryId === listingData.categoryId
    )
  
    if (!categoryPermission) {
      throw new Error('No permission for this category')
    }
  
    // Subcategory validation if applicable
    if (listingData.subCategoryId) {
      const hasSubCategoryPermission = categoryPermission.subCategories.some(
        (sc:any) => sc.id === listingData.subCategoryId
      )
  
      if (!hasSubCategoryPermission) {
        throw new Error('No permission for selected subcategory')
      }
    }
  }
  
  // Comprehensive Listing Validation
  function validateListingCreation(partner: Partner, listingData: Partial<Listing>): void {
    validateCustomerTypeAccess(partner, listingData.For)
    validateTourRestrictions(partner, listingData)
    validateCategoryPermissions(partner, listingData)
  }
  
  // Listing Creation Function
  async function createListing(
    partnerId: string, 
    listingPayload: Partial<Listing>, 
    images: Express.Multer.File[]
  ): Promise<Listing> {
    const prisma = new PrismaClient()
    const s3Client = new S3Client({ region: process.env.AWS_REGION })
  
    try {
      // Fetch partner to validate permissions
      const partner = await prisma.partner.findUnique({
        where: { id: partnerId },
        include: { permissions: true }
      })
  
      if (!partner) {
        throw new Error('Partner not found')
      }
  
      // Validate listing creation
      validateListingCreation(partner, listingPayload)
  
      // Upload images
      const imageUrls = await processAndUploadImages(
        s3Client, 
        process.env.S3_BUCKET_NAME!, 
        images
      )
  
      // Create listing
      const listing = await prisma.listing.create({
        // TODO: remove the @ts-ignore and use the actual types for each type of listing.
        // @ts-ignore
        data: {
          ...listingPayload,
          partnerId,
          images: imageUrls,
          approved: 'PENDING',
          createdAt: new Date(),
          updatedAt: new Date()
        }
      })
  
      return listing
    } catch (error:any) {
      console.error('Listing creation error:', error)
      throw new Error(error.message || 'Failed to create listing')
    } finally {
      await prisma.$disconnect()
    }
  }
  
  export {
    createListing,
    processAndUploadImages,
    validateListingCreation
  }

