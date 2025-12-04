import { prisma } from '@/lib/prisma'
import { NextResponse } from 'next/server'

export async function GET() {
  try {
    const users = await prisma.user.findMany({
      orderBy: { solBalance: 'desc' },
      take: 20,
      select: {
        id: true,
        username: true,
        solBalance: true,
        _count: {
          select: { bets: true }
        }
      }
    })

    const leaderboard = users.map((user, index) => ({
      rank: index + 1,
      username: user.username,
      solBalance: user.solBalance,
      totalBets: user._count.bets,
      badge: index === 0 ? '🏆' : index === 1 ? '🥈' : index === 2 ? '🥉' : ''
    }))

    return NextResponse.json(leaderboard)
  } catch (error) {
    return NextResponse.json(
      { error: 'Something went wrong' },
      { status: 500 }
    )
  }
}