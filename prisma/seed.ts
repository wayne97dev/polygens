import { PrismaClient } from '@prisma/client'

const prisma = new PrismaClient()

async function main() {
  // Elimina i vecchi mercati e bet
  await prisma.bet.deleteMany()
  await prisma.market.deleteMany()

  await prisma.market.createMany({
    data: [
      {
        question: "Will Bitcoin reach $200k by end of 2025?",
        category: "Crypto",
        yesOdds: 35,
        volume: 0,
        endDate: new Date("2025-12-31"),
        trending: true
      },
      {
        question: "Will OpenAI release GPT-5 before July 2025?",
        category: "Tech",
        yesOdds: 55,
        volume: 0,
        endDate: new Date("2025-06-30"),
        trending: true
      },
      {
        question: "Will Tesla stock reach $600 in 2025?",
        category: "Finance",
        yesOdds: 28,
        volume: 0,
        endDate: new Date("2025-12-31"),
        trending: false
      },
      {
        question: "Will there be a Fed rate cut in Q1 2025?",
        category: "Finance",
        yesOdds: 72,
        volume: 0,
        endDate: new Date("2025-03-31"),
        trending: true
      },
      {
        question: "Will Ethereum flip Bitcoin market cap in 2025?",
        category: "Crypto",
        yesOdds: 12,
        volume: 0,
        endDate: new Date("2025-12-31"),
        trending: false
      },
      {
        question: "Will Apple release a foldable iPhone in 2025?",
        category: "Tech",
        yesOdds: 22,
        volume: 0,
        endDate: new Date("2025-12-31"),
        trending: true
      },
      {
        question: "Will Solana reach $500 in 2025?",
        category: "Crypto",
        yesOdds: 40,
        volume: 0,
        endDate: new Date("2025-12-31"),
        trending: true
      },
      {
        question: "Will AI replace 10% of US jobs by 2026?",
        category: "Tech",
        yesOdds: 45,
        volume: 0,
        endDate: new Date("2026-01-01"),
        trending: false
      },
      {
        question: "Will Manchester City win Premier League 2024/25?",
        category: "Sports",
        yesOdds: 38,
        volume: 0,
        endDate: new Date("2025-05-25"),
        trending: true
      },
      {
        question: "Will SpaceX land humans on Mars before 2030?",
        category: "Tech",
        yesOdds: 18,
        volume: 0,
        endDate: new Date("2029-12-31"),
        trending: false
      }
    ]
  })

  console.log('✅ Markets updated!')
}

main()
  .catch((e) => {
    console.error(e)
    process.exit(1)
  })
  .finally(async () => {
    await prisma.$disconnect()
  })