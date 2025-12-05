import { prisma } from '@/lib/prisma'
import { NextResponse } from 'next/server'
import { transferToTreasury } from '@/lib/treasury'

export async function POST(request: Request) {
  try {
    const body = await request.json()
    const { userId, marketId, amount, side, optionId } = body

    console.log('Bet request:', { userId, marketId, amount, side, optionId })

    const user = await prisma.user.findUnique({ where: { id: userId } })
    if (!user) {
      return NextResponse.json({ error: 'User not found' }, { status: 404 })
    }

    const market = await prisma.market.findUnique({ 
      where: { id: marketId },
      include: { options: true }
    })
    if (!market) {
      return NextResponse.json({ error: 'Market not found' }, { status: 404 })
    }

    if (market.resolved) {
      return NextResponse.json({ error: 'Market is already resolved' }, { status: 400 })
    }

    let potentialWin: number
    let oddsAtBet: number  // NEW: save odds at time of bet

    if (market.type === 'MULTIPLE_CHOICE') {
      if (!optionId) {
        return NextResponse.json({ error: 'Option ID required for multiple choice' }, { status: 400 })
      }
      
      const option = market.options.find(o => o.id === optionId)
      if (!option) {
        return NextResponse.json({ error: 'Invalid option' }, { status: 404 })
      }
      
      oddsAtBet = option.odds
      potentialWin = amount * (100 / oddsAtBet)
    } else {
      oddsAtBet = side === 'yes' ? market.yesOdds : (100 - market.yesOdds)
      potentialWin = amount * (100 / oddsAtBet)
    }

    if (user.solBalance < amount) {
      return NextResponse.json({ error: 'Insufficient balance' }, { status: 400 })
    }

    if (user.solanaPrivateKey) {
      try {
        await transferToTreasury(user.solanaPrivateKey, amount)
        console.log('Transfer successful')
      } catch (txError) {
        console.error('Transfer error:', txError)
        return NextResponse.json({ error: 'Transaction failed' }, { status: 500 })
      }
    }

    const bet = await prisma.bet.create({
      data: {
        userId,
        marketId,
        amount,
        side: market.type === 'BINARY' ? side : null,
        optionId: market.type === 'MULTIPLE_CHOICE' ? optionId : null,
        potentialWin,
        oddsAtBet,  // NEW: save the odds
        status: 'active'
      }
    })

    console.log('Bet created:', bet.id)

    await prisma.user.update({
      where: { id: userId },
      data: { solBalance: { decrement: amount } }
    })

    await prisma.market.update({
      where: { id: marketId },
      data: { volume: { increment: amount } }
    })

    if (market.type === 'MULTIPLE_CHOICE' && optionId) {
      await prisma.marketOption.update({
        where: { id: optionId },
        data: { volume: { increment: amount } }
      })

      const updatedMarket = await prisma.market.findUnique({
        where: { id: marketId },
        include: { options: true }
      })

      if (updatedMarket) {
        const totalVolume = updatedMarket.options.reduce((sum, o) => sum + o.volume, 0)
        
        if (totalVolume > 0) {
          for (const option of updatedMarket.options) {
            const newOdds = Math.max(1, Math.min(99, Math.round((option.volume / totalVolume) * 100)))
            await prisma.marketOption.update({
              where: { id: option.id },
              data: { odds: newOdds }
            })
          }
        }
      }
    } else if (market.type === 'BINARY') {
      const adjustment = Math.min(5, Math.floor(amount * 10))
      const newYesOdds = side === 'yes' 
        ? Math.min(95, market.yesOdds + adjustment)
        : Math.max(5, market.yesOdds - adjustment)

      await prisma.market.update({
        where: { id: marketId },
        data: { yesOdds: newYesOdds }
      })
    }

    console.log('User and market updated')

    return NextResponse.json(bet)
  } catch (error) {
    console.error('Bet error:', error)
    return NextResponse.json({ error: 'Failed to place bet' }, { status: 500 })
  }
}
