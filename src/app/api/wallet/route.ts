import { prisma } from '@/lib/prisma'
import { getBalance } from '@/lib/solana'
import { NextResponse } from 'next/server'

export async function GET(request: Request) {
  try {
    const { searchParams } = new URL(request.url)
    const userId = searchParams.get('userId')

    if (!userId) {
      return NextResponse.json({ error: 'User ID required' }, { status: 400 })
    }

    const user = await prisma.user.findUnique({
      where: { id: userId }
    })

    if (!user || !user.solanaAddress) {
      return NextResponse.json({ error: 'Wallet not found' }, { status: 404 })
    }

    // Get real balance from Solana
    const onChainBalance = await getBalance(user.solanaAddress)

    // Update database if balance changed
    if (onChainBalance !== user.solBalance) {
      await prisma.user.update({
        where: { id: userId },
        data: { solBalance: onChainBalance }
      })
    }

    return NextResponse.json({
      address: user.solanaAddress,
      balance: onChainBalance
    })
  } catch (error) {
    console.error('Wallet error:', error)
    return NextResponse.json({ error: 'Something went wrong' }, { status: 500 })
  }
}
