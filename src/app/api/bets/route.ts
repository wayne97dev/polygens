import { prisma } from '@/lib/prisma'
import { getBalance } from '@/lib/solana'
import { transferToTreasury } from '@/lib/treasury'
import { NextResponse } from 'next/server'

export async function POST(request: Request) {
  try {
    const { userId, marketId, amount, side } = await request.json()

    const user = await prisma.user.findUnique({ where: { id: userId } })
    const market = await prisma.market.findUnique({ where: { id: marketId } })

    if (!user || !market) {
      return NextResponse.json(
        { error: 'User or market not found' },
        { status: 404 }
      )
    }

    if (!user.solanaAddress || !user.solanaPrivateKey) {
      return NextResponse.json(
        { error: 'Wallet not found' },
        { status: 400 }
      )
    }

    // Check real on-chain balance
    const realBalance = await getBalance(user.solanaAddress)
    
    if (realBalance < amount + 0.001) { // +0.001 for fees
      return NextResponse.json(
        { error: `Insufficient balance. You have ${realBalance.toFixed(4)} SOL` },
        { status: 400 }
      )
    }

    if (amount < 0.001) {
      return NextResponse.json(
        { error: 'Minimum bet is 0.001 SOL' },
        { status: 400 }
      )
    }

    // Transfer SOL to treasury
    const transfer = await transferToTreasury(user.solanaPrivateKey, amount)
    
    if (!transfer.success) {
      return NextResponse.json(
        { error: `Transfer failed: ${transfer.error}` },
        { status: 500 }
      )
    }

    const odds = side === 'yes' ? market.yesOdds : 100 - market.yesOdds
    const potentialWin = amount * (100 / odds)

    // Update database
    const newBalance = await getBalance(user.solanaAddress)
    
    const [bet] = await prisma.$transaction([
      prisma.bet.create({
        data: {
          userId,
          marketId,
          amount,
          side,
          potentialWin,
          status: 'active'
        }
      }),
      prisma.user.update({
        where: { id: userId },
        data: { solBalance: newBalance }
      }),
      prisma.market.update({
        where: { id: marketId },
        data: { 
          volume: market.volume + amount,
          yesOdds: side === 'yes' 
            ? Math.min(market.yesOdds + 1, 95)
            : Math.max(market.yesOdds - 1, 5)
        }
      })
    ])

    return NextResponse.json({
      ...bet,
      txSignature: transfer.signature
    })
  } catch (error) {
    console.error('Bet error:', error)
    return NextResponse.json(
      { error: 'Something went wrong' },
      { status: 500 }
    )
  }
}