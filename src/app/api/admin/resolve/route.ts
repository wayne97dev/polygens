import { prisma } from '@/lib/prisma'
import { getBalance } from '@/lib/solana'
import { transferFromTreasury, getTreasuryBalance } from '@/lib/treasury'
import { NextResponse } from 'next/server'

export async function POST(request: Request) {
  try {
    const { marketId, outcome } = await request.json()

    const market = await prisma.market.findUnique({
      where: { id: marketId },
      include: { 
        bets: {
          include: { user: true }
        }
      }
    })

    if (!market) {
      return NextResponse.json({ error: 'Market not found' }, { status: 404 })
    }

    if (market.resolved) {
      return NextResponse.json({ error: 'Market already resolved' }, { status: 400 })
    }

    const winningSide = outcome ? 'yes' : 'no'
    const winningBets = market.bets.filter(bet => bet.side === winningSide)
    const losingBets = market.bets.filter(bet => bet.side !== winningSide)

    // Calculate total payout needed
    const totalPayout = winningBets.reduce((sum, b) => sum + b.potentialWin, 0)
    
    // Check treasury balance
    const treasuryBalance = await getTreasuryBalance()
    if (treasuryBalance < totalPayout) {
      return NextResponse.json({ 
        error: `Insufficient treasury balance. Need ${totalPayout.toFixed(4)} SOL, have ${treasuryBalance.toFixed(4)} SOL` 
      }, { status: 400 })
    }

    // Pay winners
    const paymentResults = []
    for (const bet of winningBets) {
      let transferSuccess = false
      let transferSignature = ''
      let transferError = ''

      if (bet.user.solanaAddress) {
        const transfer = await transferFromTreasury(bet.user.solanaAddress, bet.potentialWin)
        transferSuccess = transfer.success
        transferSignature = transfer.signature || ''
        transferError = transfer.error || ''

        paymentResults.push({
          betId: bet.id,
          success: transfer.success,
          signature: transfer.signature,
          error: transfer.error
        })

        if (transfer.success) {
          // Update user balance from chain
          const newBalance = await getBalance(bet.user.solanaAddress)
          await prisma.user.update({
            where: { id: bet.userId },
            data: { solBalance: newBalance }
          })
        }
      }

      await prisma.bet.update({
        where: { id: bet.id },
        data: { status: transferSuccess ? 'won' : 'error' }
      })
    }

    // Mark losers
    for (const bet of losingBets) {
      await prisma.bet.update({
        where: { id: bet.id },
        data: { status: 'lost' }
      })
    }

    // Resolve market
    await prisma.market.update({
      where: { id: marketId },
      data: { resolved: true, outcome }
    })

    return NextResponse.json({ 
      success: true, 
      winnersCount: winningBets.length,
      losersCount: losingBets.length,
      totalPaidOut: totalPayout,
      payments: paymentResults
    })
  } catch (error) {
    console.error('Resolve error:', error)
    return NextResponse.json({ error: 'Something went wrong' }, { status: 500 })
  }
}