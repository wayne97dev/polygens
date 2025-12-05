import { prisma } from '@/lib/prisma'
import { NextResponse } from 'next/server'

// GET all markets for admin (including resolved)
export async function GET() {
  try {
    const markets = await prisma.market.findMany({
      include: {
        options: true  // Include options for multiple choice
      },
      orderBy: { createdAt: 'desc' }
    })

    return NextResponse.json(markets)
  } catch (error) {
    console.error('Admin markets fetch error:', error)
    return NextResponse.json({ error: 'Failed to fetch markets' }, { status: 500 })
  }
}

// POST create new market
export async function POST(request: Request) {
  try {
    const body = await request.json()
    const { question, category, endDate, trending, type, imageUrl, options } = body

    // Validate required fields
    if (!question || !category || !endDate) {
      return NextResponse.json({ error: 'Missing required fields' }, { status: 400 })
    }

    // Build market data
    const marketData: any = {
      question,
      category,
      endDate: new Date(endDate),
      trending: trending || false,
      type: type || 'BINARY',
      yesOdds: 50,
      volume: 0
    }

    // Add imageUrl if provided
    if (imageUrl) {
      marketData.imageUrl = imageUrl
    }

    // Create options for multiple choice
    if (type === 'MULTIPLE_CHOICE' && options && options.length >= 2) {
      const initialOdds = Math.floor(100 / options.length)
      
      marketData.options = {
        create: options.map((label: string, index: number) => ({
          label,
          odds: index === options.length - 1 
            ? 100 - (initialOdds * (options.length - 1))  // Last option gets remainder
            : initialOdds,
          volume: 0
        }))
      }
    }

    const market = await prisma.market.create({
      data: marketData,
      include: { options: true }
    })

    return NextResponse.json(market)
  } catch (error) {
    console.error('Market creation error:', error)
    return NextResponse.json({ error: 'Failed to create market' }, { status: 500 })
  }
}

// DELETE market
export async function DELETE(request: Request) {
  try {
    const { searchParams } = new URL(request.url)
    const id = searchParams.get('id')

    if (!id) {
      return NextResponse.json({ error: 'Market ID required' }, { status: 400 })
    }

    // Delete related options first
    await prisma.marketOption.deleteMany({
      where: { marketId: id }
    })

    // Delete related bets
    await prisma.bet.deleteMany({
      where: { marketId: id }
    })

    // Delete market
    await prisma.market.delete({
      where: { id }
    })

    return NextResponse.json({ success: true })
  } catch (error) {
    console.error('Market deletion error:', error)
    return NextResponse.json({ error: 'Failed to delete market' }, { status: 500 })
  }
}