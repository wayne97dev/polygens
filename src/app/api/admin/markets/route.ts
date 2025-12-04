import { prisma } from '@/lib/prisma'
import { NextResponse } from 'next/server'

export async function GET() {
  try {
    const markets = await prisma.market.findMany({
      orderBy: { createdAt: 'desc' }
    })
    return NextResponse.json(markets)
  } catch (error) {
    return NextResponse.json({ error: 'Something went wrong' }, { status: 500 })
  }
}

export async function POST(request: Request) {
  try {
    const { question, category, endDate, trending } = await request.json()

    const market = await prisma.market.create({
      data: {
        question,
        category,
        endDate: new Date(endDate),
        trending: trending || false,
        yesOdds: 50,
        volume: 0
      }
    })

    return NextResponse.json(market)
  } catch (error) {
    return NextResponse.json({ error: 'Something went wrong' }, { status: 500 })
  }
}

export async function DELETE(request: Request) {
  try {
    const { searchParams } = new URL(request.url)
    const id = searchParams.get('id')

    if (!id) {
      return NextResponse.json({ error: 'Market ID required' }, { status: 400 })
    }

    await prisma.bet.deleteMany({ where: { marketId: id } })
    await prisma.market.delete({ where: { id } })

    return NextResponse.json({ success: true })
  } catch (error) {
    return NextResponse.json({ error: 'Something went wrong' }, { status: 500 })
  }
}
