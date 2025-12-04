
import { prisma } from '@/lib/prisma'
import { NextResponse } from 'next/server'

export const dynamic = 'force-dynamic'
export const revalidate = 0

export async function GET() {
  try {
    const users = await prisma.user.findMany({
      orderBy: { solBalance: 'desc' },
      take: 20,
      include: {
        bets: true
      }
    })

    const leaderboard = users.map((user, index) => ({
      rank: index + 1,
      username: user.username,
      solBalance: user.solBalance,
      totalBets: user.bets.length,
      badge: index === 0 ? '🏆' : index === 1 ? '🥈' : index === 2 ? '🥉' : ''
    }))

    return NextResponse.json(leaderboard)
  } catch (error) {
    console.error('Leaderboard error:', error)
    return NextResponse.json(
      { error: 'Something went wrong' },
      { status: 500 }
    )
  }
}
