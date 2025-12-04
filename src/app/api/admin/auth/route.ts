import { NextResponse } from 'next/server'

export async function POST(request: Request) {
  try {
    const { password } = await request.json()
    
    const adminPassword = process.env.ADMIN_PASSWORD
    
    if (!adminPassword) {
      return NextResponse.json({ error: 'Admin not configured' }, { status: 500 })
    }
    
    if (password === adminPassword) {
      return NextResponse.json({ success: true })
    } else {
      return NextResponse.json({ error: 'Invalid password' }, { status: 401 })
    }
  } catch (error) {
    return NextResponse.json({ error: 'Something went wrong' }, { status: 500 })
  }
}
