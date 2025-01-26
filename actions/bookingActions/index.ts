import { z } from 'zod'
import { revalidatePath } from 'next/cache'
import { BookingStatus } from '@prisma/client'
import { prisma } from '@/lib/prisma'

// Booking Creation 
export async function createBooking(
  userId: string, 
  listingId: string, 
  bookingDetails: {
    bookingType: 'Group' | 'Private', 
    groupSize?: number, 
    bookingDates: Record<string, any>
  }
) {
  try {
    // Validate user exists
    const userExists = await prisma.user.findUnique({ 
      where: { id: userId } 
    })
    if (!userExists) {
      throw new Error('User not found')
    }

    // Fetch listing to get partner and pricing
    const listing = await prisma.listing.findUnique({
      where: { id: listingId },
      select: { 
        price: true, 
        partnerId: true 
      }
    })

    if (!listing || !listing.price) {
      throw new Error('Listing not found')
    }

    // Calculate total amount (simplified)
    const totalAmount = typeof listing.price === 'string' 
    ? JSON.parse(listing.price).basePrice 
    : (listing.price as { basePrice: number }).basePrice ?? 0

    // Create booking
    const booking = await prisma.booking.create({
      data: {
        listingId,
        travelerId: userId,
        partnerId: listing.partnerId,
        bookingType: bookingDetails.bookingType,
        groupSize: bookingDetails.groupSize,
        totalAmount,
        bookingDates: bookingDetails.bookingDates,
        status: 'PENDING',
        paymentStatus: 'PENDING'
      }
    })

    revalidatePath(`/bookings/${booking.id}`)
    revalidatePath('/bookings')

    return { 
      success: true, 
      bookingId: booking.id 
    }
  } catch (error) {
    console.error('Booking creation error:', error)
    return { 
      success: false, 
      error: error instanceof Error ? error.message : 'An unexpected error occurred' 
    }
  }
}

export async function updatePaymentStatus(bookingid:string, userId:string ){

}

// Update Booking Status by Partner
export async function updateBookingStatus(
  partnerId: string, 
  bookingId: string, 
  status: BookingStatus
) {
  try {
    // Verify partner ownership of booking
    const booking = await prisma.booking.findFirst({
      where: { 
        id: bookingId,
        partnerId 
      }
    })

    if (!booking) {
      throw new Error('Booking not found or unauthorized')
    }

    // Validate status
    const validStatuses: BookingStatus[] = ['PENDING', 'CONFIRMED', 'COMPLETED']
    if (!validStatuses.includes(status)) {
      throw new Error('Invalid status')
    }

    // Update booking
    const updatedBooking = await prisma.booking.update({
      where: { id: bookingId },
      data: { 
        status,
        updatedAt: new Date()
      }
    })

    revalidatePath(`/bookings/${bookingId}`)
    revalidatePath('/partner/bookings')

    return { 
      success: true, 
      booking: updatedBooking 
    }
  } catch (error) {
    console.error('Booking status update error:', error)
    return { 
      success: false, 
      error: error instanceof Error ? error.message : 'An unexpected error occurred' 
    }
  }
}

// Cancel Booking
export async function cancelBooking(
  userId: string, 
  bookingId: string
) {
  try {
    // Find booking and check if cancellation is allowed
    const booking = await prisma.booking.findFirst({
      where: { 
        id: bookingId, 
        travelerId: userId 
      }
    })

    if (!booking) {
      throw new Error('Booking not found')
    }

    // Business logic for cancellation
    if (booking.status === 'COMPLETED' || booking.status === 'CANCELLED') {
      throw new Error('Booking cannot be cancelled')
    }

    // Update booking status
    const cancelledBooking = await prisma.booking.update({
      where: { id: bookingId },
      data: { 
        status: 'CANCELLED',
        paymentStatus: 'REFUNDED'
      }
    })

    // Create a notification for the partner
    await prisma.notification.create({
      data: {
        recipientId: booking.partnerId,
        title: 'Booking Cancellation',
        content: `Booking ${bookingId} has been cancelled by the traveler`,
        type: 'BOOKING_UPDATE'
      }
    })

    revalidatePath(`/bookings/${bookingId}`)
    revalidatePath('/bookings')

    return { 
      success: true, 
      booking: cancelledBooking 
    }
  } catch (error) {
    console.error('Booking cancellation error:', error)
    return { 
      success: false, 
      error: error instanceof Error ? error.message : 'An unexpected error occurred' 
    }
  }
}

// Create Review
export async function createReview(
  userId: string, 
  bookingId: string, 
  reviewData: {
    rating: number,
    comment: string,
    title?: string
  }
) {
  try {
    // Find booking to get listing and partner details
    const booking = await prisma.booking.findFirst({
      where: { 
        id: bookingId,
        travelerId: userId 
      },
      select: {
        listingId: true,
        partnerId: true
      }
    })

    if (!booking) {
      throw new Error('Booking not found')
    }

    // Create review
    const review = await prisma.review.create({
      data: {
        listingId: booking.listingId,
        partnerId: booking.partnerId,
        travelerId: userId,
        rating: reviewData.rating,
        comment: reviewData.comment,
        title: reviewData.title,
        isVerified: true
      }
    })

    // Create a notification for the partner
    await prisma.notification.create({
      data: {
        recipientId: booking.partnerId,
        title: 'New Review Received',
        content: `A new review has been submitted for your listing`,
        type: 'REVIEW_RECEIVED'
      }
    })

    revalidatePath(`/bookings/${bookingId}/review`)
    revalidatePath('/reviews')

    return { 
      success: true, 
      review 
    }
  } catch (error) {
    console.error('Review creation error:', error)
    return { 
      success: false, 
      error: error instanceof Error ? error.message : 'An unexpected error occurred' 
    }
  }
}

// Create Message
export async function createMessage(
  senderId: string, 
  bookingId: string, 
  content: string
) {
  try {
    // Verify booking exists and user is associated
    const booking = await prisma.booking.findFirst({
      where: { 
        id: bookingId,
        OR: [
          { travelerId: senderId },
          { partnerId: senderId }
        ]
      }
    })

    if (!booking) {
      throw new Error('Booking not found or unauthorized')
    }

    // Create message
    const message = await prisma.message.create({
      data: {
        bookingId,
        senderId,
        content,
        isRead: false
      }
    })

    // Create a notification for the recipient
    const recipientId = booking.travelerId === senderId 
      ? booking.partnerId 
      : booking.travelerId

    await prisma.notification.create({
      data: {
        recipientId,
        title: 'New Message',
        content: 'You have a new message',
        type: 'SYSTEM'
      }
    })

    revalidatePath(`/bookings/${bookingId}/messages`)

    return { 
      success: true, 
      message 
    }
  } catch (error) {
    console.error('Message creation error:', error)
    return { 
      success: false, 
      error: error instanceof Error ? error.message : 'An unexpected error occurred' 
    }
  }
}