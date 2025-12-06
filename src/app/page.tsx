'use client'

import { useState, useEffect } from 'react'

// Types
type MarketOption = {
  id: string
  label: string
  odds: number
  volume: number
}

type Market = {
  id: string
  question: string
  category: string
  type: 'BINARY' | 'MULTIPLE_CHOICE'
  imageUrl: string | null
  yesOdds: number
  volume: number
  endDate: string
  trending: boolean
  options: MarketOption[]
}

type Bet = {
  id: string
  amount: number
  side: string | null
  optionId: string | null
  option: MarketOption | null
  potentialWin: number
  status: string
  market: Market
}

type User = {
  id: string
  username: string
  email: string
  solanaAddress: string
  solBalance: number
  bets: Bet[]
}

type LeaderboardUser = {
  rank: number
  username: string
  solBalance: number
  totalBets: number
  badge: string
}

export default function Home() {
  const [user, setUser] = useState<User | null>(null)
  const [markets, setMarkets] = useState<Market[]>([])
  const [leaderboard, setLeaderboard] = useState<LeaderboardUser[]>([])
  const [activeTab, setActiveTab] = useState('markets')
  const [selectedCategory, setSelectedCategory] = useState('All')
  const [selectedMarket, setSelectedMarket] = useState<Market | null>(null)
  const [betAmount, setBetAmount] = useState(0.1)
  const [betSide, setBetSide] = useState('yes')
  const [selectedOption, setSelectedOption] = useState<string | null>(null)
  const [showBetModal, setShowBetModal] = useState(false)
  const [showAuthModal, setShowAuthModal] = useState(false)
  const [showProfileModal, setShowProfileModal] = useState(false)
  const [showWithdrawModal, setShowWithdrawModal] = useState(false)
  const [withdrawAddress, setWithdrawAddress] = useState('')
  const [withdrawAmount, setWithdrawAmount] = useState(0)
  const [isLogin, setIsLogin] = useState(true)
  const [authForm, setAuthForm] = useState({ email: '', username: '', password: '' })
  const [notification, setNotification] = useState<{ message: string; type: string } | null>(null)
  const [mounted, setMounted] = useState(false)
  
  // Cash Out states
  const [showCashOutModal, setShowCashOutModal] = useState(false)
  const [cashOutBet, setCashOutBet] = useState<Bet | null>(null)
  const [cashOutValue, setCashOutValue] = useState<{
    netCashOut: number
    fee: number
    profitLoss: number
    currentOdds: number
  } | null>(null)
  const [cashingOut, setCashingOut] = useState(false)

  const categories = ['All', 'Crypto', 'Tech', 'Finance', 'Politics', 'Sports']
  
  const CONFIG = {
    xLink: 'https://x.com/YOUR_X_HANDLE',
    dexscreenerLink: 'https://dexscreener.com/solana/YOUR_TOKEN_ADDRESS',
    contractAddress: 'YOUR_CONTRACT_ADDRESS_HERE'
  }

  useEffect(() => {
    setMounted(true)
    fetchMarkets()
    fetchLeaderboard()
    
    const savedUserId = localStorage.getItem('polygens_user_id')
    if (savedUserId) {
      fetchUser(savedUserId)
    }
  }, [])

  const fetchMarkets = async () => {
    const res = await fetch('/api/markets')
    const data = await res.json()
    setMarkets(data)
  }

  const fetchLeaderboard = async () => {
    const res = await fetch('/api/leaderboard')
    const data = await res.json()
    setLeaderboard(data)
  }

  const fetchUser = async (userId: string) => {
    try {
      const res = await fetch(`/api/user?id=${userId}`)
      const data = await res.json()
      if (res.ok && data.id) {
        setUser(data)
      } else {
        localStorage.removeItem('polygens_user_id')
      }
    } catch (error) {
      localStorage.removeItem('polygens_user_id')
    }
  }

  const showNotif = (message: string, type = 'success') => {
    setNotification({ message, type })
    setTimeout(() => setNotification(null), 3000)
  }

  const handleAuth = async () => {
    const endpoint = isLogin ? '/api/auth/login' : '/api/auth/register'
    const body = isLogin 
      ? { email: authForm.email, password: authForm.password }
      : authForm

    const res = await fetch(endpoint, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(body)
    })

    const data = await res.json()

    if (res.ok) {
      setUser({ ...data, bets: [] })
      localStorage.setItem('polygens_user_id', data.id)
      setShowAuthModal(false)
      setAuthForm({ email: '', username: '', password: '' })
      showNotif(isLogin ? 'Welcome back!' : 'Account created! Your Solana wallet is ready.')
      fetchUser(data.id)
      fetchLeaderboard()
    } else {
      showNotif(data.error, 'error')
    }
  }

  const placeBet = async () => {
    if (!user || !selectedMarket) return

    const body: any = {
      userId: user.id,
      marketId: selectedMarket.id,
      amount: betAmount,
    }

    if (selectedMarket.type === 'MULTIPLE_CHOICE') {
      if (!selectedOption) {
        showNotif('Please select an option', 'error')
        return
      }
      body.optionId = selectedOption
    } else {
      body.side = betSide
    }

    const res = await fetch('/api/bets', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(body)
    })

    const data = await res.json()

    if (res.ok) {
      const optionLabel = selectedMarket.type === 'MULTIPLE_CHOICE' 
        ? selectedMarket.options.find(o => o.id === selectedOption)?.label 
        : betSide.toUpperCase()
      showNotif(`Bet placed: ${betAmount} SOL on ${optionLabel}!`)
      setShowBetModal(false)
      setBetAmount(0.1)
      setSelectedOption(null)
      fetchUser(user.id)
      fetchMarkets()
      fetchLeaderboard()
    } else {
      showNotif(data.error, 'error')
    }
  }

  const getPotentialWin = () => {
    if (!selectedMarket) return 0
    if (selectedMarket.type === 'MULTIPLE_CHOICE') {
      const option = selectedMarket.options.find(o => o.id === selectedOption)
      if (!option) return 0
      return betAmount * (100 / option.odds)
    } else {
      const odds = betSide === 'yes' ? selectedMarket.yesOdds : (100 - selectedMarket.yesOdds)
      return betAmount * (100 / odds)
    }
  }

  const handleWithdraw = async () => {
    if (!user) return

    const res = await fetch('/api/wallet/withdraw', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        userId: user.id,
        toAddress: withdrawAddress,
        amount: withdrawAmount
      })
    })

    const data = await res.json()

    if (res.ok) {
      showNotif(`Withdrawn ${withdrawAmount} SOL successfully!`)
      setShowWithdrawModal(false)
      setWithdrawAddress('')
      setWithdrawAmount(0)
      fetchUser(user.id)
    } else {
      showNotif(data.error, 'error')
    }
  }

  const refreshBalance = async () => {
    if (!user) return
    showNotif('Refreshing balance...')
    await fetchUser(user.id)
    showNotif('Balance updated!')
  }

  const copyAddress = () => {
    if (user?.solanaAddress) {
      navigator.clipboard.writeText(user.solanaAddress)
      showNotif('Address copied!')
    }
  }

  const copyContract = () => {
    navigator.clipboard.writeText(CONFIG.contractAddress)
    showNotif('Contract address copied!')
  }

  const exportPrivateKey = async () => {
    if (!user) return
    
    const password = prompt('Enter your password to export private key:')
    if (!password) return
    
    const res = await fetch('/api/wallet/export', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ userId: user.id, password })
    })
    
    const data = await res.json()
    
    if (res.ok) {
      const confirmCopy = confirm(
        '⚠️ WARNING: Never share your private key with anyone!\n\n' +
        'Your Private Key:\n' + data.privateKey + '\n\n' +
        'Click OK to copy to clipboard.'
      )
      if (confirmCopy) {
        navigator.clipboard.writeText(data.privateKey)
        showNotif('Private key copied! Keep it safe!')
      }
    } else {
      showNotif(data.error, 'error')
    }
  }

  const handleLogout = () => {
    setUser(null)
    localStorage.removeItem('polygens_user_id')
    setShowProfileModal(false)
    showNotif('Logged out')
  }

  const getCashOutValue = async (betId: string) => {
    try {
      const res = await fetch(`/api/bets/cashout?betId=${betId}`)
      const data = await res.json()
      if (res.ok) {
        return data
      }
      return null
    } catch (error) {
      return null
    }
  }

  const openCashOutModal = async (bet: Bet) => {
    setCashOutBet(bet)
    setShowCashOutModal(true)
    setCashOutValue(null)
    
    const value = await getCashOutValue(bet.id)
    if (value) {
      setCashOutValue({
        netCashOut: value.netCashOut,
        fee: value.fee,
        profitLoss: value.profitLoss,
        currentOdds: value.currentOdds
      })
    }
  }

  const handleCashOut = async () => {
    if (!user || !cashOutBet) return
    
    setCashingOut(true)
    
    try {
      const res = await fetch('/api/bets/cashout', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          betId: cashOutBet.id,
          userId: user.id
        })
      })
      
      const data = await res.json()
      
      if (res.ok) {
        showNotif(`Cash out successful! Received ${data.cashOutValue.toFixed(4)} SOL`)
        setShowCashOutModal(false)
        setCashOutBet(null)
        setCashOutValue(null)
        fetchUser(user.id)
      } else {
        showNotif(data.error || 'Cash out failed', 'error')
      }
    } catch (error) {
      showNotif('Cash out failed', 'error')
    } finally {
      setCashingOut(false)
    }
  }

  const filteredMarkets = selectedCategory === 'All'
    ? markets
    : markets.filter(m => m.category === selectedCategory)

  // Calculate stats for display
  const totalVolume = markets.reduce((sum, m) => sum + m.volume, 0)
  const activeMarkets = markets.length
  const totalUsers = leaderboard.length

  return (
    <>
      <style jsx global>{`
        @import url('https://fonts.googleapis.com/css2?family=Inter:wght@400;500;600;700;800;900&family=Space+Grotesk:wght@400;500;600;700&family=Orbitron:wght@700;900&display=swap');
        
        * {
          box-sizing: border-box;
          -webkit-tap-highlight-color: transparent;
        }
        
        body {
          margin: 0;
          padding: 0;
          overflow-x: hidden;
          background: #050508;
        }

        ::-webkit-scrollbar {
          width: 8px;
        }
        ::-webkit-scrollbar-track {
          background: rgba(255,255,255,0.02);
        }
        ::-webkit-scrollbar-thumb {
          background: rgba(0,210,211,0.3);
          border-radius: 4px;
        }
        ::-webkit-scrollbar-thumb:hover {
          background: rgba(0,210,211,0.5);
        }
        
        @keyframes float {
          0%, 100% { transform: translateY(0) rotate(0deg); }
          50% { transform: translateY(-20px) rotate(3deg); }
        }
        
        @keyframes pulse {
          0%, 100% { opacity: 0.4; transform: scale(1); }
          50% { opacity: 0.8; transform: scale(1.05); }
        }
        
        @keyframes slideUp {
          from { opacity: 0; transform: translateY(40px); }
          to { opacity: 1; transform: translateY(0); }
        }
        
        @keyframes slideIn {
          from { opacity: 0; transform: translateX(-20px); }
          to { opacity: 1; transform: translateX(0); }
        }
        
        @keyframes glow {
          0%, 100% { 
            box-shadow: 0 0 20px rgba(0, 210, 211, 0.3),
                        0 0 40px rgba(0, 210, 211, 0.1);
          }
          50% { 
            box-shadow: 0 0 30px rgba(0, 210, 211, 0.5),
                        0 0 60px rgba(0, 210, 211, 0.2);
          }
        }
        
        @keyframes shimmer {
          0% { background-position: -200% center; }
          100% { background-position: 200% center; }
        }
        
        @keyframes rotate {
          from { transform: rotate(0deg); }
          to { transform: rotate(360deg); }
        }
        
        @keyframes scaleIn {
          from { opacity: 0; transform: scale(0.95); }
          to { opacity: 1; transform: scale(1); }
        }
        
        @keyframes borderGlow {
          0%, 100% { border-color: rgba(0, 210, 211, 0.3); }
          50% { border-color: rgba(0, 210, 211, 0.7); }
        }

        @keyframes gradientFlow {
          0% { background-position: 0% 50%; }
          50% { background-position: 100% 50%; }
          100% { background-position: 0% 50%; }
        }

        @keyframes breathe {
          0%, 100% { transform: scale(1); opacity: 0.6; }
          50% { transform: scale(1.02); opacity: 0.8; }
        }

        @keyframes morphGradient {
          0%, 100% { border-radius: 60% 40% 30% 70% / 60% 30% 70% 40%; }
          50% { border-radius: 30% 60% 70% 40% / 50% 60% 30% 60%; }
        }
        
        .animate-float { animation: float 8s ease-in-out infinite; }
        .animate-pulse-slow { animation: pulse 4s ease-in-out infinite; }
        .animate-glow { animation: glow 3s ease-in-out infinite; }
        .animate-shimmer { 
          background: linear-gradient(90deg, transparent, rgba(255,255,255,0.08), transparent);
          background-size: 200% 100%;
          animation: shimmer 3s infinite;
        }
        .animate-rotate { animation: rotate 30s linear infinite; }
        .animate-border-glow { animation: borderGlow 2s ease-in-out infinite; }
        .animate-breathe { animation: breathe 4s ease-in-out infinite; }
        .animate-morph { animation: morphGradient 15s ease-in-out infinite; }
        
        .card-hover {
          transition: all 0.5s cubic-bezier(0.23, 1, 0.32, 1);
        }
        .card-hover:hover {
          transform: translateY(-8px);
          box-shadow: 0 25px 50px -12px rgba(0, 210, 211, 0.25),
                      0 0 0 1px rgba(0, 210, 211, 0.1);
        }
        
        .btn-hover {
          transition: all 0.3s cubic-bezier(0.23, 1, 0.32, 1);
          position: relative;
          overflow: hidden;
        }
        .btn-hover::before {
          content: '';
          position: absolute;
          top: 0;
          left: -100%;
          width: 100%;
          height: 100%;
          background: linear-gradient(90deg, transparent, rgba(255,255,255,0.2), transparent);
          transition: left 0.5s;
        }
        .btn-hover:hover::before {
          left: 100%;
        }
        .btn-hover:hover {
          transform: translateY(-3px);
          box-shadow: 0 15px 35px rgba(102, 126, 234, 0.4);
        }
        .btn-hover:active {
          transform: translateY(-1px);
        }
        
        .nav-btn {
          transition: all 0.3s cubic-bezier(0.23, 1, 0.32, 1);
        }
        .nav-btn:hover {
          background: rgba(255,255,255,0.1);
          transform: scale(1.05);
        }
        
        .social-hover:hover {
          background: linear-gradient(135deg, #00d2d3, #0abde3) !important;
          color: #fff !important;
          border-color: transparent !important;
          transform: translateY(-4px) scale(1.1);
          box-shadow: 0 15px 35px rgba(0, 210, 211, 0.4);
        }
        
        .modal-enter {
          animation: scaleIn 0.4s cubic-bezier(0.23, 1, 0.32, 1);
        }
        
        .stagger-1 { animation: slideUp 0.7s ease-out 0.1s both; }
        .stagger-2 { animation: slideUp 0.7s ease-out 0.2s both; }
        .stagger-3 { animation: slideUp 0.7s ease-out 0.3s both; }
        .stagger-4 { animation: slideUp 0.7s ease-out 0.4s both; }
        .stagger-5 { animation: slideUp 0.7s ease-out 0.5s both; }
        
        .option-btn {
          transition: all 0.3s ease;
        }
        .option-btn:hover {
          transform: scale(1.02);
        }
        .option-btn.selected {
          border-color: #00d2d3 !important;
          background: rgba(0, 210, 211, 0.15) !important;
        }

        .glass {
          background: rgba(255, 255, 255, 0.03);
          backdrop-filter: blur(20px);
          -webkit-backdrop-filter: blur(20px);
          border: 1px solid rgba(255, 255, 255, 0.08);
        }

        .glass-strong {
          background: rgba(10, 10, 20, 0.8);
          backdrop-filter: blur(40px);
          -webkit-backdrop-filter: blur(40px);
          border: 1px solid rgba(255, 255, 255, 0.1);
        }

        .gradient-text {
          background: linear-gradient(135deg, #fff 0%, #00d2d3 50%, #667eea 100%);
          -webkit-background-clip: text;
          -webkit-text-fill-color: transparent;
          background-clip: text;
        }

        .glow-text {
          text-shadow: 0 0 40px rgba(0, 210, 211, 0.5),
                       0 0 80px rgba(0, 210, 211, 0.3);
        }
        
        /* ========== MOBILE RESPONSIVE ========== */
        @media (max-width: 768px) {
          .card-hover:hover {
            transform: none !important;
            box-shadow: none !important;
          }
          .btn-hover:hover {
            transform: none !important;
          }
          .nav-btn:hover {
            transform: none !important;
          }
          .social-hover:hover {
            transform: none !important;
          }
          .mobile-header {
            flex-wrap: wrap !important;
            padding: 12px !important;
            gap: 10px !important;
          }
          .mobile-nav {
            order: 3 !important;
            width: 100% !important;
            justify-content: center !important;
            gap: 6px !important;
          }
          .mobile-nav button {
            padding: 10px 16px !important;
            font-size: 12px !important;
          }
          .mobile-hide-text {
            display: none !important;
          }
          .mobile-logo-text {
            font-size: 20px !important;
          }
          .mobile-logo-icon {
            font-size: 28px !important;
          }
          .mobile-user-info {
            padding: 6px 10px !important;
            gap: 8px !important;
          }
          .mobile-avatar {
            width: 34px !important;
            height: 34px !important;
            font-size: 14px !important;
          }
          .mobile-balance {
            font-size: 13px !important;
          }
          .mobile-hero-title {
            font-size: 32px !important;
            line-height: 1.1 !important;
          }
          .mobile-hero-subtitle {
            font-size: 14px !important;
            padding: 0 10px !important;
          }
          .mobile-main {
            padding: 20px 12px !important;
          }
          .mobile-section-title {
            font-size: 24px !important;
          }
          .mobile-stats-row {
            grid-template-columns: 1fr !important;
            gap: 12px !important;
          }
          .mobile-stat-card {
            padding: 20px !important;
          }
          .mobile-stat-value {
            font-size: 24px !important;
          }
          .mobile-leaderboard-header,
          .mobile-leaderboard-row {
            grid-template-columns: 35px 1fr 70px !important;
            padding: 12px !important;
            font-size: 13px !important;
          }
          .mobile-lb-bets {
            display: none !important;
          }
          .mobile-footer {
            padding: 30px 16px !important;
            gap: 20px !important;
          }
          .mobile-contract-box {
            flex-direction: column !important;
            gap: 10px !important;
            padding: 14px !important;
          }
          .mobile-contract-address {
            font-size: 11px !important;
            text-align: center !important;
            white-space: normal !important;
            word-break: break-all !important;
          }
          .mobile-modal {
            margin: 12px !important;
            padding: 20px !important;
            max-height: 90vh !important;
            border-radius: 16px !important;
          }
          .mobile-modal-title {
            font-size: 20px !important;
          }
          .mobile-quick-amounts {
            flex-wrap: wrap !important;
          }
          .mobile-quick-amounts button {
            flex: 1 1 45% !important;
          }
        }
        
        @media (max-width: 480px) {
          .mobile-nav button {
            padding: 8px 12px !important;
            font-size: 11px !important;
          }
          .mobile-hero-title {
            font-size: 26px !important;
          }
          .mobile-categories {
            gap: 6px !important;
          }
          .mobile-categories button {
            padding: 8px 12px !important;
            font-size: 11px !important;
          }
        }
      `}</style>
      
      <div style={styles.container}>
        {/* Enhanced Animated Background */}
        <div style={styles.bgContainer}>
          <div style={styles.bgGradient} />
          <div className="animate-rotate" style={styles.bgOrb1} />
          <div className="animate-rotate" style={{...styles.bgOrb2, animationDirection: 'reverse', animationDuration: '40s'}} />
          <div className="animate-breathe" style={styles.bgOrb3} />
          <div className="animate-morph" style={styles.bgOrb4} />
          <div style={styles.gridOverlay} />
          <div style={styles.noiseOverlay} />
          {/* Gradient line accents */}
          <div style={styles.accentLine1} />
          <div style={styles.accentLine2} />
        </div>

        {/* Enhanced Floating Particles */}
        {mounted && [...Array(8)].map((_, i) => (
          <div
            key={i}
            className="animate-float"
            style={{
              ...styles.particle,
              left: `${5 + i * 12}%`,
              top: `${15 + (i % 4) * 20}%`,
              animationDelay: `${i * 0.7}s`,
              animationDuration: `${6 + i}s`,
              width: 6 + i * 3,
              height: 6 + i * 3,
              opacity: 0.4 + (i * 0.05),
            }}
          />
        ))}

        {/* Notification */}
        {notification && (
          <div style={{
            ...styles.notification,
            background: notification.type === 'error' 
              ? 'linear-gradient(135deg, rgba(255,71,87,0.95), rgba(255,56,56,0.95))' 
              : 'linear-gradient(135deg, rgba(0,210,211,0.95), rgba(10,189,227,0.95))',
            animation: 'slideIn 0.4s cubic-bezier(0.23, 1, 0.32, 1)'
          }}>
            <span style={{marginRight: 8}}>{notification.type === 'error' ? '⚠️' : '✓'}</span>
            {notification.message}
          </div>
        )}

        {/* Enhanced Header */}
        <header style={styles.header} className="mobile-header glass-strong">
          <div style={styles.logo}>
            <div className="animate-glow" style={styles.logoIconContainer}>
              <span className="mobile-logo-icon" style={styles.logoIcon}>◈</span>
            </div>
            <span style={styles.logoText} className="mobile-logo-text">
              POLY<span style={styles.logoAccent}>GENS</span>
            </span>
          </div>
          
          <nav style={styles.nav} className="mobile-nav">
            {['markets', 'portfolio', 'leaderboard'].map(tab => (
              <button
                key={tab}
                className="nav-btn"
                style={activeTab === tab ? styles.navButtonActive : styles.navButton}
                onClick={() => setActiveTab(tab)}
              >
                <span style={{fontSize: 16}}>{tab === 'markets' ? '📊' : tab === 'portfolio' ? '💼' : '🏆'}</span>
                <span className="mobile-hide-text" style={{fontWeight: 500}}>{tab.charAt(0).toUpperCase() + tab.slice(1)}</span>
              </button>
            ))}
          </nav>

          {user ? (
            <div style={styles.userInfo} onClick={() => setShowProfileModal(true)} className="card-hover mobile-user-info">
              <div style={styles.balanceBox}>
                <span style={styles.balanceLabel}>BALANCE</span>
                <span style={styles.balanceValue} className="mobile-balance">{(user.solBalance || 0).toFixed(4)} SOL</span>
              </div>
              <div className="animate-border-glow mobile-avatar" style={styles.avatar}>
                {user.username.charAt(0).toUpperCase()}
              </div>
            </div>
          ) : (
            <button className="btn-hover" style={styles.loginBtn} onClick={() => setShowAuthModal(true)}>
              <span style={{marginRight: 8}}>🔗</span> Connect
            </button>
          )}
        </header>

        {/* Main Content */}
        <main style={styles.main} className="mobile-main">
          {activeTab === 'markets' && (
            <>
              {/* Enhanced Hero Section */}
              <div style={styles.hero} className="stagger-1">
                <div style={styles.heroBadge}>
                  <span style={styles.heroBadgeDot} />
                  <span>Live Prediction Markets</span>
                </div>
                <h1 style={styles.heroTitle} className="mobile-hero-title gradient-text glow-text">
                  Predict the Future
                </h1>
                <p style={styles.heroSubtitle} className="mobile-hero-subtitle">
                  Trade on real-world events with SOL. Make predictions, earn rewards.
                </p>
                
                {/* Quick Stats Bar */}
                <div style={styles.quickStats} className="stagger-2">
                  <div style={styles.quickStat}>
                    <span style={styles.quickStatValue}>{totalVolume.toFixed(2)}</span>
                    <span style={styles.quickStatLabel}>SOL Volume</span>
                  </div>
                  <div style={styles.quickStatDivider} />
                  <div style={styles.quickStat}>
                    <span style={styles.quickStatValue}>{activeMarkets}</span>
                    <span style={styles.quickStatLabel}>Active Markets</span>
                  </div>
                  <div style={styles.quickStatDivider} />
                  <div style={styles.quickStat}>
                    <span style={styles.quickStatValue}>{totalUsers}</span>
                    <span style={styles.quickStatLabel}>Traders</span>
                  </div>
                </div>
              </div>

              {/* Enhanced Categories */}
              <div style={styles.categories} className="stagger-2 mobile-categories">
                {categories.map(cat => (
                  <button
                    key={cat}
                    className="nav-btn"
                    style={selectedCategory === cat ? styles.categoryActive : styles.category}
                    onClick={() => setSelectedCategory(cat)}
                  >
                    {cat === 'All' && '🌐 '}
                    {cat === 'Crypto' && '₿ '}
                    {cat === 'Tech' && '💻 '}
                    {cat === 'Finance' && '📈 '}
                    {cat === 'Politics' && '🏛️ '}
                    {cat === 'Sports' && '⚽ '}
                    {cat}
                  </button>
                ))}
              </div>

              {/* Enhanced Markets Grid */}
              <div style={styles.marketsGrid}>
                {filteredMarkets.map((market, index) => (
                  <div 
                    key={market.id} 
                    className="card-hover glass"
                    style={{
                      ...styles.marketCard,
                      animation: `slideUp 0.6s ease-out ${0.1 * index}s both`
                    }}
                  >
                    {market.trending && (
                      <div className="animate-shimmer" style={styles.trendingBadge}>
                        <span style={{marginRight: 4}}>🔥</span> Trending
                      </div>
                    )}
                    
                    {market.imageUrl && (
                      <div style={styles.marketImageContainer}>
                        <img src={market.imageUrl} alt="" style={styles.marketImage} />
                        <div style={styles.marketImageOverlay} />
                      </div>
                    )}
                    
                    <div style={styles.marketCategory}>
                      {market.type === 'MULTIPLE_CHOICE' && <span style={styles.mcBadge}>MULTI</span>}
                      <span>{market.category}</span>
                    </div>
                    
                    <h3 style={styles.marketQuestion}>{market.question}</h3>
                    
                    {market.type === 'BINARY' ? (
                      <div style={styles.oddsBar}>
                        <div style={{...styles.yesBar, width: `${market.yesOdds}%`}}>
                          <span style={styles.oddsLabel}>YES</span>
                          <span style={styles.oddsValue}>{market.yesOdds}%</span>
                        </div>
                        <div style={{...styles.noBar, width: `${100 - market.yesOdds}%`}}>
                          <span style={styles.oddsLabel}>NO</span>
                          <span style={styles.oddsValue}>{100 - market.yesOdds}%</span>
                        </div>
                      </div>
                    ) : (
                      <div style={styles.optionsPreview}>
                        {market.options && market.options.slice(0, 3).map((option, idx) => (
                          <div key={option.id} style={styles.optionPreviewRow}>
                            <span style={styles.optionLabel}>{option.label}</span>
                            <div style={styles.optionBarContainer}>
                              <div style={{
                                ...styles.optionBar, 
                                width: `${option.odds}%`,
                                background: `linear-gradient(90deg, ${idx === 0 ? '#00d2d3' : idx === 1 ? '#667eea' : '#764ba2'}, transparent)`
                              }} />
                              <span style={styles.optionOdds}>{option.odds.toFixed(0)}%</span>
                            </div>
                          </div>
                        ))}
                        {market.options && market.options.length > 3 && (
                          <span style={styles.moreOptions}>+{market.options.length - 3} more options</span>
                        )}
                      </div>
                    )}

                    <div style={styles.marketMeta}>
                      <div style={styles.metaItem}>
                        <span style={styles.metaIcon}>📊</span>
                        <span>{market.volume.toFixed(4)} SOL</span>
                      </div>
                      <div style={styles.metaItem}>
                        <span style={styles.metaIcon}>⏰</span>
                        <span>{new Date(market.endDate).toLocaleDateString()}</span>
                      </div>
                    </div>

                    <button 
                      className="btn-hover"
                      style={styles.betButton} 
                      onClick={() => {
                        if (!user) {
                          setShowAuthModal(true)
                        } else {
                          setSelectedMarket(market)
                          setSelectedOption(null)
                          setBetSide('yes')
                          setShowBetModal(true)
                        }
                      }}
                    >
                      <span style={{marginRight: 8}}>🎯</span> Place Bet
                    </button>
                  </div>
                ))}
              </div>
            </>
          )}

          {activeTab === 'portfolio' && (
            <div style={styles.portfolioSection}>
              <h2 style={styles.sectionTitle} className="stagger-1 mobile-section-title gradient-text">Your Portfolio</h2>
              
              {!user ? (
                <div style={styles.emptyState} className="stagger-2 glass">
                  <div style={styles.emptyIcon}>💼</div>
                  <p style={styles.emptyText}>Connect your account to view your portfolio</p>
                  <button className="btn-hover" style={styles.ctaButton} onClick={() => setShowAuthModal(true)}>
                    <span style={{marginRight: 8}}>🔗</span> Connect Now
                  </button>
                </div>
              ) : (
                <>
                  <div style={styles.statsRow} className="mobile-stats-row">
                    {[
                      { value: `${(user.solBalance || 0).toFixed(4)} SOL`, label: 'Current Balance', icon: '💰' },
                      { value: user.bets?.filter(b => b.status === 'active').length || 0, label: 'Active Bets', icon: '🎯' },
                      { value: `${(user.bets?.filter(b => b.status === 'active').reduce((sum, b) => sum + b.potentialWin, 0) || 0).toFixed(4)} SOL`, label: 'Potential Winnings', icon: '🏆' }
                    ].map((stat, i) => (
                      <div key={i} className="card-hover glass" style={{...styles.statCard, animation: `slideUp 0.6s ease-out ${0.2 + i * 0.1}s both`}}>
                        <div style={styles.statIcon}>{stat.icon}</div>
                        <div style={styles.statValue} className="mobile-stat-value gradient-text">{stat.value}</div>
                        <div style={styles.statLabel}>{stat.label}</div>
                      </div>
                    ))}
                  </div>

                  <h3 style={styles.subsectionTitle} className="stagger-4">Active Bets</h3>
                  {(!user.bets || user.bets.length === 0) ? (
                    <div style={styles.emptyState} className="stagger-5 glass">
                      <div style={styles.emptyIcon}>📊</div>
                      <p style={styles.emptyText}>No bets placed yet</p>
                      <button className="btn-hover" style={styles.ctaButton} onClick={() => setActiveTab('markets')}>
                        <span style={{marginRight: 8}}>🔍</span> Explore Markets
                      </button>
                    </div>
                  ) : (
                    <div style={styles.betsList}>
                      {user.bets.map((bet, i) => (
                        <div 
                          key={bet.id} 
                          className="card-hover glass"
                          style={{...styles.betCard, animation: `slideUp 0.6s ease-out ${0.3 + i * 0.1}s both`}}
                        >
                          <div style={styles.betHeader}>
                            <span style={bet.side === 'yes' || bet.option ? styles.betSideYes : styles.betSideNo}>
                              {bet.option ? bet.option.label : (bet.side ? bet.side.toUpperCase() : 'N/A')}
                            </span>
                            <span style={{
                              ...styles.betStatus,
                              background: bet.status === 'won' ? 'rgba(0,210,211,0.2)' 
                                : bet.status === 'lost' ? 'rgba(255,107,107,0.2)' 
                                : bet.status === 'cashed_out' ? 'rgba(255,193,7,0.2)'
                                : 'rgba(255,255,255,0.1)',
                              color: bet.status === 'won' ? '#00d2d3' 
                                : bet.status === 'lost' ? '#ff6b6b' 
                                : bet.status === 'cashed_out' ? '#ffc107'
                                : '#888'
                            }}>
                              {bet.status === 'cashed_out' ? '💰 CASHED OUT' : bet.status.toUpperCase()}
                            </span>
                          </div>
                          <p style={styles.betQuestion}>{bet.market.question}</p>
                          <div style={styles.betFooter}>
                            <div style={styles.betFooterItem}>
                              <span style={styles.betFooterLabel}>Stake</span>
                              <span style={styles.betFooterValue}>{bet.amount.toFixed(4)} SOL</span>
                            </div>
                            <div style={styles.betFooterItem}>
                              <span style={styles.betFooterLabel}>Potential</span>
                              <span style={{...styles.betFooterValue, color: '#00d2d3'}}>{bet.potentialWin.toFixed(4)} SOL</span>
                            </div>
                          </div>
                          
                          {bet.status === 'active' && (
                            <button
                              className="btn-hover"
                              style={styles.cashOutBtn}
                              onClick={() => openCashOutModal(bet)}
                            >
                              💰 Cash Out Early
                            </button>
                          )}
                        </div>
                      ))}
                    </div>
                  )}
                </>
              )}
            </div>
          )}

          {activeTab === 'leaderboard' && (
            <div style={styles.leaderboardSection}>
              <h2 style={styles.sectionTitle} className="stagger-1 mobile-section-title gradient-text">🏆 Global Leaderboard</h2>
              <p style={styles.leaderboardSubtitle} className="stagger-2">Top predictors competing for glory</p>
              
              {leaderboard.length === 0 ? (
                <div style={styles.emptyState} className="stagger-3 glass">
                  <div style={styles.emptyIcon}>🏆</div>
                  <p style={styles.emptyText}>No traders yet. Be the first!</p>
                  <button className="btn-hover" style={styles.ctaButton} onClick={() => setShowAuthModal(true)}>
                    <span style={{marginRight: 8}}>🚀</span> Join Now
                  </button>
                </div>
              ) : (
                <div style={styles.leaderboardTable} className="stagger-3 glass">
                  <div style={styles.leaderboardHeader} className="mobile-leaderboard-header">
                    <span>Rank</span>
                    <span>Trader</span>
                    <span className="mobile-lb-bets">Bets</span>
                    <span>Balance</span>
                  </div>
                  {leaderboard.map((player, index) => (
                    <div 
                      key={player.rank}
                      className="card-hover mobile-leaderboard-row"
                      style={{
                        ...styles.leaderboardRow,
                        background: player.rank <= 3 
                          ? `linear-gradient(90deg, ${player.rank === 1 ? 'rgba(255,215,0,0.15)' : player.rank === 2 ? 'rgba(192,192,192,0.15)' : 'rgba(205,127,50,0.15)'}, transparent)` 
                          : 'transparent',
                        animation: `slideIn 0.4s ease-out ${0.1 * index}s both`
                      }}
                    >
                      <span style={styles.lbRank}>
                        {player.rank <= 3 ? player.badge : `#${player.rank}`}
                      </span>
                      <span style={styles.lbUser}>
                        <span style={styles.lbUserAvatar}>{player.username.charAt(0).toUpperCase()}</span>
                        {player.username}
                      </span>
                      <span style={styles.lbBets} className="mobile-lb-bets">{player.totalBets}</span>
                      <span style={styles.lbBalance}>{(player.solBalance || 0).toFixed(4)} SOL</span>
                    </div>
                  ))}
                </div>
              )}
            </div>
          )}
        </main>

        {/* Enhanced Footer */}
        <footer style={styles.footer} className="glass-strong">
          <div style={styles.footerContent} className="mobile-footer">
            <div style={styles.footerLogo}>
              <span style={styles.footerLogoIcon}>◈</span>
              <span style={styles.footerLogoText}>POLY<span style={styles.logoAccent}>GENS</span></span>
            </div>
            
            <div style={styles.footerLinks}>
              <a 
                href={CONFIG.xLink}
                target="_blank" 
                rel="noopener noreferrer"
                className="social-hover"
                style={styles.socialLink}
              >
                <svg width="20" height="20" viewBox="0 0 24 24" fill="currentColor">
                  <path d="M18.244 2.25h3.308l-7.227 8.26 8.502 11.24H16.17l-5.214-6.817L4.99 21.75H1.68l7.73-8.835L1.254 2.25H8.08l4.713 6.231zm-1.161 17.52h1.833L7.084 4.126H5.117z"/>
                </svg>
              </a>
              
              <a 
                href={CONFIG.dexscreenerLink}
                target="_blank" 
                rel="noopener noreferrer"
                className="social-hover"
                style={styles.socialLink}
              >
                <svg width="20" height="20" viewBox="0 0 24 24" fill="currentColor">
                  <path d="M12 2C6.48 2 2 6.48 2 12s4.48 10 10 10 10-4.48 10-10S17.52 2 12 2zm-1 17.93c-3.95-.49-7-3.85-7-7.93 0-.62.08-1.21.21-1.79L9 15v1c0 1.1.9 2 2 2v1.93zm6.9-2.54c-.26-.81-1-1.39-1.9-1.39h-1v-3c0-.55-.45-1-1-1H8v-2h2c.55 0 1-.45 1-1V7h2c1.1 0 2-.9 2-2v-.41c2.93 1.19 5 4.06 5 7.41 0 2.08-.8 3.97-2.1 5.39z"/>
                </svg>
              </a>
            </div>

            <div style={styles.contractSection}>
              <span style={styles.contractLabel}>CONTRACT ADDRESS</span>
              <div style={styles.contractBox} className="mobile-contract-box glass">
                <span style={styles.contractAddress} className="mobile-contract-address">{CONFIG.contractAddress}</span>
                <button 
                  className="btn-hover"
                  style={styles.contractCopyBtn}
                  onClick={copyContract}
                >
                  Copy
                </button>
              </div>
            </div>

            <div style={styles.footerBottom}>
              <p style={styles.footerText}>© 2024 Polygens. Decentralized Predictions.</p>
              <p style={styles.footerTextHighlight}>Built on Solana ⚡</p>
            </div>
          </div>
        </footer>

        {/* Bet Modal */}
        {showBetModal && selectedMarket && (
          <div style={styles.modalOverlay} onClick={() => setShowBetModal(false)}>
            <div className="modal-enter mobile-modal glass-strong" style={styles.modal} onClick={e => e.stopPropagation()}>
              <button style={styles.closeModal} onClick={() => setShowBetModal(false)}>×</button>
              <h2 style={styles.modalTitle} className="mobile-modal-title gradient-text">Place Your Bet</h2>
              <p style={styles.modalQuestion}>{selectedMarket.question}</p>
              
              {selectedMarket.type === 'BINARY' ? (
                <div style={styles.sideSelector}>
                  <button 
                    className="btn-hover"
                    style={betSide === 'yes' ? styles.sideYesActive : styles.sideYes}
                    onClick={() => setBetSide('yes')}
                  >
                    <span style={styles.sideLabel}>YES</span>
                    <span style={styles.sideOdds}>{selectedMarket.yesOdds}%</span>
                  </button>
                  <button 
                    className="btn-hover"
                    style={betSide === 'no' ? styles.sideNoActive : styles.sideNo}
                    onClick={() => setBetSide('no')}
                  >
                    <span style={styles.sideLabel}>NO</span>
                    <span style={styles.sideOdds}>{100 - selectedMarket.yesOdds}%</span>
                  </button>
                </div>
              ) : (
                <div style={styles.optionsSelector}>
                  {selectedMarket.options && selectedMarket.options.map(option => (
                    <button
                      key={option.id}
                      className={`option-btn ${selectedOption === option.id ? 'selected' : ''}`}
                      style={{
                        ...styles.optionSelectBtn,
                        borderColor: selectedOption === option.id ? '#00d2d3' : 'rgba(255,255,255,0.1)',
                        background: selectedOption === option.id ? 'rgba(0,210,211,0.15)' : 'rgba(255,255,255,0.03)'
                      }}
                      onClick={() => setSelectedOption(option.id)}
                    >
                      <span style={styles.optionSelectLabel}>{option.label}</span>
                      <span style={styles.optionSelectOdds}>{option.odds.toFixed(0)}% → {(100/option.odds).toFixed(2)}x</span>
                    </button>
                  ))}
                </div>
              )}

              <div style={styles.amountSection}>
                <label style={styles.amountLabel}>Amount (SOL)</label>
                <input 
                  type="number" 
                  step="0.01"
                  value={betAmount} 
                  onChange={e => setBetAmount(Math.max(0, parseFloat(e.target.value) || 0))}
                  style={styles.input}
                />
                <div style={styles.quickAmounts} className="mobile-quick-amounts">
                  {[0.05, 0.1, 0.25, 0.5].map(amount => (
                    <button key={amount} className="nav-btn" style={styles.quickAmount} onClick={() => setBetAmount(amount)}>
                      {amount} SOL
                    </button>
                  ))}
                </div>
              </div>

              <div className="animate-glow" style={styles.potentialWin}>
                <span style={styles.potentialLabel}>Potential Payout</span>
                <span style={styles.potentialValue}>
                  {getPotentialWin().toFixed(4)} SOL
                </span>
              </div>

              <button className="btn-hover" style={styles.confirmBet} onClick={placeBet}>
                <span style={{marginRight: 8}}>🎯</span> Confirm Bet
              </button>
            </div>
          </div>
        )}

        {/* Auth Modal */}
        {showAuthModal && (
          <div style={styles.modalOverlay} onClick={() => setShowAuthModal(false)}>
            <div className="modal-enter mobile-modal glass-strong" style={styles.modal} onClick={e => e.stopPropagation()}>
              <button style={styles.closeModal} onClick={() => setShowAuthModal(false)}>×</button>
              <h2 style={styles.modalTitle} className="mobile-modal-title gradient-text">{isLogin ? 'Welcome Back' : 'Join Polygens'}</h2>
              
              {!isLogin && (
                <div className="animate-shimmer" style={styles.walletNotice}>
                  <span style={{marginRight: 8}}>🔐</span>
                  A Solana wallet will be automatically created for you
                </div>
              )}
              
              <div style={styles.authForm}>
                {!isLogin && (
                  <div style={styles.inputGroup}>
                    <label style={styles.inputLabel}>Username</label>
                    <input
                      type="text"
                      placeholder="Choose a username"
                      value={authForm.username}
                      onChange={e => setAuthForm({...authForm, username: e.target.value})}
                      style={styles.input}
                    />
                  </div>
                )}
                <div style={styles.inputGroup}>
                  <label style={styles.inputLabel}>Email</label>
                  <input
                    type="email"
                    placeholder="your@email.com"
                    value={authForm.email}
                    onChange={e => setAuthForm({...authForm, email: e.target.value})}
                    style={styles.input}
                  />
                </div>
                <div style={styles.inputGroup}>
                  <label style={styles.inputLabel}>Password</label>
                  <input
                    type="password"
                    placeholder="••••••••"
                    value={authForm.password}
                    onChange={e => setAuthForm({...authForm, password: e.target.value})}
                    style={styles.input}
                  />
                </div>
                <button className="btn-hover" style={styles.confirmBet} onClick={handleAuth}>
                  {isLogin ? '🔓 Sign In' : '🚀 Create Account'}
                </button>
                <p style={styles.authSwitch}>
                  {isLogin ? "Don't have an account? " : "Already have an account? "}
                  <span style={styles.authLink} onClick={() => setIsLogin(!isLogin)}>
                    {isLogin ? 'Sign Up' : 'Sign In'}
                  </span>
                </p>
              </div>
            </div>
          </div>
        )}

        {/* Profile Modal */}
        {showProfileModal && user && (
          <div style={styles.modalOverlay} onClick={() => setShowProfileModal(false)}>
            <div className="modal-enter mobile-modal glass-strong" style={styles.modal} onClick={e => e.stopPropagation()}>
              <button style={styles.closeModal} onClick={() => setShowProfileModal(false)}>×</button>
              <h2 style={styles.modalTitle} className="mobile-modal-title gradient-text">Your Profile</h2>
              
              <div style={styles.profileInfo}>
                <div className="animate-border-glow" style={styles.profileAvatar}>{user.username.charAt(0).toUpperCase()}</div>
                <h3 style={styles.profileUsername}>{user.username}</h3>
                <p style={styles.profileEmail}>{user.email}</p>
              </div>

              <div style={styles.walletSection} className="glass">
                <h4 style={styles.walletTitle}>💳 Your Solana Wallet</h4>
                {user.solanaAddress ? (
                  <>
                    <div style={styles.walletAddress}>
                      <span style={styles.addressText}>
                        {user.solanaAddress.slice(0, 16)}...{user.solanaAddress.slice(-8)}
                      </span>
                      <button className="btn-hover" style={styles.copyBtn} onClick={copyAddress}>Copy</button>
                    </div>
                    <div style={styles.walletBalance}>
                      <span>Balance:</span>
                      <span style={styles.solBalance}>{(user.solBalance || 0).toFixed(4)} SOL</span>
                      <button className="nav-btn" style={styles.refreshBtn} onClick={refreshBalance}>↻</button>
                    </div>
                    <button 
                      className="btn-hover"
                      style={styles.exportPkBtn}
                      onClick={exportPrivateKey}
                    >
                      🔑 Export Private Key
                    </button>
                  </>
                ) : (
                  <p style={{color: '#888'}}>No wallet generated</p>
                )}
              </div>

              <div style={styles.depositSection}>
                <h4 style={styles.depositTitle}>📥 Deposit SOL</h4>
                <p style={styles.depositText}>Send SOL to your wallet address above to start betting.</p>
              </div>

              <div style={styles.withdrawSection}>
                <button 
                  className="btn-hover"
                  style={styles.withdrawBtn} 
                  onClick={() => { setShowProfileModal(false); setShowWithdrawModal(true); }}
                >
                  📤 Withdraw SOL
                </button>
              </div>

              <button 
                style={styles.logoutBtn} 
                onClick={handleLogout}
              >
                Logout
              </button>
            </div>
          </div>
        )}

        {/* Withdraw Modal */}
        {showWithdrawModal && user && (
          <div style={styles.modalOverlay} onClick={() => setShowWithdrawModal(false)}>
            <div className="modal-enter mobile-modal glass-strong" style={styles.modal} onClick={e => e.stopPropagation()}>
              <button style={styles.closeModal} onClick={() => setShowWithdrawModal(false)}>×</button>
              <h2 style={styles.modalTitle} className="mobile-modal-title gradient-text">Withdraw SOL</h2>
              
              <p style={styles.withdrawBalance}>
                Available: <strong style={{color: '#00d2d3'}}>{(user.solBalance || 0).toFixed(4)} SOL</strong>
              </p>

              <div style={styles.formGroup}>
                <label style={styles.amountLabel}>Destination Wallet Address</label>
                <input 
                  type="text" 
                  placeholder="Enter Solana wallet address"
                  value={withdrawAddress}
                  onChange={e => setWithdrawAddress(e.target.value)}
                  style={styles.input}
                />
              </div>

              <div style={styles.formGroup}>
                <label style={styles.amountLabel}>Amount (SOL)</label>
                <input 
                  type="number" 
                  step="0.001"
                  placeholder="0.00"
                  value={withdrawAmount || ''}
                  onChange={e => setWithdrawAmount(parseFloat(e.target.value) || 0)}
                  style={styles.input}
                />
                <button 
                  className="nav-btn"
                  style={styles.maxBtn}
                  onClick={() => setWithdrawAmount(Math.max(0, (user.solBalance || 0) - 0.001))}
                >
                  MAX
                </button>
              </div>

              <p style={styles.feeNotice}>⚠️ A small fee (~0.001 SOL) will be deducted for transaction costs</p>

              <button className="btn-hover" style={styles.confirmBet} onClick={handleWithdraw}>
                Confirm Withdrawal
              </button>
            </div>
          </div>
        )}

        {/* Cash Out Modal */}
        {showCashOutModal && cashOutBet && (
          <div style={styles.modalOverlay} onClick={() => { setShowCashOutModal(false); setCashOutValue(null); }}>
            <div className="modal-enter mobile-modal glass-strong" style={styles.modal} onClick={e => e.stopPropagation()}>
              <button style={styles.closeModal} onClick={() => { setShowCashOutModal(false); setCashOutValue(null); }}>×</button>
              <h2 style={styles.modalTitle} className="gradient-text">💰 Cash Out</h2>
              
              <div style={styles.cashOutInfo}>
                <p style={styles.cashOutQuestion}>{cashOutBet.market.question}</p>
                
                <div style={styles.cashOutDetails} className="glass">
                  <div style={styles.cashOutRow}>
                    <span>Your bet:</span>
                    <strong>{cashOutBet.amount.toFixed(4)} SOL</strong>
                  </div>
                  <div style={styles.cashOutRow}>
                    <span>Position:</span>
                    <strong style={{color: '#00d2d3'}}>
                      {cashOutBet.option ? cashOutBet.option.label : cashOutBet.side?.toUpperCase()}
                    </strong>
                  </div>
                  <div style={styles.cashOutRow}>
                    <span>Potential win:</span>
                    <strong>{cashOutBet.potentialWin.toFixed(4)} SOL</strong>
                  </div>
                </div>

                {cashOutValue ? (
                  <div style={styles.cashOutValueBox}>
                    <div style={styles.cashOutRow}>
                      <span>Current odds:</span>
                      <strong>{cashOutValue.currentOdds.toFixed(0)}%</strong>
                    </div>
                    <div style={styles.cashOutRow}>
                      <span>Fee (5%):</span>
                      <strong style={{color: '#ff6b6b'}}>-{cashOutValue.fee.toFixed(4)} SOL</strong>
                    </div>
                    <div style={{...styles.cashOutRow, borderTop: '1px solid rgba(255,255,255,0.1)', marginTop: 12, paddingTop: 16}}>
                      <span>You receive:</span>
                      <strong style={{color: '#00d2d3', fontSize: 22}}>
                        {cashOutValue.netCashOut.toFixed(4)} SOL
                      </strong>
                    </div>
                    <div style={styles.profitLossIndicator}>
                      {cashOutValue.profitLoss >= 0 ? (
                        <span style={{color: '#00d2d3'}}>📈 +{cashOutValue.profitLoss.toFixed(4)} SOL profit</span>
                      ) : (
                        <span style={{color: '#ff6b6b'}}>📉 {cashOutValue.profitLoss.toFixed(4)} SOL loss</span>
                      )}
                    </div>
                  </div>
                ) : (
                  <div style={styles.cashOutLoading}>
                    <span className="animate-pulse-slow">Calculating...</span>
                  </div>
                )}

                <p style={styles.cashOutWarning}>
                  ⚠️ Cash out is final. You will exit your position.
                </p>

                <button 
                  className="btn-hover"
                  style={{
                    ...styles.confirmBet,
                    opacity: cashingOut || !cashOutValue ? 0.6 : 1
                  }}
                  onClick={handleCashOut}
                  disabled={cashingOut || !cashOutValue}
                >
                  {cashingOut ? '⏳ Processing...' : `💰 Cash Out ${cashOutValue?.netCashOut.toFixed(4) || '...'} SOL`}
                </button>
              </div>
            </div>
          </div>
        )}
      </div>
    </>
  )
}

const styles: { [key: string]: React.CSSProperties } = {
  container: { 
    minHeight: '100vh', 
    color: '#fff', 
    fontFamily: "'Inter', -apple-system, BlinkMacSystemFont, sans-serif",
    position: 'relative',
    overflow: 'hidden'
  },
  bgContainer: {
    position: 'fixed',
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    zIndex: -1,
    overflow: 'hidden'
  },
  bgGradient: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    background: 'linear-gradient(135deg, #050508 0%, #0a0a12 25%, #0d0d18 50%, #08081a 75%, #050508 100%)',
  },
  bgOrb1: {
    position: 'absolute',
    top: '-30%',
    right: '-15%',
    width: '70vw',
    height: '70vw',
    borderRadius: '50%',
    background: 'radial-gradient(circle, rgba(0,210,211,0.12) 0%, rgba(0,210,211,0.05) 40%, transparent 70%)',
    filter: 'blur(60px)',
  },
  bgOrb2: {
    position: 'absolute',
    bottom: '-40%',
    left: '-25%',
    width: '80vw',
    height: '80vw',
    borderRadius: '50%',
    background: 'radial-gradient(circle, rgba(102,126,234,0.12) 0%, rgba(102,126,234,0.05) 40%, transparent 70%)',
    filter: 'blur(80px)',
  },
  bgOrb3: {
    position: 'absolute',
    top: '30%',
    left: '60%',
    width: '50vw',
    height: '50vw',
    borderRadius: '50%',
    background: 'radial-gradient(circle, rgba(118,75,162,0.08) 0%, transparent 60%)',
    filter: 'blur(60px)',
  },
  bgOrb4: {
    position: 'absolute',
    top: '60%',
    left: '20%',
    width: '30vw',
    height: '30vw',
    background: 'radial-gradient(circle, rgba(0,210,211,0.06) 0%, transparent 70%)',
    filter: 'blur(40px)',
  },
  gridOverlay: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    backgroundImage: `
      linear-gradient(rgba(255,255,255,0.015) 1px, transparent 1px),
      linear-gradient(90deg, rgba(255,255,255,0.015) 1px, transparent 1px)
    `,
    backgroundSize: '60px 60px',
  },
  noiseOverlay: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    opacity: 0.02,
    backgroundImage: `url("data:image/svg+xml,%3Csvg viewBox='0 0 256 256' xmlns='http://www.w3.org/2000/svg'%3E%3Cfilter id='noiseFilter'%3E%3CfeTurbulence type='fractalNoise' baseFrequency='0.9' numOctaves='4' stitchTiles='stitch'/%3E%3C/filter%3E%3Crect width='100%25' height='100%25' filter='url(%23noiseFilter)'/%3E%3C/svg%3E")`,
  },
  accentLine1: {
    position: 'absolute',
    top: '20%',
    left: 0,
    right: 0,
    height: 1,
    background: 'linear-gradient(90deg, transparent, rgba(0,210,211,0.2), transparent)',
  },
  accentLine2: {
    position: 'absolute',
    top: '80%',
    left: 0,
    right: 0,
    height: 1,
    background: 'linear-gradient(90deg, transparent, rgba(102,126,234,0.15), transparent)',
  },
  particle: {
    position: 'fixed',
    borderRadius: '50%',
    background: 'linear-gradient(135deg, rgba(0,210,211,0.8), rgba(102,126,234,0.8))',
    filter: 'blur(1px)',
    zIndex: 0,
  },
  notification: { 
    position: 'fixed', 
    top: 24, 
    right: 24, 
    padding: '16px 28px', 
    borderRadius: 16, 
    color: '#fff', 
    fontWeight: 600, 
    zIndex: 1000,
    backdropFilter: 'blur(20px)',
    border: '1px solid rgba(255,255,255,0.15)',
    maxWidth: '90%',
    boxShadow: '0 10px 40px rgba(0,0,0,0.3)',
    display: 'flex',
    alignItems: 'center'
  },
  header: { 
    display: 'flex', 
    alignItems: 'center', 
    justifyContent: 'space-between', 
    padding: '16px 40px', 
    borderBottom: '1px solid rgba(255,255,255,0.06)', 
    position: 'sticky', 
    top: 0, 
    zIndex: 100 
  },
  logo: { display: 'flex', alignItems: 'center', gap: 12 },
  logoIconContainer: {
    width: 44,
    height: 44,
    borderRadius: 12,
    background: 'linear-gradient(135deg, rgba(0,210,211,0.15), rgba(102,126,234,0.15))',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    border: '1px solid rgba(0,210,211,0.3)',
  },
  logoIcon: { 
    fontSize: 24, 
    background: 'linear-gradient(135deg, #00d2d3, #0abde3)', 
    WebkitBackgroundClip: 'text', 
    WebkitTextFillColor: 'transparent',
  },
  logoText: { 
    fontSize: 24, 
    fontWeight: 800,
    fontFamily: "'Space Grotesk', sans-serif",
    letterSpacing: '1px'
  },
  logoAccent: { 
    background: 'linear-gradient(135deg, #00d2d3, #0abde3)', 
    WebkitBackgroundClip: 'text', 
    WebkitTextFillColor: 'transparent' 
  },
  nav: { display: 'flex', gap: 8 },
  navButton: { 
    padding: '12px 20px', 
    background: 'rgba(255,255,255,0.03)', 
    border: '1px solid rgba(255,255,255,0.08)', 
    borderRadius: 12, 
    color: '#888', 
    cursor: 'pointer', 
    fontSize: 14,
    fontWeight: 500,
    backdropFilter: 'blur(10px)',
    display: 'flex',
    alignItems: 'center',
    gap: 8
  },
  navButtonActive: { 
    padding: '12px 20px', 
    background: 'linear-gradient(135deg, rgba(0,210,211,0.2), rgba(102,126,234,0.2))', 
    border: '1px solid rgba(0,210,211,0.4)', 
    borderRadius: 12, 
    color: '#fff', 
    cursor: 'pointer', 
    fontSize: 14, 
    fontWeight: 600,
    boxShadow: '0 4px 20px rgba(0,210,211,0.2), inset 0 0 20px rgba(0,210,211,0.1)',
    display: 'flex',
    alignItems: 'center',
    gap: 8
  },
  userInfo: { 
    display: 'flex', 
    alignItems: 'center', 
    gap: 16, 
    cursor: 'pointer',
    padding: '10px 16px',
    borderRadius: 16,
    background: 'rgba(255,255,255,0.03)',
    border: '1px solid rgba(255,255,255,0.08)'
  },
  balanceBox: { display: 'flex', flexDirection: 'column' as const, alignItems: 'flex-end' },
  balanceLabel: { fontSize: 10, color: '#666', textTransform: 'uppercase' as const, letterSpacing: '1.5px', fontWeight: 600 },
  balanceValue: { 
    fontSize: 18, 
    fontWeight: 700, 
    background: 'linear-gradient(135deg, #00d2d3, #0abde3)', 
    WebkitBackgroundClip: 'text', 
    WebkitTextFillColor: 'transparent' 
  },
  avatar: { 
    width: 44, 
    height: 44, 
    borderRadius: 14, 
    background: 'linear-gradient(135deg, #667eea, #764ba2)', 
    display: 'flex', 
    alignItems: 'center', 
    justifyContent: 'center', 
    fontWeight: 700,
    fontSize: 18,
    border: '2px solid rgba(0,210,211,0.3)'
  },
  loginBtn: { 
    padding: '14px 28px', 
    background: 'linear-gradient(135deg, #667eea, #764ba2)', 
    border: 'none', 
    borderRadius: 14, 
    color: '#fff', 
    cursor: 'pointer', 
    fontWeight: 600,
    fontSize: 15,
    display: 'flex',
    alignItems: 'center',
    boxShadow: '0 4px 20px rgba(102,126,234,0.3)'
  },
  main: { maxWidth: 1200, margin: '0 auto', padding: '40px 20px', position: 'relative' as const, zIndex: 1 },
  hero: { textAlign: 'center' as const, marginBottom: 48, paddingTop: 20 },
  heroBadge: {
    display: 'inline-flex',
    alignItems: 'center',
    gap: 8,
    padding: '8px 16px',
    background: 'rgba(0,210,211,0.1)',
    border: '1px solid rgba(0,210,211,0.3)',
    borderRadius: 30,
    fontSize: 13,
    fontWeight: 600,
    color: '#00d2d3',
    marginBottom: 24,
  },
  heroBadgeDot: {
    width: 8,
    height: 8,
    borderRadius: '50%',
    background: '#00d2d3',
    animation: 'pulse 2s ease-in-out infinite',
  },
  heroTitle: { 
    fontSize: 64, 
    fontWeight: 900, 
    marginBottom: 20, 
    fontFamily: "'Space Grotesk', sans-serif",
    lineHeight: 1.1,
    letterSpacing: '-2px'
  },
  heroSubtitle: { fontSize: 18, color: '#888', maxWidth: 500, margin: '0 auto', lineHeight: 1.6 },
  quickStats: {
    display: 'flex',
    justifyContent: 'center',
    alignItems: 'center',
    gap: 32,
    marginTop: 40,
    padding: '20px 40px',
    background: 'rgba(255,255,255,0.02)',
    borderRadius: 20,
    border: '1px solid rgba(255,255,255,0.06)',
    width: 'fit-content',
    margin: '40px auto 0',
  },
  quickStat: {
    textAlign: 'center' as const,
  },
  quickStatValue: {
    fontSize: 24,
    fontWeight: 700,
    color: '#fff',
    display: 'block',
  },
  quickStatLabel: {
    fontSize: 12,
    color: '#666',
    textTransform: 'uppercase' as const,
    letterSpacing: 1,
    marginTop: 4,
    display: 'block',
  },
  quickStatDivider: {
    width: 1,
    height: 40,
    background: 'rgba(255,255,255,0.1)',
  },
  categories: { display: 'flex', gap: 10, marginBottom: 32, flexWrap: 'wrap' as const, justifyContent: 'center' },
  category: { 
    padding: '12px 20px', 
    background: 'rgba(255,255,255,0.03)', 
    border: '1px solid rgba(255,255,255,0.08)', 
    borderRadius: 30, 
    color: '#888', 
    cursor: 'pointer', 
    fontSize: 14,
    fontWeight: 500,
    backdropFilter: 'blur(10px)',
    transition: 'all 0.3s ease'
  },
  categoryActive: { 
    padding: '12px 20px', 
    background: 'linear-gradient(135deg, rgba(0,210,211,0.15), rgba(102,126,234,0.15))', 
    border: '1px solid rgba(0,210,211,0.4)', 
    borderRadius: 30, 
    color: '#fff', 
    cursor: 'pointer', 
    fontSize: 14, 
    fontWeight: 600,
    boxShadow: '0 4px 20px rgba(0,210,211,0.2)'
  },
  marketsGrid: { display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(340px, 1fr))', gap: 24 },
  marketCard: { 
    borderRadius: 24, 
    padding: 24, 
    position: 'relative' as const,
  },
  trendingBadge: { 
    position: 'absolute' as const, 
    top: 20, 
    right: 20, 
    background: 'linear-gradient(135deg, rgba(255,107,107,0.9), rgba(255,70,70,0.9))', 
    padding: '8px 14px', 
    borderRadius: 20, 
    fontSize: 12,
    fontWeight: 600,
    border: '1px solid rgba(255,107,107,0.5)',
    display: 'flex',
    alignItems: 'center',
    zIndex: 10,
    backdropFilter: 'blur(10px)'
  },
  marketImageContainer: {
    width: '100%',
    height: 160,
    borderRadius: 16,
    overflow: 'hidden',
    marginBottom: 20,
    position: 'relative' as const
  },
  marketImage: {
    width: '100%',
    height: '100%',
    objectFit: 'cover' as const
  },
  marketImageOverlay: {
    position: 'absolute' as const,
    bottom: 0,
    left: 0,
    right: 0,
    height: '50%',
    background: 'linear-gradient(transparent, rgba(0,0,0,0.6))',
  },
  marketCategory: { 
    fontSize: 11, 
    color: '#00d2d3', 
    textTransform: 'uppercase' as const, 
    letterSpacing: '1.5px', 
    marginBottom: 12, 
    fontWeight: 700,
    display: 'flex',
    alignItems: 'center',
    gap: 8
  },
  mcBadge: {
    background: 'linear-gradient(135deg, #667eea, #764ba2)',
    color: '#fff',
    padding: '3px 8px',
    borderRadius: 6,
    fontSize: 9,
    fontWeight: 700,
    letterSpacing: '0.5px'
  },
  marketQuestion: { fontSize: 18, fontWeight: 600, marginBottom: 20, lineHeight: 1.5, color: '#f0f0f0' },
  oddsBar: { 
    display: 'flex', 
    borderRadius: 12, 
    overflow: 'hidden', 
    marginBottom: 20,
    height: 44,
    background: 'rgba(0,0,0,0.3)'
  },
  yesBar: { 
    background: 'linear-gradient(135deg, #00d2d3, #0abde3)', 
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
    transition: 'width 0.6s cubic-bezier(0.23, 1, 0.32, 1)',
    minWidth: 60
  },
  noBar: { 
    background: 'linear-gradient(135deg, #ff6b6b, #ee5a5a)', 
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
    transition: 'width 0.6s cubic-bezier(0.23, 1, 0.32, 1)',
    minWidth: 60
  },
  oddsLabel: { fontSize: 11, fontWeight: 700, opacity: 0.9 },
  oddsValue: { fontSize: 14, fontWeight: 700 },
  optionsPreview: {
    marginBottom: 20
  },
  optionPreviewRow: {
    display: 'flex',
    alignItems: 'center',
    gap: 12,
    marginBottom: 10
  },
  optionLabel: {
    fontSize: 13,
    color: '#ccc',
    minWidth: 90,
    maxWidth: 100,
    overflow: 'hidden',
    textOverflow: 'ellipsis',
    whiteSpace: 'nowrap' as const,
    fontWeight: 500
  },
  optionBarContainer: {
    flex: 1,
    height: 28,
    background: 'rgba(255,255,255,0.05)',
    borderRadius: 8,
    position: 'relative' as const,
    overflow: 'hidden'
  },
  optionBar: {
    height: '100%',
    borderRadius: 8,
    transition: 'width 0.6s cubic-bezier(0.23, 1, 0.32, 1)'
  },
  optionOdds: {
    position: 'absolute' as const,
    right: 10,
    top: '50%',
    transform: 'translateY(-50%)',
    fontSize: 12,
    fontWeight: 700,
    color: '#fff'
  },
  moreOptions: {
    fontSize: 12,
    color: '#666',
    fontStyle: 'italic'
  },
  marketMeta: { 
    display: 'flex', 
    justifyContent: 'space-between', 
    marginBottom: 20 
  },
  metaItem: {
    display: 'flex',
    alignItems: 'center',
    gap: 6,
    fontSize: 13,
    color: '#888'
  },
  metaIcon: {
    fontSize: 14
  },
  betButton: { 
    width: '100%', 
    padding: 16, 
    background: 'linear-gradient(135deg, #667eea, #764ba2)', 
    border: 'none', 
    borderRadius: 14, 
    color: '#fff', 
    fontSize: 15, 
    fontWeight: 600, 
    cursor: 'pointer',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    boxShadow: '0 4px 20px rgba(102,126,234,0.3)'
  },
  portfolioSection: { paddingTop: 20 },
  sectionTitle: { 
    fontSize: 36, 
    fontWeight: 800, 
    marginBottom: 12, 
    textAlign: 'center' as const,
    fontFamily: "'Space Grotesk', sans-serif"
  },
  emptyState: { 
    textAlign: 'center' as const, 
    padding: 60, 
    borderRadius: 24,
  },
  emptyIcon: {
    fontSize: 48,
    marginBottom: 16
  },
  emptyText: {
    color: '#888',
    marginBottom: 24,
    fontSize: 16
  },
  ctaButton: { 
    padding: '16px 32px', 
    background: 'linear-gradient(135deg, #667eea, #764ba2)', 
    border: 'none', 
    borderRadius: 14, 
    color: '#fff', 
    fontSize: 15, 
    fontWeight: 600, 
    cursor: 'pointer',
    display: 'inline-flex',
    alignItems: 'center',
    boxShadow: '0 4px 20px rgba(102,126,234,0.3)'
  },
  statsRow: { 
    display: 'grid', 
    gridTemplateColumns: 'repeat(3, 1fr)', 
    gap: 20, 
    marginBottom: 40 
  },
  statCard: { 
    borderRadius: 20, 
    padding: 28, 
    textAlign: 'center' as const,
  },
  statIcon: {
    fontSize: 28,
    marginBottom: 12
  },
  statValue: { 
    fontSize: 28, 
    fontWeight: 800, 
    marginBottom: 6,
    fontFamily: "'Space Grotesk', sans-serif"
  },
  statLabel: { 
    fontSize: 13, 
    color: '#888', 
    textTransform: 'uppercase' as const, 
    letterSpacing: 1,
    fontWeight: 500
  },
  subsectionTitle: { 
    fontSize: 22, 
    fontWeight: 700, 
    marginBottom: 20, 
    marginTop: 20,
    color: '#f0f0f0'
  },
  betsList: { display: 'flex', flexDirection: 'column' as const, gap: 16 },
  betCard: { 
    borderRadius: 20, 
    padding: 24,
  },
  betHeader: { 
    display: 'flex', 
    justifyContent: 'space-between', 
    marginBottom: 12, 
    alignItems: 'center' 
  },
  betSideYes: { 
    background: 'linear-gradient(135deg, rgba(0,210,211,0.2), rgba(0,210,211,0.1))', 
    color: '#00d2d3', 
    padding: '8px 16px', 
    borderRadius: 10, 
    fontSize: 13, 
    fontWeight: 700,
    border: '1px solid rgba(0,210,211,0.3)'
  },
  betSideNo: { 
    background: 'linear-gradient(135deg, rgba(255,107,107,0.2), rgba(255,107,107,0.1))', 
    color: '#ff6b6b', 
    padding: '8px 16px', 
    borderRadius: 10, 
    fontSize: 13, 
    fontWeight: 700,
    border: '1px solid rgba(255,107,107,0.3)'
  },
  betStatus: { 
    padding: '8px 14px', 
    borderRadius: 10, 
    fontSize: 11, 
    fontWeight: 700,
    letterSpacing: '0.5px'
  },
  betQuestion: { 
    color: '#ccc', 
    marginBottom: 16, 
    lineHeight: 1.5,
    fontSize: 15
  },
  betFooter: { 
    display: 'flex', 
    justifyContent: 'space-between',
    padding: '16px 0 0',
    borderTop: '1px solid rgba(255,255,255,0.06)'
  },
  betFooterItem: {
    display: 'flex',
    flexDirection: 'column' as const,
    gap: 4
  },
  betFooterLabel: {
    fontSize: 11,
    color: '#666',
    textTransform: 'uppercase' as const,
    letterSpacing: 1
  },
  betFooterValue: {
    fontSize: 16,
    fontWeight: 700,
    color: '#fff'
  },
  leaderboardSection: { paddingTop: 20 },
  leaderboardSubtitle: { 
    textAlign: 'center' as const, 
    color: '#888', 
    marginBottom: 32,
    fontSize: 16
  },
  leaderboardTable: { 
    borderRadius: 24, 
    overflow: 'hidden',
  },
  leaderboardHeader: { 
    display: 'grid', 
    gridTemplateColumns: '70px 1fr 80px 140px', 
    padding: '18px 24px', 
    background: 'rgba(255,255,255,0.03)', 
    fontSize: 11, 
    color: '#666', 
    textTransform: 'uppercase' as const, 
    letterSpacing: '1.5px',
    fontWeight: 700
  },
  leaderboardRow: { 
    display: 'grid', 
    gridTemplateColumns: '70px 1fr 80px 140px', 
    padding: '18px 24px', 
    borderTop: '1px solid rgba(255,255,255,0.04)', 
    alignItems: 'center',
    transition: 'all 0.3s ease'
  },
  lbRank: { fontWeight: 700, fontSize: 16 },
  lbUser: { 
    fontWeight: 600,
    display: 'flex',
    alignItems: 'center',
    gap: 12
  },
  lbUserAvatar: {
    width: 32,
    height: 32,
    borderRadius: 10,
    background: 'linear-gradient(135deg, #667eea, #764ba2)',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    fontSize: 14,
    fontWeight: 700
  },
  lbBets: { color: '#888' },
  lbBalance: { 
    color: '#00d2d3', 
    fontWeight: 700,
    fontSize: 15
  },
  footer: {
    marginTop: 80,
    borderTop: '1px solid rgba(255,255,255,0.06)',
    position: 'relative' as const,
    zIndex: 10
  },
  footerContent: {
    maxWidth: 1200,
    margin: '0 auto',
    padding: '60px 20px',
    display: 'flex',
    flexDirection: 'column' as const,
    alignItems: 'center',
    gap: 32
  },
  footerLogo: {
    display: 'flex',
    alignItems: 'center',
    gap: 12
  },
  footerLogoIcon: {
    fontSize: 32,
    background: 'linear-gradient(135deg, #00d2d3, #0abde3)',
    WebkitBackgroundClip: 'text',
    WebkitTextFillColor: 'transparent'
  },
  footerLogoText: {
    fontSize: 24,
    fontWeight: 800,
    fontFamily: "'Space Grotesk', sans-serif",
    letterSpacing: '1px'
  },
  footerLinks: {
    display: 'flex',
    gap: 16
  },
  socialLink: {
    width: 48,
    height: 48,
    borderRadius: 14,
    background: 'rgba(255,255,255,0.03)',
    border: '1px solid rgba(255,255,255,0.08)',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    color: '#888',
    textDecoration: 'none',
    transition: 'all 0.3s ease',
    cursor: 'pointer'
  },
  contractSection: {
    display: 'flex',
    flexDirection: 'column' as const,
    alignItems: 'center',
    gap: 12,
    width: '100%',
    maxWidth: 500
  },
  contractLabel: {
    fontSize: 11,
    fontWeight: 700,
    color: '#00d2d3',
    letterSpacing: '2px',
    textTransform: 'uppercase' as const
  },
  contractBox: {
    display: 'flex',
    alignItems: 'center',
    gap: 12,
    borderRadius: 14,
    padding: '14px 18px',
    width: '100%'
  },
  contractAddress: {
    flex: 1,
    fontFamily: 'monospace',
    fontSize: 13,
    color: '#888',
    overflow: 'hidden',
    textOverflow: 'ellipsis',
    whiteSpace: 'nowrap' as const
  },
  contractCopyBtn: {
    padding: '10px 18px',
    background: 'linear-gradient(135deg, #00d2d3, #0abde3)',
    border: 'none',
    borderRadius: 10,
    color: '#fff',
    fontSize: 13,
    fontWeight: 600,
    cursor: 'pointer'
  },
  footerBottom: {
    display: 'flex',
    flexDirection: 'column' as const,
    alignItems: 'center',
    gap: 8,
    marginTop: 20
  },
  footerText: {
    fontSize: 13,
    color: '#666'
  },
  footerTextHighlight: {
    fontSize: 13,
    color: '#00d2d3',
    fontWeight: 600
  },
  modalOverlay: { 
    position: 'fixed' as const, 
    top: 0, 
    left: 0, 
    right: 0, 
    bottom: 0, 
    background: 'rgba(0,0,0,0.9)', 
    backdropFilter: 'blur(10px)',
    display: 'flex', 
    alignItems: 'center', 
    justifyContent: 'center', 
    zIndex: 1000,
    padding: 16
  },
  modal: { 
    borderRadius: 28, 
    padding: 36, 
    width: '100%', 
    maxWidth: 460, 
    position: 'relative' as const, 
    maxHeight: '90vh', 
    overflowY: 'auto' as const,
    boxShadow: '0 25px 80px rgba(0,0,0,0.5)'
  },
  closeModal: { 
    position: 'absolute' as const, 
    top: 20, 
    right: 20, 
    background: 'rgba(255,255,255,0.05)', 
    border: '1px solid rgba(255,255,255,0.1)',
    borderRadius: 10,
    width: 36,
    height: 36,
    color: '#888', 
    fontSize: 22, 
    cursor: 'pointer', 
    transition: 'all 0.2s',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center'
  },
  modalTitle: { 
    fontSize: 28, 
    fontWeight: 800, 
    marginBottom: 8,
    fontFamily: "'Space Grotesk', sans-serif"
  },
  modalQuestion: { color: '#888', marginBottom: 28, lineHeight: 1.6, fontSize: 15 },
  sideSelector: { display: 'flex', gap: 12, marginBottom: 28 },
  sideYes: { 
    flex: 1, 
    padding: 20, 
    background: 'rgba(0,210,211,0.08)', 
    border: '2px solid rgba(0,210,211,0.2)', 
    borderRadius: 16, 
    color: '#00d2d3', 
    cursor: 'pointer',
    display: 'flex',
    flexDirection: 'column' as const,
    alignItems: 'center',
    gap: 4
  },
  sideYesActive: { 
    flex: 1, 
    padding: 20, 
    background: 'rgba(0,210,211,0.15)', 
    border: '2px solid #00d2d3', 
    borderRadius: 16, 
    color: '#00d2d3', 
    cursor: 'pointer',
    boxShadow: '0 0 30px rgba(0,210,211,0.3), inset 0 0 30px rgba(0,210,211,0.1)',
    display: 'flex',
    flexDirection: 'column' as const,
    alignItems: 'center',
    gap: 4
  },
  sideNo: { 
    flex: 1, 
    padding: 20, 
    background: 'rgba(255,107,107,0.08)', 
    border: '2px solid rgba(255,107,107,0.2)', 
    borderRadius: 16, 
    color: '#ff6b6b', 
    cursor: 'pointer',
    display: 'flex',
    flexDirection: 'column' as const,
    alignItems: 'center',
    gap: 4
  },
  sideNoActive: { 
    flex: 1, 
    padding: 20, 
    background: 'rgba(255,107,107,0.15)', 
    border: '2px solid #ff6b6b', 
    borderRadius: 16, 
    color: '#ff6b6b', 
    cursor: 'pointer',
    boxShadow: '0 0 30px rgba(255,107,107,0.3), inset 0 0 30px rgba(255,107,107,0.1)',
    display: 'flex',
    flexDirection: 'column' as const,
    alignItems: 'center',
    gap: 4
  },
  sideLabel: { fontSize: 14, fontWeight: 700 },
  sideOdds: { fontSize: 22, fontWeight: 800 },
  optionsSelector: {
    display: 'flex',
    flexDirection: 'column' as const,
    gap: 10,
    marginBottom: 28
  },
  optionSelectBtn: {
    padding: '16px 20px',
    background: 'rgba(255,255,255,0.03)',
    border: '2px solid rgba(255,255,255,0.1)',
    borderRadius: 14,
    cursor: 'pointer',
    display: 'flex',
    justifyContent: 'space-between',
    alignItems: 'center',
    color: '#fff'
  },
  optionSelectLabel: {
    fontWeight: 600,
    fontSize: 15
  },
  optionSelectOdds: {
    color: '#00d2d3',
    fontWeight: 700,
    fontSize: 14
  },
  amountSection: { marginBottom: 24 },
  amountLabel: { 
    display: 'block', 
    marginBottom: 10, 
    color: '#888', 
    fontSize: 13,
    fontWeight: 600,
    textTransform: 'uppercase' as const,
    letterSpacing: 1
  },
  input: { 
    width: '100%', 
    padding: '16px 18px', 
    background: 'rgba(255,255,255,0.03)', 
    border: '2px solid rgba(255,255,255,0.08)', 
    borderRadius: 14, 
    color: '#fff', 
    fontSize: 16,
    fontWeight: 500,
    outline: 'none',
    transition: 'border-color 0.3s',
    marginBottom: 12
  },
  quickAmounts: { display: 'flex', gap: 10 },
  quickAmount: { 
    flex: 1, 
    padding: '12px 16px', 
    background: 'rgba(255,255,255,0.03)', 
    border: '1px solid rgba(255,255,255,0.08)', 
    borderRadius: 10, 
    color: '#888', 
    cursor: 'pointer', 
    fontSize: 13,
    fontWeight: 600
  },
  potentialWin: { 
    display: 'flex',
    justifyContent: 'space-between',
    alignItems: 'center',
    background: 'linear-gradient(135deg, rgba(0,210,211,0.1), rgba(102,126,234,0.1))', 
    borderRadius: 16, 
    padding: 20, 
    marginBottom: 24,
    border: '1px solid rgba(0,210,211,0.2)'
  },
  potentialLabel: {
    color: '#888',
    fontSize: 14,
    fontWeight: 500
  },
  potentialValue: { 
    fontSize: 24, 
    fontWeight: 800, 
    color: '#00d2d3',
    fontFamily: "'Space Grotesk', sans-serif"
  },
  confirmBet: { 
    width: '100%', 
    padding: 18, 
    background: 'linear-gradient(135deg, #667eea, #764ba2)', 
    border: 'none', 
    borderRadius: 14, 
    color: '#fff', 
    fontSize: 16, 
    fontWeight: 700, 
    cursor: 'pointer',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    boxShadow: '0 4px 20px rgba(102,126,234,0.3)'
  },
  walletNotice: {
    background: 'linear-gradient(135deg, rgba(0,210,211,0.1), rgba(102,126,234,0.1))',
    border: '1px solid rgba(0,210,211,0.2)',
    borderRadius: 14,
    padding: '14px 18px',
    color: '#00d2d3',
    fontSize: 14,
    marginBottom: 24,
    display: 'flex',
    alignItems: 'center'
  },
  authForm: {},
  inputGroup: {
    marginBottom: 16
  },
  inputLabel: {
    display: 'block',
    marginBottom: 8,
    color: '#888',
    fontSize: 12,
    fontWeight: 600,
    textTransform: 'uppercase' as const,
    letterSpacing: 1
  },
  authSwitch: { 
    textAlign: 'center' as const, 
    color: '#888', 
    marginTop: 20,
    fontSize: 14
  },
  authLink: { 
    color: '#00d2d3', 
    cursor: 'pointer', 
    fontWeight: 600 
  },
  profileInfo: { textAlign: 'center' as const, marginBottom: 28 },
  profileAvatar: { 
    width: 88, 
    height: 88, 
    borderRadius: 24, 
    background: 'linear-gradient(135deg, #667eea, #764ba2)', 
    display: 'flex', 
    alignItems: 'center', 
    justifyContent: 'center', 
    fontWeight: 700, 
    fontSize: 36, 
    margin: '0 auto 18px',
    border: '3px solid rgba(0,210,211,0.3)'
  },
  profileUsername: { fontSize: 26, fontWeight: 700, marginBottom: 4 },
  profileEmail: { color: '#666', fontSize: 14 },
  walletSection: { 
    borderRadius: 18, 
    padding: 22, 
    marginBottom: 20,
  },
  walletTitle: { fontSize: 16, fontWeight: 700, marginBottom: 16 },
  walletAddress: { display: 'flex', alignItems: 'center', gap: 10, marginBottom: 14, flexWrap: 'wrap' as const },
  addressText: { 
    flex: 1, 
    minWidth: 200, 
    background: 'rgba(0,0,0,0.3)', 
    padding: '14px 16px', 
    borderRadius: 12, 
    fontSize: 13, 
    fontFamily: 'monospace' 
  },
  copyBtn: { 
    padding: '14px 20px', 
    background: 'linear-gradient(135deg, #00d2d3, #0abde3)', 
    border: 'none', 
    borderRadius: 12, 
    color: '#fff', 
    fontSize: 13, 
    fontWeight: 600, 
    cursor: 'pointer' 
  },
  walletBalance: { display: 'flex', alignItems: 'center', gap: 14, marginBottom: 14, flexWrap: 'wrap' as const },
  solBalance: { fontSize: 22, fontWeight: 700, color: '#00d2d3' },
  refreshBtn: { 
    padding: '10px 16px', 
    background: 'rgba(255,255,255,0.08)', 
    border: 'none', 
    borderRadius: 10, 
    color: '#fff', 
    cursor: 'pointer', 
    fontSize: 16 
  },
  exportPkBtn: {
    width: '100%',
    padding: 16,
    background: 'rgba(255,193,7,0.1)',
    border: '1px solid rgba(255,193,7,0.3)',
    borderRadius: 12,
    color: '#ffc107',
    fontSize: 14,
    fontWeight: 600,
    cursor: 'pointer'
  },
  depositSection: { 
    background: 'linear-gradient(135deg, rgba(0,210,211,0.08), rgba(0,210,211,0.03))', 
    borderRadius: 18, 
    padding: 22, 
    marginBottom: 20,
    border: '1px solid rgba(0,210,211,0.15)'
  },
  depositTitle: { fontSize: 16, fontWeight: 700, marginBottom: 8 },
  depositText: { color: '#888', fontSize: 14 },
  withdrawSection: { marginBottom: 20 },
  withdrawBtn: { 
    width: '100%', 
    padding: 16, 
    background: 'rgba(255,255,255,0.03)', 
    border: '1px solid rgba(255,255,255,0.08)', 
    borderRadius: 14, 
    color: '#fff', 
    fontSize: 15, 
    fontWeight: 600, 
    cursor: 'pointer' 
  },
  logoutBtn: { 
    width: '100%', 
    padding: 16, 
    background: 'rgba(255,107,107,0.1)', 
    border: '1px solid rgba(255,107,107,0.2)', 
    borderRadius: 14, 
    color: '#ff6b6b', 
    fontSize: 15, 
    fontWeight: 600, 
    cursor: 'pointer',
    transition: 'all 0.3s'
  },
  withdrawBalance: { textAlign: 'center' as const, marginBottom: 28, fontSize: 16, color: '#888' },
  formGroup: { marginBottom: 20, position: 'relative' as const },
  maxBtn: { 
    position: 'absolute' as const, 
    right: 14, 
    top: 42, 
    padding: '8px 16px', 
    background: 'rgba(0,210,211,0.15)', 
    border: 'none', 
    borderRadius: 8, 
    color: '#00d2d3', 
    fontSize: 12, 
    fontWeight: 700, 
    cursor: 'pointer' 
  },
  feeNotice: { 
    color: '#888', 
    fontSize: 13, 
    marginBottom: 24, 
    textAlign: 'center' as const,
    background: 'rgba(255,193,7,0.08)',
    padding: '12px 16px',
    borderRadius: 12,
    border: '1px solid rgba(255,193,7,0.2)'
  },
  cashOutBtn: {
    width: '100%',
    marginTop: 16,
    padding: '14px 18px',
    background: 'linear-gradient(135deg, rgba(255,193,7,0.15), rgba(255,152,0,0.15))',
    border: '1px solid rgba(255,193,7,0.3)',
    borderRadius: 12,
    color: '#ffc107',
    fontSize: 14,
    fontWeight: 600,
    cursor: 'pointer',
    transition: 'all 0.3s'
  },
  cashOutInfo: {
    marginBottom: 20
  },
  cashOutQuestion: {
    color: '#f0f0f0',
    fontSize: 16,
    marginBottom: 24,
    lineHeight: 1.5
  },
  cashOutDetails: {
    borderRadius: 16,
    padding: 20,
    marginBottom: 20
  },
  cashOutRow: {
    display: 'flex',
    justifyContent: 'space-between',
    alignItems: 'center',
    padding: '10px 0',
    color: '#888',
    fontSize: 14
  },
  cashOutValueBox: {
    background: 'linear-gradient(135deg, rgba(0,210,211,0.08), rgba(0,210,211,0.03))',
    border: '1px solid rgba(0,210,211,0.15)',
    borderRadius: 16,
    padding: 20,
    marginBottom: 20
  },
  profitLossIndicator: {
    textAlign: 'center' as const,
    marginTop: 14,
    fontSize: 15,
    fontWeight: 600
  },
  cashOutLoading: {
    textAlign: 'center' as const,
    padding: 24,
    color: '#888',
    fontSize: 15
  },
  cashOutWarning: {
    background: 'rgba(255,193,7,0.08)',
    border: '1px solid rgba(255,193,7,0.2)',
    borderRadius: 12,
    padding: 14,
    color: '#ffc107',
    fontSize: 13,
    marginBottom: 24,
    textAlign: 'center' as const
  }
}