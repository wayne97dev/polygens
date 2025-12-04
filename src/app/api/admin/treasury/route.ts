import { getTreasuryAddress, getTreasuryBalance } from '@/lib/treasury'
import { NextResponse } from 'next/server'

export async function GET() {
  try {
    const address = getTreasuryAddress()
    const balance = await getTreasuryBalance()

    return NextResponse.json({
      address,
      balance
    })
  } catch (error) {
    console.error('Treasury error:', error)
    return NextResponse.json({ error: 'Something went wrong' }, { status: 500 })
  }
}
