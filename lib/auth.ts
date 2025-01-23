import { NextAuthOptions } from "next-auth"
import CredentialsProvider from "next-auth/providers/credentials"
import bcrypt from "bcryptjs"
import { prisma } from "./prisma"
import nodemailer from "nodemailer"
import crypto from "crypto"

// Define custom types for authentication
type AuthUser = {
  id: string
  email: string
  name: string
  role: string
}

// OTP storage type
type OTPRecord = {
  email: string
  otp: string
  expiresAt: Date
}

// Temporary in-memory OTP storage (replace with Redis or database in production)
const otpStorage: Record<string, OTPRecord> = {}

// Generate a 6-digit OTP
const transporter = nodemailer.createTransport({
    host: "smtp.mandrillapp.com",
    port: 587,
    auth: {
      user: process.env.MAILCHIMP_USERNAME,
      pass: process.env.MAILCHIMP_API_KEY
    }
  })
  
  // Generate 6-digit OTP
  function generateOTP(): string {
    return Math.floor(100000 + Math.random() * 900000).toString()
  }
  
  // Send OTP via Mailchimp
  async function sendOTPEmail(email: string, otp: string) {
    await transporter.sendMail({
      from: process.env.EMAIL_FROM,
      to: email,
      subject: 'Your Authentication OTP',
      text: `Your OTP is: ${otp}. It will expire in 10 minutes.`
    })
  }

export const authOptions: NextAuthOptions = {
  providers: [
    CredentialsProvider({
      name: "credentials",
      credentials: {
        email: { label: "Email", type: "email" },
        password: { label: "Password", type: "password" },
        name: { label: "Name", type: "text" },
        isSignUp: { label: "Is Signup", type: "text" },
        otp: { label: "OTP", type: "text" },
        otpRequest: { label: "OTP Request", type: "text" }
      },
      async authorize(credentials: any): Promise<AuthUser | null> {
        if (!credentials?.email) {
          throw new Error("Email is required")
        }

        // Handle OTP Request
        if (credentials.otpRequest === "true") {
          const otp = generateOTP()
          const expiresAt = new Date(Date.now() + 10 * 60 * 1000) // 10 minutes

          // Store OTP
          otpStorage[credentials.email] = {
            email: credentials.email,
            otp,
            expiresAt
          }

          // Send OTP via email
          await sendOTPEmail(credentials.email, otp)

          // Return null as this is just an OTP request
          return null
        }

        // OTP Verification for Sign Up or Sign In
        if (credentials.otp) {
          const otpRecord = otpStorage[credentials.email]

          // Validate OTP
          if (!otpRecord || 
              otpRecord.otp !== credentials.otp || 
              otpRecord.expiresAt < new Date()) {
            throw new Error("Invalid or expired OTP")
          }

          // Clear OTP after successful verification
          delete otpStorage[credentials.email]

          // Find or create user based on sign-up/sign-in context
          if (credentials.isSignUp === "true") {
            // Sign Up Flow
            if (!credentials.name) {
              throw new Error("Name is required for registration")
            }

            const existingAccount = await prisma.user.findUnique({
              where: { email: credentials.email }
            })

            if (existingAccount) {
              throw new Error("Email already registered")
            }

            const hashedPassword = await bcrypt.hash(credentials.password, 10)
            const newUser = await prisma.user.create({
              data: {
                email: credentials.email,
                name: credentials.name,
                password: hashedPassword,
                role: "TRAVELER"
              }
            })

            return {
              id: newUser.id,
              email: newUser.email,
              name: newUser.name,
              role: newUser.role
            }
          } else {
            // Sign In Flow
            const existingAccount = await prisma.user.findUnique({
              where: { email: credentials.email }
            })

            if (!existingAccount) {
              throw new Error("No account found with this email")
            }

            const isPasswordValid = await bcrypt.compare(
              credentials.password,
              existingAccount.password
            )

            if (!isPasswordValid) {
              throw new Error("Invalid password")
            }

            return {
              id: existingAccount.id,
              email: existingAccount.email,
              name: existingAccount.name,
              role: existingAccount.role
            }
          }
        }

        // Default case for password-only authentication
        if (!credentials?.password) {
          throw new Error("Password is required")
        }

        throw new Error("OTP verification required")
      },
    }),
  ],
  callbacks: {
    async jwt({ token, user }) {
      if (user) {
        const authUser = user as AuthUser
        return {
          ...token,
          id: authUser.id,
          email: authUser.email,
          name: authUser.name,
          role: authUser.role
        }
      }

      return {
        ...token,
        id: token.id || "",
        email: token.email || "",
        name: token.name || "",
        role: token.role || ""
      }
    },
    async session({ token, session }) {
      return {
        ...session,
        user: {
          id: token.id,
          email: token.email,
          name: token.name,
          role: token.role
        },
      }
    },
  },
  pages: {
    signIn: "/signin",
  },
  session: {
    strategy: "jwt",
  },
  secret: process.env.NEXTAUTH_SECRET,
  debug: process.env.NODE_ENV === "development",
}

// Type declarations remain the same as in the original code
declare module "next-auth" {
  interface Session {
    user: {
      id: string
      email: string
      name: string
      role: string
    }
  }

  interface User extends AuthUser {}
}

declare module "next-auth/jwt" {
  interface JWT {
    id: string
    email: string
    name: string
    role: string
  }
}