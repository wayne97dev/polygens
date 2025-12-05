import { prisma } from '@/lib/prisma'
import { getBalance } from '@/lib/solana'
import { transferFromTreasury, getTreasuryBalance } from '@/lib/treasury'
import { NextResponse } from 'next/server'

const CASHOUT_FEE = 0.05 // 5% fee
const MAX_PROFIT_MULTIPLIER = 1.5 // Max 50% profit on cash out

export async function POST(request: Request) {
  try {
    const { betId, userId } = await request.json()

    // Get bet with market info
    const bet = await prisma.bet.findUnique({
      where: { id: betId },
      include: { 
        market: {
          include: { options: true }
        },
        user: true 
      }
    })

    if (!bet) {
      return NextResponse.json({ error: 'Bet not found' }, { status: 404 })
    }

    if (bet.userId !== userId) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 403 })
    }

    if (bet.status !== 'active') {
      return NextResponse.json({ error: 'Bet is not active' }, { status: 400 })
    }

    if (bet.market.resolved) {
      return NextResponse.json({ error: 'Market already resolved' }, { status: 400 })
    }

    // Get current odds for this bet's position
    let currentOdds: number

    if (bet.market.type === 'MULTIPLE_CHOICE') {
      const option = bet.market.options.find(o => o.id === bet.optionId)
      if (!option) {
        return NextResponse.json({ error: 'Option not found' }, { status: 404 })
      }
      currentOdds = option.odds
    } else {
      currentOdds = bet.side === 'yes' 
        ? bet.market.yesOdds 
        : (100 - bet.market.yesOdds)
    }

    // Get odds at time of bet (default to 50 for old bets without this field)
    const oddsAtBet = bet.oddsAtBet || 50

    // Calculate cash out value based on odds change
    // Formula: betAmount * (currentOdds / oddsAtBet)
    // This means:
    // - If odds improved (50% -> 70%): 1 * (70/50) = 1.4 SOL (profit)
    // - If odds dropped (50% -> 30%): 1 * (30/50) = 0.6 SOL (loss)
    let grossCashOut = bet.amount * (currentOdds / oddsAtBet)

    // Cap the cash out to prevent exploits
    // Max profit is 50% of original bet
    const maxCashOut = bet.amount * MAX_PROFIT_MULTIPLIER
    grossCashOut = Math.min(grossCashOut, maxCashOut)

    // Apply fee
    const fee = grossCashOut * CASHOUT_FEE
    const netCashOut = grossCashOut - fee

    if (netCashOut <= 0) {
      return NextResponse.json({ 
        error: 'Cash out value too low' 
      }, { status: 400 })
    }

    // Check treasury balance
    const treasuryBalance = await getTreasuryBalance()
    if (treasuryBalance < netCashOut) {
      return NextResponse.json({ 
        error: 'Insufficient treasury balance' 
      }, { status: 400 })
    }

    // Transfer from treasury to user
    if (!bet.user.solanaAddress) {
      return NextResponse.json({ 
        error: 'User wallet not found' 
      }, { status: 400 })
    }

    const transfer = await transferFromTreasury(bet.user.solanaAddress, netCashOut)

    if (!transfer.success) {
      return NextResponse.json({ 
        error: transfer.error || 'Transfer failed' 
      }, { status: 500 })
    }

    // Update user balance
    const newBalance = await getBalance(bet.user.solanaAddress)
    await prisma.user.update({
      where: { id: userId },
      data: { solBalance: newBalance }
    })

    // Mark bet as cashed out
    await prisma.bet.update({
      where: { id: betId },
      data: { 
        status: 'cashed_out',
        potentialWin: netCashOut // Store actual cash out amount
      }
    })

    // UPDATE MARKET ODDS - Remove the bet's weight from the market
    if (bet.market.type === 'MULTIPLE_CHOICE') {
      const option = bet.market.options.find(o => o.id === bet.optionId)
      if (option) {
        const newOptionVolume = Math.max(0, option.volume - bet.amount)
        
        await prisma.marketOption.update({
          where: { id: option.id },
          data: { volume: newOptionVolume }
        })

        const allOptions = await prisma.marketOption.findMany({
          where: { marketId: bet.market.id }
        })
        
        const totalVolume = allOptions.reduce((sum, o) => sum + o.volume, 0)
        
        if (totalVolume > 0) {
          for (const opt of allOptions) {
            const newOdds = Math.round((opt.volume / totalVolume) * 100)
            await prisma.marketOption.update({
              where: { id: opt.id },
              data: { odds: Math.max(1, newOdds) }
            })
          }
        } else {
          const equalOdds = Math.floor(100 / allOptions.length)
          for (let i = 0; i < allOptions.length; i++) {
            const opt = allOptions[i]
            const odds = i === allOptions.length - 1 
              ? 100 - (equalOdds * (allOptions.length - 1)) 
              : equalOdds
            await prisma.marketOption.update({
              where: { id: opt.id },
              data: { odds }
            })
          }
        }

        await prisma.market.update({
          where: { id: bet.market.id },
          data: { volume: Math.max(0, bet.market.volume - bet.amount) }
        })
      }
    } else {
      const activeBets = await prisma.bet.findMany({
        where: { 
          marketId: bet.market.id,
          status: 'active'
        }
      })

      const yesVolume = activeBets
        .filter(b => b.side === 'yes')
        .reduce((sum, b) => sum + b.amount, 0)
      
      const noVolume = activeBets
        .filter(b => b.side === 'no')
        .reduce((sum, b) => sum + b.amount, 0)

      const totalVolume = yesVolume + noVolume

      let newYesOdds = 50
      if (totalVolume > 0) {
        newYesOdds = Math.round((yesVolume / totalVolume) * 100)
        newYesOdds = Math.max(5, Math.min(95, newYesOdds))
      }

      await prisma.market.update({
        where: { id: bet.market.id },
        data: { 
          yesOdds: newYesOdds,
          volume: Math.max(0, bet.market.volume - bet.amount)
        }
      })
    }

    return NextResponse.json({
      success: true,
      originalBet: bet.amount,
      cashOutValue: netCashOut,
      fee: fee,
      signature: transfer.signature
    })

  } catch (error) {
    console.error('Cash out error:', error)
    return NextResponse.json({ error: 'Cash out failed' }, { status: 500 })
  }
}

// GET endpoint to calculate cash out value without executing
export async function GET(request: Request) {
  try {
    const { searchParams } = new URL(request.url)
    const betId = searchParams.get('betId')

    if (!betId) {
      return NextResponse.json({ error: 'Bet ID required' }, { status: 400 })
    }

    const bet = await prisma.bet.findUnique({
      where: { id: betId },
      include: { 
        market: {
          include: { options: true }
        }
      }
    })

    if (!bet) {
      return NextResponse.json({ error: 'Bet not found' }, { status: 404 })
    }

    if (bet.status !== 'active') {
      return NextResponse.json({ error: 'Bet is not active' }, { status: 400 })
    }

    // Calculate current odds
    let currentOdds: number

    if (bet.market.type === 'MULTIPLE_CHOICE') {
      const option = bet.market.options.find(o => o.id === bet.optionId)
      currentOdds = option?.odds || 0
    } else {
      currentOdds = bet.side === 'yes' 
        ? bet.market.yesOdds 
        : (100 - bet.market.yesOdds)
    }

    // Get odds at time of bet
    const oddsAtBet = bet.oddsAtBet || 50

    // Calculate cash out value
    let grossCashOut = bet.amount * (currentOdds / oddsAtBet)
    
    // Cap max profit
    const maxCashOut = bet.amount * MAX_PROFIT_MULTIPLIER
    grossCashOut = Math.min(grossCashOut, maxCashOut)

    const fee = grossCashOut * CASHOUT_FEE
    const netCashOut = grossCashOut - fee

    // Calculate profit/loss
    const profitLoss = netCashOut - bet.amount

    return NextResponse.json({
      betId,
      originalBet: bet.amount,
      potentialWin: bet.potentialWin,
      oddsAtBet,
      currentOdds,
      grossCashOut,
      fee,
      netCashOut,
      profitLoss,
      profitPercent: ((profitLoss / bet.amount) * 100).toFixed(1)
    })

  } catch (error) {
    console.error('Cash out calculation error:', error)
    return NextResponse.json({ error: 'Calculation failed' }, { status: 500 })
  }
}