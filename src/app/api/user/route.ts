import { prisma } from '@/lib/prisma'
import { getBalance } from '@/lib/solana'
import { NextResponse } from 'next/server'

export async function GET(request: Request) {
  try {
    const { searchParams } = new URL(request.url)
    const userId = searchParams.get('id')

    if (!userId) {
      return NextResponse.json({ error: 'User ID required' }, { status: 400 })
    }

    const user = await prisma.user.findUnique({
      where: { id: userId },
      include: {
        bets: {
          include: { market: true },
          orderBy: { createdAt: 'desc' }
        }
      }
    })

    if (!user) {
      return NextResponse.json({ error: 'User not found' }, { status: 404 })
    }

    // Get real balance if wallet exists
    let solBalance = user.solBalance
    if (user.solanaAddress) {
      solBalance = await getBalance(user.solanaAddress)
      // Update if changed
      if (solBalance !== user.solBalance) {
        await prisma.user.update({
          where: { id: userId },
          data: { solBalance }
        })
      }
    }

    return NextResponse.json({
      id: user.id,
      username: user.username,
      email: user.email,
      solanaAddress: user.solanaAddress,
      solBalance,
      bets: user.bets
    })
  } catch (error) {
    console.error('User error:', error)
    return NextResponse.json({ error: 'Something went wrong' }, { status: 500 })
  }
}