import { prisma } from '@/lib/prisma'
// import { cookies } from 'next/headers'
import { redirect } from 'next/navigation'

// Utility to verify admin permissions
async function verifyAdminPermissions(requiredPermission: string, adminId: string) {
  
  if (!adminId) {
    redirect('/login')
  }

  const admin = await prisma.user.findUnique({
    where: { 
      id: adminId,
      role: 'ADMIN' 
    },
    include: {
      adminActions: {
        where: {
          actionType: requiredPermission as any
        }
      }
    }
  })

  if (!admin || admin.adminActions.length === 0) {
    throw new Error('Insufficient permissions')
  }

  return admin
}

// Listing Approval
export async function approveListing(listingId: string, adminId: string) {
  await verifyAdminPermissions('LISTING_MANAGEMENT', adminId)

  return prisma.listing.update({
    where: { id: listingId },
    data: { 
      approved: 'APPROVED',
      updatedAt: new Date()
    }
  })
}

// Listing Update Request Creation
export async function createListingUpdateRequest(
  listingId: string, 
  partnerId: string, 
  requestedChanges: Record<string, any>
) {
  
  if (!partnerId) {
    redirect('/login')
  }

  return prisma.listingModificationRequest.create({
    data: {
      listingId,
      partnerId,
      requestedChanges,
      status: 'PENDING'
    }
  })
}

// Listing Deletion
export async function deleteListing(listingId: string, partnerId: string) {
  
  if (!partnerId) {
    redirect('/login')
  }

  // Check for pending bookings
  const pendingBookings = await prisma.booking.count({
    where: { 
      listingId, 
      status: 'PENDING' 
    }
  })

  if (pendingBookings > 0) {
    throw new Error('Cannot delete listing with pending bookings')
  }

  // Cascade delete related records
  await prisma.$transaction([
    prisma.review.deleteMany({ where: { listingId } }),
    prisma.wishlist.deleteMany({ where: { listingId } }),
    prisma.partnerAction.deleteMany({ where: { listingId } }),
    prisma.listingModificationRequest.deleteMany({ where: { listingId } }),
    prisma.listing.delete({ where: { id: listingId } })
  ])
}

// Listing Update by Admin
export async function updateListingByAdmin(
  listingId: string, 
  updateData: Record<string, any>, 
  adminId: string,
  modificationRequestId?: string
) {
  await verifyAdminPermissions('LISTING_MANAGEMENT', adminId)

  return prisma.$transaction(async (tx) => {
    // Update listing
    const updatedListing = await tx.listing.update({
      where: { id: listingId },
      data: updateData
    })

    // Update modification request if exists
    if (modificationRequestId) {
      await tx.listingModificationRequest.update({
        where: { id: modificationRequestId },
        data: { 
          status: 'APPROVED',
          adminNotes: 'Changes approved and applied',
          updatedAt: new Date()
        }
      })
    }

    return updatedListing
  })
}

// Reject Listing
export async function rejectListing(listingId: string, adminId: string, reason?: string,) {
  await verifyAdminPermissions('LISTING_MANAGEMENT', adminId)

  return prisma.listing.update({
    where: { id: listingId },
    data: { 
      approved: 'REJECTED',
      updatedAt: new Date()
    }
  })
}
