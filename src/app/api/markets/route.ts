import { prisma } from '@/lib/prisma'
import { NextResponse } from 'next/server'

export const dynamic = 'force-dynamic'
export const revalidate = 0

export async function GET() {
  try {
    const markets = await prisma.market.findMany({
      where: { resolved: false },
      orderBy: { createdAt: 'desc' },
      include: {
        options: {
          orderBy: { odds: 'desc' }
        }
      }
    })
    return NextResponse.json(markets)
  } catch (error) {
    console.error('Error fetching markets:', error)
    return NextResponse.json({ error: 'Failed to fetch markets' }, { status: 500 })
  }
}

export async function POST(request: Request) {
  try {
    const body = await request.json()
    const { question, category, endDate, type, imageUrl, options, yesOdds } = body

    if (type === 'MULTIPLE_CHOICE') {
      if (!options || options.length < 2 || options.length > 5) {
        return NextResponse.json({ error: 'Multiple choice requires 2-5 options' }, { status: 400 })
      }

      const initialOdds = Math.floor(100 / options.length)

      const market = await prisma.market.create({
        data: {
          question,
          category,
          type: 'MULTIPLE_CHOICE',
          imageUrl: imageUrl || null,
          endDate: new Date(endDate),
          yesOdds: 0,
          options: {
            create: options.map((label: string, index: number) => ({
              label,
              odds: index === options.length - 1 
                ? 100 - (initialOdds * (options.length - 1))
                : initialOdds,
              volume: 0
            }))
          }
        },
        include: { options: true }
      })

      return NextResponse.json(market)
    } else {
      const market = await prisma.market.create({
        data: {
          question,
          category,
          type: 'BINARY',
          imageUrl: imageUrl || null,
          endDate: new Date(endDate),
          yesOdds: yesOdds || 50
        }
      })

      return NextResponse.json(market)
    }
  } catch (error) {
    console.error('Error creating market:', error)
    return NextResponse.json({ error: 'Failed to create market' }, { status: 500 })
  }
}
