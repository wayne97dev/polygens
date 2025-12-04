import { prisma } from '@/lib/prisma'
import { generateWallet } from '@/lib/solana'
import bcrypt from 'bcryptjs'
import { NextResponse } from 'next/server'

export async function POST(request: Request) {
  try {
    const { email, username, password } = await request.json()

    const existingUser = await prisma.user.findFirst({
      where: {
        OR: [{ email }, { username }]
      }
    })

    if (existingUser) {
      return NextResponse.json(
        { error: 'Email or username already exists' },
        { status: 400 }
      )
    }

    // Generate Solana wallet
    const wallet = generateWallet()

    const hashedPassword = await bcrypt.hash(password, 10)

    const user = await prisma.user.create({
      data: {
        email,
        username,
        password: hashedPassword,
        solanaAddress: wallet.publicKey,
        solanaPrivateKey: wallet.encryptedPrivateKey,
        solBalance: 0
      }
    })

    return NextResponse.json({
      id: user.id,
      email: user.email,
      username: user.username,
      solanaAddress: user.solanaAddress,
      solBalance: user.solBalance
    })
  } catch (error) {
    console.error('Registration error:', error)
    return NextResponse.json(
      { error: 'Something went wrong' },
      { status: 500 }
    )
  }
}