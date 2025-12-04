
import { Keypair, Connection, PublicKey, Transaction, SystemProgram, LAMPORTS_PER_SOL } from '@solana/web3.js'
import CryptoJS from 'crypto-js'

const TREASURY_PRIVATE_KEY = process.env.TREASURY_PRIVATE_KEY || ''
const SOLANA_RPC = process.env.SOLANA_RPC || 'https://api.mainnet-beta.solana.com'
const ENCRYPTION_KEY = process.env.ENCRYPTION_KEY || 'polygens-secret-key-change-in-production'

export const connection = new Connection(SOLANA_RPC, 'confirmed')

let treasuryKeypair: Keypair | null = null

const ALPHABET = '123456789ABCDEFGHJKLMNPQRSTUVWXYZabcdefghijkmnopqrstuvwxyz'

function base58Decode(str: string): Uint8Array {
  const bytes: number[] = []
  for (let i = 0; i < str.length; i++) {
    const char = str[i]
    const index = ALPHABET.indexOf(char)
    if (index === -1) throw new Error(`Invalid base58 character: ${char}`)
    
    let carry = index
    for (let j = 0; j < bytes.length; j++) {
      carry += bytes[j] * 58
      bytes[j] = carry & 0xff
      carry >>= 8
    }
    while (carry > 0) {
      bytes.push(carry & 0xff)
      carry >>= 8
    }
  }
  
  for (let i = 0; i < str.length && str[i] === '1'; i++) {
    bytes.push(0)
  }
  
  return new Uint8Array(bytes.reverse())
}

function decryptPrivateKey(encryptedKey: string): string {
  const bytes = CryptoJS.AES.decrypt(encryptedKey, ENCRYPTION_KEY)
  return bytes.toString(CryptoJS.enc.Utf8)
}

function getKeypairFromEncrypted(encryptedKey: string): Keypair {
  const privateKey = decryptPrivateKey(encryptedKey)
  const secretKey = base58Decode(privateKey)
  return Keypair.fromSecretKey(secretKey)
}

export function getTreasuryKeypair(): Keypair {
  if (!treasuryKeypair) {
    if (TREASURY_PRIVATE_KEY) {
      try {
        const secretKey = base58Decode(TREASURY_PRIVATE_KEY)
        treasuryKeypair = Keypair.fromSecretKey(secretKey)
        console.log('Treasury wallet loaded:', treasuryKeypair.publicKey.toString())
      } catch (error) {
        console.error('Error loading treasury key:', error)
        throw new Error('Invalid treasury private key')
      }
    } else {
      treasuryKeypair = Keypair.generate()
      console.log('Using temporary treasury wallet:', treasuryKeypair.publicKey.toString())
    }
  }
  return treasuryKeypair
}

export function getTreasuryAddress(): string {
  return getTreasuryKeypair().publicKey.toString()
}

export async function getTreasuryBalance(): Promise<number> {
  try {
    const balance = await connection.getBalance(getTreasuryKeypair().publicKey)
    return balance / LAMPORTS_PER_SOL
  } catch (error) {
    console.error('Error getting treasury balance:', error)
    return 0
  }
}

async function confirmTransactionPolling(signature: string, maxRetries = 30): Promise<boolean> {
  for (let i = 0; i < maxRetries; i++) {
    const status = await connection.getSignatureStatus(signature)
    
    if (status?.value?.confirmationStatus === 'confirmed' || 
        status?.value?.confirmationStatus === 'finalized') {
      return true
    }
    
    if (status?.value?.err) {
      throw new Error(`Transaction failed: ${JSON.stringify(status.value.err)}`)
    }
    
    await new Promise(resolve => setTimeout(resolve, 1000))
  }
  
  return true
}

export async function transferToTreasury(
  fromEncryptedKey: string,
  amount: number
): Promise<{ success: boolean; signature?: string; error?: string }> {
  try {
    const fromKeypair = getKeypairFromEncrypted(fromEncryptedKey)
    const treasuryPubkey = getTreasuryKeypair().publicKey

    const transaction = new Transaction().add(
      SystemProgram.transfer({
        fromPubkey: fromKeypair.publicKey,
        toPubkey: treasuryPubkey,
        lamports: Math.floor(amount * LAMPORTS_PER_SOL)
      })
    )

    const { blockhash } = await connection.getLatestBlockhash()
    transaction.recentBlockhash = blockhash
    transaction.feePayer = fromKeypair.publicKey

    transaction.sign(fromKeypair)

    const signature = await connection.sendRawTransaction(transaction.serialize(), {
      skipPreflight: false,
      preflightCommitment: 'confirmed'
    })
    
    await confirmTransactionPolling(signature)

    return { success: true, signature }
  } catch (error: any) {
    console.error('Error transferring to treasury:', error)
    return { success: false, error: error.message }
  }
}

export async function transferFromTreasury(
  toAddress: string,
  amount: number
): Promise<{ success: boolean; signature?: string; error?: string }> {
  try {
    const treasury = getTreasuryKeypair()
    const toPublicKey = new PublicKey(toAddress)

    const transaction = new Transaction().add(
      SystemProgram.transfer({
        fromPubkey: treasury.publicKey,
        toPubkey: toPublicKey,
        lamports: Math.floor(amount * LAMPORTS_PER_SOL)
      })
    )

    const { blockhash } = await connection.getLatestBlockhash()
    transaction.recentBlockhash = blockhash
    transaction.feePayer = treasury.publicKey

    transaction.sign(treasury)

    const signature = await connection.sendRawTransaction(transaction.serialize(), {
      skipPreflight: false,
      preflightCommitment: 'confirmed'
    })
    
    await confirmTransactionPolling(signature)

    return { success: true, signature }
  } catch (error: any) {
    console.error('Error transferring from treasury:', error)
    return { success: false, error: error.message }
  }
}
