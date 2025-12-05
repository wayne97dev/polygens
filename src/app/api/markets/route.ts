import { prisma } from '@/lib/prisma'
import { NextResponse } from 'next/server'

// GET all markets
export async function GET() {
  try {
    const markets = await prisma.market.findMany({
      where: { resolved: false },
      include: {
        options: true  // IMPORTANT: Include options for multiple choice
      },
      orderBy: [
        { trending: 'desc' },
        { createdAt: 'desc' }
      ]
    })

    return NextResponse.json(markets)
  } catch (error) {
    console.error('Markets fetch error:', error)
    return NextResponse.json({ error: 'Failed to fetch markets' }, { status: 500 })
  }
}

// POST create new market (admin)
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
