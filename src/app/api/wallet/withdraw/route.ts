import { prisma } from '@/lib/prisma'
import { sendSol, isValidSolanaAddress, getBalance } from '@/lib/solana'
import { NextResponse } from 'next/server'

export async function POST(request: Request) {
  try {
    const { userId, toAddress, amount } = await request.json()

    if (!userId || !toAddress || !amount) {
      return NextResponse.json({ error: 'Missing required fields' }, { status: 400 })
    }

    if (!isValidSolanaAddress(toAddress)) {
      return NextResponse.json({ error: 'Invalid Solana address' }, { status: 400 })
    }

    if (amount <= 0) {
      return NextResponse.json({ error: 'Amount must be greater than 0' }, { status: 400 })
    }

    const user = await prisma.user.findUnique({
      where: { id: userId }
    })

    if (!user || !user.solanaAddress || !user.solanaPrivateKey) {
      return NextResponse.json({ error: 'Wallet not found' }, { status: 404 })
    }

    // Check real balance
    const currentBalance = await getBalance(user.solanaAddress)
    
    // Leave some for fees (0.001 SOL)
    const maxWithdraw = currentBalance - 0.001
    
    if (amount > maxWithdraw) {
      return NextResponse.json({ 
        error: `Insufficient balance. Max withdraw: ${maxWithdraw.toFixed(4)} SOL` 
      }, { status: 400 })
    }

    // Send SOL
    const result = await sendSol(user.solanaPrivateKey, toAddress, amount)

    if (!result.success) {
      return NextResponse.json({ error: result.error }, { status: 500 })
    }

    // Update balance in database
    const newBalance = await getBalance(user.solanaAddress)
    await prisma.user.update({
      where: { id: userId },
      data: { solBalance: newBalance }
    })

    return NextResponse.json({
      success: true,
      signature: result.signature,
      newBalance
    })
  } catch (error) {
    console.error('Withdraw error:', error)
    return NextResponse.json({ error: 'Something went wrong' }, { status: 500 })
  }
}
