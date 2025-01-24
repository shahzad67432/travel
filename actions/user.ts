// chnage the password.

"use server"
import { transporter } from "@/lib/email-service"
import { prisma } from "@/lib/prisma"
import bcrypt from "bcryptjs"
import { z } from "zod"

// Validation schema
const PasswordResetSchema = z.object({
  email: z.string().email(),
  otp: z.string().length(6),
  newPassword: z.string().min(8, "Password must be at least 8 characters")
})

// Temporary OTP storage (use Redis in production)
const otpStorage: Record<string, { otp: string, expiresAt: Date }> = {}

export async function generatePasswordResetOTP(email: string) {
  // Generate 6-digit OTP
  const otp = Math.floor(100000 + Math.random() * 900000).toString()
  
  // Store OTP with expiration
  otpStorage[email] = {
    otp,
    expiresAt: new Date(Date.now() + 10 * 60 * 1000) // 10 minutes
  }

  // TODO: Implement email sending logic (Mailgun/Mailchimp) -> DONE
  await transporter.sendMail({
    from: process.env.EMAIL_FROM,
    to: email,
    subject: 'Your Authentication OTP',
    text: `Your OTP is: ${otp}. It will expire in 10 minutes.`
  })
  console.log(`OTP for ${email}: ${otp}`)

  return { success: true, message: "OTP generated" }
}

export async function resetPassword(formData: FormData) {
  try {
    // Validate input
    const data = {
      email: formData.get('email') as string,
      otp: formData.get('otp') as string,
      newPassword: formData.get('newPassword') as string
    }

    // Validate data
    const validatedData = PasswordResetSchema.parse(data)

    // Check OTP
    const otpRecord = otpStorage[validatedData.email]
    if (!otpRecord || 
        otpRecord.otp !== validatedData.otp || 
        otpRecord.expiresAt < new Date()) {
      return { success: false, message: "Invalid or expired OTP" }
    }

    // Find user
    const user = await prisma.user.findUnique({
      where: { email: validatedData.email }
    })

    if (!user) {
      return { success: false, message: "User not found" }
    }

    // Hash new password
    const hashedPassword = await bcrypt.hash(validatedData.newPassword, 10)

    // Update password in database
    await prisma.user.update({
      where: { email: validatedData.email },
      data: { password: hashedPassword }
    })

    // Clear OTP
    delete otpStorage[validatedData.email]

    return { success: true, message: "Password reset successful" }
  } catch (error) {
    console.error("Password reset error:", error)
    return { 
      success: false, 
      message: error instanceof z.ZodError 
        ? "Invalid input" 
        : "Password reset failed" 
    }
  }
}