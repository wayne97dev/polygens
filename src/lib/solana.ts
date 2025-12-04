import { Keypair, Connection, PublicKey, Transaction, SystemProgram, LAMPORTS_PER_SOL } from '@solana/web3.js'
import CryptoJS from 'crypto-js'

const ENCRYPTION_KEY = process.env.ENCRYPTION_KEY || 'polygens-secret-key-change-in-production'
const SOLANA_RPC = process.env.SOLANA_RPC || 'https://api.mainnet-beta.solana.com'

export const connection = new Connection(SOLANA_RPC, 'confirmed')

const ALPHABET = '123456789ABCDEFGHJKLMNPQRSTUVWXYZabcdefghijkmnopqrstuvwxyz'

function base58Encode(bytes: Uint8Array): string {
  const digits = [0]
  for (let i = 0; i < bytes.length; i++) {
    let carry = bytes[i]
    for (let j = 0; j < digits.length; j++) {
      carry += digits[j] << 8
      digits[j] = carry % 58
      carry = (carry / 58) | 0
    }
    while (carry > 0) {
      digits.push(carry % 58)
      carry = (carry / 58) | 0
    }
  }
  
  let str = ''
  for (let i = 0; i < bytes.length && bytes[i] === 0; i++) {
    str += '1'
  }
  for (let i = digits.length - 1; i >= 0; i--) {
    str += ALPHABET[digits[i]]
  }
  return str
}

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

export function generateWallet() {
  const keypair = Keypair.generate()
  const publicKey = keypair.publicKey.toString()
  const privateKey = base58Encode(keypair.secretKey)
  
  const encryptedPrivateKey = CryptoJS.AES.encrypt(privateKey, ENCRYPTION_KEY).toString()
  
  return {
    publicKey,
    encryptedPrivateKey
  }
}

export function decryptPrivateKey(encryptedKey: string): string {
  const bytes = CryptoJS.AES.decrypt(encryptedKey, ENCRYPTION_KEY)
  return bytes.toString(CryptoJS.enc.Utf8)
}

export function getKeypairFromEncrypted(encryptedKey: string): Keypair {
  const privateKey = decryptPrivateKey(encryptedKey)
  const secretKey = base58Decode(privateKey)
  return Keypair.fromSecretKey(secretKey)
}

export async function getBalance(address: string): Promise<number> {
  try {
    const publicKey = new PublicKey(address)
    const balance = await connection.getBalance(publicKey)
    return balance / LAMPORTS_PER_SOL
  } catch (error) {
    console.error('Error getting balance:', error)
    return 0
  }
}

export async function sendSol(
  fromEncryptedKey: string,
  toAddress: string,
  amount: number
): Promise<{ success: boolean; signature?: string; error?: string }> {
  try {
    const fromKeypair = getKeypairFromEncrypted(fromEncryptedKey)
    const toPublicKey = new PublicKey(toAddress)
    
    const transaction = new Transaction().add(
      SystemProgram.transfer({
        fromPubkey: fromKeypair.publicKey,
        toPubkey: toPublicKey,
        lamports: Math.floor(amount * LAMPORTS_PER_SOL)
      })
    )
    
    const { blockhash } = await connection.getLatestBlockhash()
    transaction.recentBlockhash = blockhash
    transaction.feePayer = fromKeypair.publicKey
    
    transaction.sign(fromKeypair)
    
    const signature = await connection.sendRawTransaction(transaction.serialize())
    await connection.confirmTransaction(signature)
    
    return { success: true, signature }
  } catch (error: any) {
    console.error('Error sending SOL:', error)
    return { success: false, error: error.message }
  }
}

export function isValidSolanaAddress(address: string): boolean {
  try {
    new PublicKey(address)
    return true
  } catch {
    return false
  }
}