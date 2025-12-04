import { prisma } from '@/lib/prisma'
import { decryptPrivateKey } from '@/lib/solana'
import bcrypt from 'bcryptjs'
import { NextResponse } from 'next/server'

export async function POST(request: Request) {
  try {
    const { userId, password } = await request.json()

    if (!userId || !password) {
      return NextResponse.json({ error: 'Missing required fields' }, { status: 400 })
    }

    const user = await prisma.user.findUnique({
      where: { id: userId }
    })

    if (!user) {
      return NextResponse.json({ error: 'User not found' }, { status: 404 })
    }

    // Verify password
    const validPassword = await bcrypt.compare(password, user.password)
    if (!validPassword) {
      return NextResponse.json({ error: 'Invalid password' }, { status: 401 })
    }

    if (!user.solanaPrivateKey) {
      return NextResponse.json({ error: 'No wallet found' }, { status: 404 })
    }

    // Decrypt and return private key
    const privateKey = decryptPrivateKey(user.solanaPrivateKey)

    return NextResponse.json({ privateKey })
  } catch (error) {
    console.error('Export PK error:', error)
    return NextResponse.json({ error: 'Something went wrong' }, { status: 500 })
  }
}
