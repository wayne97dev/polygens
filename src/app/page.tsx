'use client'

import { useState, useEffect } from 'react'

type Market = {
  id: string
  question: string
  category: string
  yesOdds: number
  volume: number
  endDate: string
  trending: boolean
}

type Bet = {
  id: string
  amount: number
  side: string
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
    
    // Check for saved user session
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

    const res = await fetch('/api/bets', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        userId: user.id,
        marketId: selectedMarket.id,
        amount: betAmount,
        side: betSide
      })
    })

    const data = await res.json()

    if (res.ok) {
      showNotif(`Bet placed: ${betAmount} SOL on ${betSide.toUpperCase()}!`)
      setShowBetModal(false)
      setBetAmount(0.1)
      fetchUser(user.id)
      fetchMarkets()
      fetchLeaderboard()
    } else {
      showNotif(data.error, 'error')
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

  const filteredMarkets = selectedCategory === 'All'
    ? markets
    : markets.filter(m => m.category === selectedCategory)

  return (
    <>
      <style jsx global>{`
        @import url('https://fonts.googleapis.com/css2?family=Space+Grotesk:wght@400;500;600;700&family=Orbitron:wght@700;900&display=swap');
        
        * {
          box-sizing: border-box;
          -webkit-tap-highlight-color: transparent;
        }
        
        body {
          margin: 0;
          padding: 0;
          overflow-x: hidden;
        }
        
        @keyframes float {
          0%, 100% { transform: translateY(0) rotate(0deg); }
          50% { transform: translateY(-20px) rotate(5deg); }
        }
        
        @keyframes pulse {
          0%, 100% { opacity: 0.4; transform: scale(1); }
          50% { opacity: 0.8; transform: scale(1.1); }
        }
        
        @keyframes slideUp {
          from { opacity: 0; transform: translateY(30px); }
          to { opacity: 1; transform: translateY(0); }
        }
        
        @keyframes slideIn {
          from { opacity: 0; transform: translateX(-20px); }
          to { opacity: 1; transform: translateX(0); }
        }
        
        @keyframes glow {
          0%, 100% { box-shadow: 0 0 20px rgba(0, 210, 211, 0.3); }
          50% { box-shadow: 0 0 40px rgba(0, 210, 211, 0.6); }
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
          from { opacity: 0; transform: scale(0.9); }
          to { opacity: 1; transform: scale(1); }
        }
        
        @keyframes borderGlow {
          0%, 100% { border-color: rgba(0, 210, 211, 0.3); }
          50% { border-color: rgba(0, 210, 211, 0.8); }
        }
        
        .animate-float { animation: float 6s ease-in-out infinite; }
        .animate-pulse-slow { animation: pulse 4s ease-in-out infinite; }
        .animate-glow { animation: glow 2s ease-in-out infinite; }
        .animate-shimmer { 
          background: linear-gradient(90deg, transparent, rgba(255,255,255,0.1), transparent);
          background-size: 200% 100%;
          animation: shimmer 2s infinite;
        }
        .animate-rotate { animation: rotate 20s linear infinite; }
        .animate-border-glow { animation: borderGlow 2s ease-in-out infinite; }
        
        .card-hover {
          transition: all 0.4s cubic-bezier(0.4, 0, 0.2, 1);
        }
        .card-hover:hover {
          transform: translateY(-8px) scale(1.02);
          box-shadow: 0 20px 40px rgba(0, 210, 211, 0.2);
        }
        
        .btn-hover {
          transition: all 0.3s cubic-bezier(0.4, 0, 0.2, 1);
          position: relative;
          overflow: hidden;
        }
        .btn-hover:hover {
          transform: translateY(-2px);
          box-shadow: 0 10px 30px rgba(102, 126, 234, 0.4);
        }
        .btn-hover:active {
          transform: translateY(0);
        }
        
        .nav-btn {
          transition: all 0.3s ease;
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
          box-shadow: 0 10px 30px rgba(0, 210, 211, 0.4);
        }
        
        .modal-enter {
          animation: scaleIn 0.3s cubic-bezier(0.4, 0, 0.2, 1);
        }
        
        .stagger-1 { animation: slideUp 0.6s ease-out 0.1s both; }
        .stagger-2 { animation: slideUp 0.6s ease-out 0.2s both; }
        .stagger-3 { animation: slideUp 0.6s ease-out 0.3s both; }
        .stagger-4 { animation: slideUp 0.6s ease-out 0.4s both; }
        .stagger-5 { animation: slideUp 0.6s ease-out 0.5s both; }
        
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
        {/* Animated Background */}
        <div style={styles.bgContainer}>
          <div style={styles.bgGradient} />
          <div className="animate-rotate" style={styles.bgOrb1} />
          <div className="animate-rotate" style={{...styles.bgOrb2, animationDirection: 'reverse'}} />
          <div className="animate-pulse-slow" style={styles.bgOrb3} />
          <div style={styles.gridOverlay} />
          <div style={styles.noiseOverlay} />
        </div>

        {/* Floating Particles */}
        {mounted && [...Array(6)].map((_, i) => (
          <div
            key={i}
            className="animate-float"
            style={{
              ...styles.particle,
              left: `${10 + i * 15}%`,
              top: `${20 + (i % 3) * 25}%`,
              animationDelay: `${i * 0.5}s`,
              width: 8 + i * 4,
              height: 8 + i * 4,
            }}
          />
        ))}

        {/* Notification */}
        {notification && (
          <div style={{
            ...styles.notification,
            background: notification.type === 'error' 
              ? 'linear-gradient(135deg, #ff4757, #ff3838)' 
              : 'linear-gradient(135deg, #00d2d3, #0abde3)',
            animation: 'slideIn 0.3s ease-out'
          }}>
            {notification.message}
          </div>
        )}

        {/* Header */}
        <header style={styles.header} className="mobile-header">
          <div style={styles.logo}>
            <span className="animate-glow mobile-logo-icon" style={styles.logoIcon}>◈</span>
            <span style={styles.logoText} className="mobile-logo-text">POLY<span style={styles.logoAccent}>GENS</span></span>
          </div>
          
          <nav style={styles.nav} className="mobile-nav">
            {['markets', 'portfolio', 'leaderboard'].map(tab => (
              <button
                key={tab}
                className="nav-btn"
                style={activeTab === tab ? styles.navButtonActive : styles.navButton}
                onClick={() => setActiveTab(tab)}
              >
                <span>{tab === 'markets' ? '📊' : tab === 'portfolio' ? '💼' : '🏆'}</span>
                <span className="mobile-hide-text">{tab.charAt(0).toUpperCase() + tab.slice(1)}</span>
              </button>
            ))}
          </nav>

          {user ? (
            <div style={styles.userInfo} onClick={() => setShowProfileModal(true)} className="card-hover mobile-user-info">
              <div style={styles.balanceBox}>
                <span style={styles.balanceLabel}>Balance</span>
                <span style={styles.balanceValue} className="mobile-balance">{(user.solBalance || 0).toFixed(4)} SOL</span>
              </div>
              <div className="animate-border-glow mobile-avatar" style={styles.avatar}>{user.username.charAt(0).toUpperCase()}</div>
            </div>
          ) : (
            <button className="btn-hover" style={styles.loginBtn} onClick={() => setShowAuthModal(true)}>
              Sign In
            </button>
          )}
        </header>

        {/* Main Content */}
        <main style={styles.main} className="mobile-main">
          {activeTab === 'markets' && (
            <>
              <div style={styles.hero} className="stagger-1">
                <h1 style={styles.heroTitle} className="mobile-hero-title">Predict the Future</h1>
                <p style={styles.heroSubtitle} className="mobile-hero-subtitle">Bet with SOL on events that matter. Earn crypto with your predictions.</p>
              </div>

              <div style={styles.categories} className="stagger-2 mobile-categories">
                {categories.map(cat => (
                  <button
                    key={cat}
                    className="nav-btn"
                    style={selectedCategory === cat ? styles.categoryActive : styles.category}
                    onClick={() => setSelectedCategory(cat)}
                  >
                    {cat}
                  </button>
                ))}
              </div>

              <div style={styles.marketsGrid}>
                {filteredMarkets.map((market, index) => (
                  <div 
                    key={market.id} 
                    className="card-hover"
                    style={{
                      ...styles.marketCard,
                      animation: `slideUp 0.6s ease-out ${0.1 * index}s both`
                    }}
                  >
                    {market.trending && <div className="animate-shimmer" style={styles.trendingBadge}>🔥 Trending</div>}
                    <div style={styles.marketCategory}>{market.category}</div>
                    <h3 style={styles.marketQuestion}>{market.question}</h3>
                    
                    <div style={styles.oddsBar}>
                      <div style={{...styles.yesBar, width: `${market.yesOdds}%`}}>
                        YES {market.yesOdds}%
                      </div>
                      <div style={{...styles.noBar, width: `${100 - market.yesOdds}%`}}>
                        NO {100 - market.yesOdds}%
                      </div>
                    </div>

                    <div style={styles.marketMeta}>
                      <span>📊 {market.volume.toFixed(4)} SOL</span>
                      <span>⏰ {new Date(market.endDate).toLocaleDateString()}</span>
                    </div>

                    <button 
                      className="btn-hover"
                      style={styles.betButton} 
                      onClick={() => {
                        if (!user) {
                          setShowAuthModal(true)
                        } else {
                          setSelectedMarket(market)
                          setShowBetModal(true)
                        }
                      }}
                    >
                      Place Bet
                    </button>
                  </div>
                ))}
              </div>
            </>
          )}

          {activeTab === 'portfolio' && (
            <div style={styles.portfolioSection}>
              <h2 style={styles.sectionTitle} className="stagger-1 mobile-section-title">Your Portfolio</h2>
              
              {!user ? (
                <div style={styles.emptyState} className="stagger-2">
                  <p>Please sign in to view your portfolio</p>
                  <button className="btn-hover" style={styles.ctaButton} onClick={() => setShowAuthModal(true)}>
                    Sign In
                  </button>
                </div>
              ) : (
                <>
                  <div style={styles.statsRow} className="mobile-stats-row">
                    {[
                      { value: `${(user.solBalance || 0).toFixed(4)} SOL`, label: 'Current Balance' },
                      { value: user.bets?.length || 0, label: 'Active Bets' },
                      { value: `${(user.bets?.reduce((sum, b) => sum + b.potentialWin, 0) || 0).toFixed(4)} SOL`, label: 'Potential Winnings' }
                    ].map((stat, i) => (
                      <div key={i} className="card-hover mobile-stat-card" style={{...styles.statCard, animation: `slideUp 0.6s ease-out ${0.2 + i * 0.1}s both`}}>
                        <div style={styles.statValue} className="mobile-stat-value">{stat.value}</div>
                        <div style={styles.statLabel}>{stat.label}</div>
                      </div>
                    ))}
                  </div>

                  <h3 style={styles.subsectionTitle} className="stagger-4">Active Bets</h3>
                  {(!user.bets || user.bets.length === 0) ? (
                    <div style={styles.emptyState} className="stagger-5">
                      <p>No bets placed yet</p>
                      <button className="btn-hover" style={styles.ctaButton} onClick={() => setActiveTab('markets')}>
                        Explore Markets
                      </button>
                    </div>
                  ) : (
                    <div style={styles.betsList}>
                      {user.bets.map((bet, i) => (
                        <div 
                          key={bet.id} 
                          className="card-hover"
                          style={{...styles.betCard, animation: `slideUp 0.6s ease-out ${0.3 + i * 0.1}s both`}}
                        >
                          <div style={styles.betHeader}>
                            <span style={bet.side === 'yes' ? styles.betSideYes : styles.betSideNo}>
                              {bet.side.toUpperCase()}
                            </span>
                            <span style={{
                              ...styles.betStatus,
                              color: bet.status === 'won' ? '#00d2d3' : bet.status === 'lost' ? '#ff6b6b' : '#888'
                            }}>
                              {bet.status.toUpperCase()}
                            </span>
                          </div>
                          <p style={styles.betQuestion}>{bet.market.question}</p>
                          <div style={styles.betFooter}>
                            <span>Stake: <strong>{bet.amount.toFixed(4)} SOL</strong></span>
                            <span>Payout: <strong style={{color: '#00d2d3'}}>{bet.potentialWin.toFixed(4)} SOL</strong></span>
                          </div>
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
              <h2 style={styles.sectionTitle} className="stagger-1 mobile-section-title">🏆 Global Leaderboard</h2>
              <p style={styles.leaderboardSubtitle} className="stagger-2">Top predictors on the platform</p>
              
              {leaderboard.length === 0 ? (
                <div style={styles.emptyState} className="stagger-3">
                  <p>No users yet. Be the first to join!</p>
                  <button className="btn-hover" style={styles.ctaButton} onClick={() => setShowAuthModal(true)}>
                    Sign Up
                  </button>
                </div>
              ) : (
                <div style={styles.leaderboardTable} className="stagger-3">
                  <div style={styles.leaderboardHeader} className="mobile-leaderboard-header">
                    <span style={styles.lbRank}>#</span>
                    <span style={styles.lbUser}>User</span>
                    <span style={styles.lbBets} className="mobile-lb-bets">Bets</span>
                    <span style={styles.lbBalance}>Balance</span>
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
                      <span style={styles.lbRank}>{player.badge || player.rank}</span>
                      <span style={styles.lbUser}>{player.username}</span>
                      <span style={styles.lbBets} className="mobile-lb-bets">{player.totalBets}</span>
                      <span style={styles.lbBalance}>{(player.solBalance || 0).toFixed(4)} SOL</span>
                    </div>
                  ))}
                </div>
              )}
            </div>
          )}
        </main>

        {/* Footer */}
        <footer style={styles.footer}>
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
                <svg width="22" height="22" viewBox="0 0 24 24" fill="currentColor">
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
                <svg width="22" height="22" viewBox="0 0 24 24" fill="currentColor">
                  <path d="M12 2C6.48 2 2 6.48 2 12s4.48 10 10 10 10-4.48 10-10S17.52 2 12 2zm-1 17.93c-3.95-.49-7-3.85-7-7.93 0-.62.08-1.21.21-1.79L9 15v1c0 1.1.9 2 2 2v1.93zm6.9-2.54c-.26-.81-1-1.39-1.9-1.39h-1v-3c0-.55-.45-1-1-1H8v-2h2c.55 0 1-.45 1-1V7h2c1.1 0 2-.9 2-2v-.41c2.93 1.19 5 4.06 5 7.41 0 2.08-.8 3.97-2.1 5.39z"/>
                </svg>
              </a>
            </div>

            <div style={styles.contractSection}>
              <span style={styles.contractLabel}>CONTRACT</span>
              <div style={styles.contractBox} className="mobile-contract-box">
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
              <p style={styles.footerText}>© 2024 Polygens. All rights reserved.</p>
              <p style={styles.footerTextHighlight}>Built on Solana ⚡</p>
            </div>
          </div>
        </footer>

        {/* Bet Modal */}
        {showBetModal && selectedMarket && (
          <div style={styles.modalOverlay} onClick={() => setShowBetModal(false)}>
            <div className="modal-enter mobile-modal" style={styles.modal} onClick={e => e.stopPropagation()}>
              <button style={styles.closeModal} onClick={() => setShowBetModal(false)}>×</button>
              <h2 style={styles.modalTitle} className="mobile-modal-title">Place Your Bet</h2>
              <p style={styles.modalQuestion}>{selectedMarket.question}</p>
              
              <div style={styles.sideSelector}>
                <button 
                  className="btn-hover"
                  style={betSide === 'yes' ? styles.sideYesActive : styles.sideYes}
                  onClick={() => setBetSide('yes')}
                >
                  YES ({selectedMarket.yesOdds}%)
                </button>
                <button 
                  className="btn-hover"
                  style={betSide === 'no' ? styles.sideNoActive : styles.sideNo}
                  onClick={() => setBetSide('no')}
                >
                  NO ({100 - selectedMarket.yesOdds}%)
                </button>
              </div>

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
                <span>Potential Payout</span>
                <span style={styles.potentialValue}>
                  {(betAmount * (100 / (betSide === 'yes' ? selectedMarket.yesOdds : 100 - selectedMarket.yesOdds))).toFixed(4)} SOL
                </span>
              </div>

              <button className="btn-hover" style={styles.confirmBet} onClick={placeBet}>Confirm Bet</button>
            </div>
          </div>
        )}

        {/* Auth Modal */}
        {showAuthModal && (
          <div style={styles.modalOverlay} onClick={() => setShowAuthModal(false)}>
            <div className="modal-enter mobile-modal" style={styles.modal} onClick={e => e.stopPropagation()}>
              <button style={styles.closeModal} onClick={() => setShowAuthModal(false)}>×</button>
              <h2 style={styles.modalTitle} className="mobile-modal-title">{isLogin ? 'Sign In' : 'Create Account'}</h2>
              
              {!isLogin && (
                <p className="animate-shimmer" style={styles.walletNotice}>
                  🔐 A Solana wallet will be automatically created for you
                </p>
              )}
              
              <div style={styles.authForm}>
                {!isLogin && (
                  <input
                    type="text"
                    placeholder="Username"
                    value={authForm.username}
                    onChange={e => setAuthForm({...authForm, username: e.target.value})}
                    style={styles.input}
                  />
                )}
                <input
                  type="email"
                  placeholder="Email"
                  value={authForm.email}
                  onChange={e => setAuthForm({...authForm, email: e.target.value})}
                  style={styles.input}
                />
                <input
                  type="password"
                  placeholder="Password"
                  value={authForm.password}
                  onChange={e => setAuthForm({...authForm, password: e.target.value})}
                  style={styles.input}
                />
                <button className="btn-hover" style={styles.confirmBet} onClick={handleAuth}>
                  {isLogin ? 'Sign In' : 'Create Account'}
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
            <div className="modal-enter mobile-modal" style={styles.modal} onClick={e => e.stopPropagation()}>
              <button style={styles.closeModal} onClick={() => setShowProfileModal(false)}>×</button>
              <h2 style={styles.modalTitle} className="mobile-modal-title">Your Profile</h2>
              
              <div style={styles.profileInfo}>
                <div className="animate-border-glow" style={styles.profileAvatar}>{user.username.charAt(0).toUpperCase()}</div>
                <h3 style={styles.profileUsername}>{user.username}</h3>
                <p style={styles.profileEmail}>{user.email}</p>
              </div>

              <div style={styles.walletSection}>
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
            <div className="modal-enter mobile-modal" style={styles.modal} onClick={e => e.stopPropagation()}>
              <button style={styles.closeModal} onClick={() => setShowWithdrawModal(false)}>×</button>
              <h2 style={styles.modalTitle} className="mobile-modal-title">Withdraw SOL</h2>
              
              <p style={styles.withdrawBalance}>
                Available: <strong>{(user.solBalance || 0).toFixed(4)} SOL</strong>
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
      </div>
    </>
  )
}

const styles: { [key: string]: React.CSSProperties } = {
  container: { 
    minHeight: '100vh', 
    color: '#fff', 
    fontFamily: "'Space Grotesk', -apple-system, BlinkMacSystemFont, sans-serif",
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
    background: 'linear-gradient(135deg, #0a0a0f 0%, #0d1117 25%, #1a1a2e 50%, #16213e 75%, #0a0a0f 100%)',
  },
  bgOrb1: {
    position: 'absolute',
    top: '-20%',
    right: '-10%',
    width: '60vw',
    height: '60vw',
    borderRadius: '50%',
    background: 'radial-gradient(circle, rgba(0,210,211,0.15) 0%, transparent 70%)',
    filter: 'blur(40px)',
  },
  bgOrb2: {
    position: 'absolute',
    bottom: '-30%',
    left: '-20%',
    width: '70vw',
    height: '70vw',
    borderRadius: '50%',
    background: 'radial-gradient(circle, rgba(102,126,234,0.15) 0%, transparent 70%)',
    filter: 'blur(60px)',
  },
  bgOrb3: {
    position: 'absolute',
    top: '40%',
    left: '50%',
    transform: 'translate(-50%, -50%)',
    width: '40vw',
    height: '40vw',
    borderRadius: '50%',
    background: 'radial-gradient(circle, rgba(118,75,162,0.1) 0%, transparent 70%)',
    filter: 'blur(50px)',
  },
  gridOverlay: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    backgroundImage: `
      linear-gradient(rgba(255,255,255,0.02) 1px, transparent 1px),
      linear-gradient(90deg, rgba(255,255,255,0.02) 1px, transparent 1px)
    `,
    backgroundSize: '50px 50px',
  },
  noiseOverlay: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    opacity: 0.03,
    backgroundImage: `url("data:image/svg+xml,%3Csvg viewBox='0 0 256 256' xmlns='http://www.w3.org/2000/svg'%3E%3Cfilter id='noiseFilter'%3E%3CfeTurbulence type='fractalNoise' baseFrequency='0.9' numOctaves='4' stitchTiles='stitch'/%3E%3C/filter%3E%3Crect width='100%25' height='100%25' filter='url(%23noiseFilter)'/%3E%3C/svg%3E")`,
  },
  particle: {
    position: 'fixed',
    borderRadius: '50%',
    background: 'linear-gradient(135deg, rgba(0,210,211,0.6), rgba(102,126,234,0.6))',
    filter: 'blur(1px)',
    zIndex: 0,
  },
  notification: { 
    position: 'fixed', 
    top: 20, 
    right: 20, 
    padding: '16px 24px', 
    borderRadius: 12, 
    color: '#fff', 
    fontWeight: 600, 
    zIndex: 1000,
    backdropFilter: 'blur(10px)',
    border: '1px solid rgba(255,255,255,0.1)',
    maxWidth: '90%'
  },
  header: { 
    display: 'flex', 
    alignItems: 'center', 
    justifyContent: 'space-between', 
    padding: '20px 40px', 
    borderBottom: '1px solid rgba(255,255,255,0.1)', 
    background: 'rgba(10,10,15,0.7)', 
    backdropFilter: 'blur(20px)',
    position: 'sticky', 
    top: 0, 
    zIndex: 100 
  },
  logo: { display: 'flex', alignItems: 'center', gap: 10 },
  logoIcon: { 
    fontSize: 36, 
    background: 'linear-gradient(135deg, #00d2d3, #0abde3)', 
    WebkitBackgroundClip: 'text', 
    WebkitTextFillColor: 'transparent',
    filter: 'drop-shadow(0 0 10px rgba(0,210,211,0.5))'
  },
  logoText: { 
    fontSize: 26, 
    fontWeight: 700,
    fontFamily: "'Orbitron', sans-serif",
    letterSpacing: '2px'
  },
  logoAccent: { 
    background: 'linear-gradient(135deg, #00d2d3, #0abde3)', 
    WebkitBackgroundClip: 'text', 
    WebkitTextFillColor: 'transparent' 
  },
  nav: { display: 'flex', gap: 8 },
  navButton: { 
    padding: '12px 24px', 
    background: 'rgba(255,255,255,0.05)', 
    border: '1px solid rgba(255,255,255,0.1)', 
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
    padding: '12px 24px', 
    background: 'linear-gradient(135deg, #00d2d3, #0abde3)', 
    border: 'none', 
    borderRadius: 12, 
    color: '#fff', 
    cursor: 'pointer', 
    fontSize: 14, 
    fontWeight: 600,
    boxShadow: '0 4px 20px rgba(0,210,211,0.4)',
    display: 'flex',
    alignItems: 'center',
    gap: 8
  },
  userInfo: { 
    display: 'flex', 
    alignItems: 'center', 
    gap: 16, 
    cursor: 'pointer',
    padding: '8px 16px',
    borderRadius: 16,
    background: 'rgba(255,255,255,0.05)',
    border: '1px solid rgba(255,255,255,0.1)'
  },
  balanceBox: { display: 'flex', flexDirection: 'column', alignItems: 'flex-end' },
  balanceLabel: { fontSize: 11, color: '#666', textTransform: 'uppercase', letterSpacing: 1 },
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
    borderRadius: '50%', 
    background: 'linear-gradient(135deg, #667eea, #764ba2)', 
    display: 'flex', 
    alignItems: 'center', 
    justifyContent: 'center', 
    fontWeight: 700,
    fontSize: 18,
    border: '2px solid rgba(0,210,211,0.3)'
  },
  loginBtn: { 
    padding: '12px 28px', 
    background: 'linear-gradient(135deg, #667eea, #764ba2)', 
    border: 'none', 
    borderRadius: 12, 
    color: '#fff', 
    cursor: 'pointer', 
    fontWeight: 600,
    fontSize: 15
  },
  main: { maxWidth: 1200, margin: '0 auto', padding: '40px 20px', position: 'relative', zIndex: 1 },
  hero: { textAlign: 'center', marginBottom: 48 },
  heroTitle: { 
    fontSize: 56, 
    fontWeight: 900, 
    marginBottom: 16, 
    fontFamily: "'Orbitron', sans-serif",
    background: 'linear-gradient(135deg, #fff 0%, #00d2d3 50%, #667eea 100%)', 
    WebkitBackgroundClip: 'text', 
    WebkitTextFillColor: 'transparent',
    textShadow: '0 0 60px rgba(0,210,211,0.3)'
  },
  heroSubtitle: { fontSize: 18, color: '#888', maxWidth: 500, margin: '0 auto' },
  categories: { display: 'flex', gap: 12, marginBottom: 32, flexWrap: 'wrap', justifyContent: 'center' },
  category: { 
    padding: '12px 24px', 
    background: 'rgba(255,255,255,0.05)', 
    border: '1px solid rgba(255,255,255,0.1)', 
    borderRadius: 24, 
    color: '#888', 
    cursor: 'pointer', 
    fontSize: 14,
    backdropFilter: 'blur(10px)'
  },
  categoryActive: { 
    padding: '12px 24px', 
    background: 'linear-gradient(135deg, #00d2d3, #0abde3)', 
    border: 'none', 
    borderRadius: 24, 
    color: '#fff', 
    cursor: 'pointer', 
    fontSize: 14, 
    fontWeight: 600,
    boxShadow: '0 4px 20px rgba(0,210,211,0.4)'
  },
  marketsGrid: { display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(320px, 1fr))', gap: 24 },
  marketCard: { 
    background: 'rgba(255,255,255,0.03)', 
    border: '1px solid rgba(255,255,255,0.08)', 
    borderRadius: 20, 
    padding: 24, 
    position: 'relative',
    backdropFilter: 'blur(10px)'
  },
  trendingBadge: { 
    position: 'absolute', 
    top: 16, 
    right: 16, 
    background: 'linear-gradient(135deg, rgba(255,107,107,0.3), rgba(255,107,107,0.1))', 
    padding: '6px 12px', 
    borderRadius: 12, 
    fontSize: 12,
    border: '1px solid rgba(255,107,107,0.3)'
  },
  marketCategory: { fontSize: 12, color: '#00d2d3', textTransform: 'uppercase', letterSpacing: 1, marginBottom: 12, fontWeight: 600 },
  marketQuestion: { fontSize: 18, fontWeight: 600, marginBottom: 20, lineHeight: 1.4 },
  oddsBar: { display: 'flex', borderRadius: 10, overflow: 'hidden', fontSize: 12, fontWeight: 600, marginBottom: 16 },
  yesBar: { background: 'linear-gradient(135deg, #00d2d3, #0abde3)', padding: 12, textAlign: 'center', transition: 'width 0.5s ease' },
  noBar: { background: 'linear-gradient(135deg, #ff6b6b, #ee5a5a)', padding: 12, textAlign: 'center', transition: 'width 0.5s ease' },
  marketMeta: { display: 'flex', justifyContent: 'space-between', fontSize: 13, color: '#666', marginBottom: 20 },
  betButton: { 
    width: '100%', 
    padding: 16, 
    background: 'linear-gradient(135deg, #667eea, #764ba2)', 
    border: 'none', 
    borderRadius: 12, 
    color: '#fff', 
    fontSize: 15, 
    fontWeight: 600, 
    cursor: 'pointer' 
  },
  modalOverlay: { 
    position: 'fixed', 
    top: 0, 
    left: 0, 
    right: 0, 
    bottom: 0, 
    background: 'rgba(0,0,0,0.85)', 
    backdropFilter: 'blur(10px)',
    display: 'flex', 
    alignItems: 'center', 
    justifyContent: 'center', 
    zIndex: 1000,
    padding: 16
  },
  modal: { 
    background: 'linear-gradient(135deg, rgba(26,26,46,0.95), rgba(22,33,62,0.95))', 
    borderRadius: 24, 
    padding: 32, 
    width: '100%', 
    maxWidth: 440, 
    position: 'relative', 
    border: '1px solid rgba(255,255,255,0.1)', 
    maxHeight: '90vh', 
    overflowY: 'auto',
    backdropFilter: 'blur(20px)',
    boxShadow: '0 20px 60px rgba(0,0,0,0.5)'
  },
  closeModal: { position: 'absolute', top: 16, right: 16, background: 'none', border: 'none', color: '#666', fontSize: 28, cursor: 'pointer', transition: 'color 0.2s' },
  modalTitle: { fontSize: 24, fontWeight: 700, marginBottom: 8 },
  modalQuestion: { color: '#888', marginBottom: 24, lineHeight: 1.5 },
  sideSelector: { display: 'flex', gap: 12, marginBottom: 24 },
  sideYes: { flex: 1, padding: 16, background: 'rgba(0,210,211,0.1)', border: '2px solid rgba(0,210,211,0.3)', borderRadius: 12, color: '#00d2d3', fontSize: 16, fontWeight: 600, cursor: 'pointer' },
  sideYesActive: { flex: 1, padding: 16, background: 'linear-gradient(135deg, #00d2d3, #0abde3)', border: '2px solid transparent', borderRadius: 12, color: '#fff', fontSize: 16, fontWeight: 600, cursor: 'pointer', boxShadow: '0 4px 20px rgba(0,210,211,0.4)' },
  sideNo: { flex: 1, padding: 16, background: 'rgba(255,107,107,0.1)', border: '2px solid rgba(255,107,107,0.3)', borderRadius: 12, color: '#ff6b6b', fontSize: 16, fontWeight: 600, cursor: 'pointer' },
  sideNoActive: { flex: 1, padding: 16, background: 'linear-gradient(135deg, #ff6b6b, #ee5a5a)', border: '2px solid transparent', borderRadius: 12, color: '#fff', fontSize: 16, fontWeight: 600, cursor: 'pointer', boxShadow: '0 4px 20px rgba(255,107,107,0.4)' },
  amountSection: { marginBottom: 24 },
  amountLabel: { display: 'block', marginBottom: 8, color: '#888', fontSize: 14 },
  input: { 
    width: '100%', 
    padding: 16, 
    background: 'rgba(255,255,255,0.05)', 
    border: '1px solid rgba(255,255,255,0.1)', 
    borderRadius: 12, 
    color: '#fff', 
    fontSize: 16, 
    marginBottom: 12, 
    boxSizing: 'border-box',
    transition: 'border-color 0.3s, box-shadow 0.3s',
    outline: 'none'
  },
  quickAmounts: { display: 'flex', gap: 8 },
  quickAmount: { flex: 1, padding: 10, background: 'rgba(255,255,255,0.05)', border: '1px solid rgba(255,255,255,0.1)', borderRadius: 8, color: '#888', fontSize: 12, cursor: 'pointer' },
  potentialWin: { 
    display: 'flex', 
    justifyContent: 'space-between', 
    alignItems: 'center', 
    padding: 16, 
    background: 'rgba(0,210,211,0.1)', 
    borderRadius: 12, 
    marginBottom: 24,
    border: '1px solid rgba(0,210,211,0.2)'
  },
  potentialValue: { fontSize: 24, fontWeight: 700, color: '#00d2d3' },
  confirmBet: { 
    width: '100%', 
    padding: 18, 
    background: 'linear-gradient(135deg, #667eea, #764ba2)', 
    border: 'none', 
    borderRadius: 12, 
    color: '#fff', 
    fontSize: 16, 
    fontWeight: 700, 
    cursor: 'pointer' 
  },
  authForm: { display: 'flex', flexDirection: 'column', gap: 12 },
  authSwitch: { textAlign: 'center', color: '#666', marginTop: 16 },
  authLink: { color: '#00d2d3', cursor: 'pointer', fontWeight: 600 },
  walletNotice: { 
    background: 'linear-gradient(135deg, rgba(0,210,211,0.15), rgba(0,210,211,0.05))', 
    padding: 16, 
    borderRadius: 12, 
    marginBottom: 16, 
    fontSize: 14, 
    color: '#00d2d3',
    border: '1px solid rgba(0,210,211,0.2)'
  },
  portfolioSection: { maxWidth: 900, margin: '0 auto' },
  sectionTitle: { 
    fontSize: 36, 
    fontWeight: 700, 
    marginBottom: 32, 
    textAlign: 'center',
    fontFamily: "'Orbitron', sans-serif"
  },
  statsRow: { display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: 20, marginBottom: 40 },
  statCard: { 
    background: 'rgba(255,255,255,0.03)', 
    border: '1px solid rgba(255,255,255,0.08)', 
    borderRadius: 20, 
    padding: 28, 
    textAlign: 'center',
    backdropFilter: 'blur(10px)'
  },
  statValue: { 
    fontSize: 28, 
    fontWeight: 700, 
    marginBottom: 8, 
    background: 'linear-gradient(135deg, #00d2d3, #0abde3)', 
    WebkitBackgroundClip: 'text', 
    WebkitTextFillColor: 'transparent' 
  },
  statLabel: { color: '#666', fontSize: 14 },
  subsectionTitle: { fontSize: 20, fontWeight: 600, marginBottom: 20 },
  emptyState: { textAlign: 'center', padding: '60px 20px', color: '#666' },
  ctaButton: { 
    marginTop: 20, 
    padding: '14px 28px', 
    background: 'linear-gradient(135deg, #667eea, #764ba2)', 
    border: 'none', 
    borderRadius: 12, 
    color: '#fff', 
    fontSize: 15, 
    fontWeight: 600, 
    cursor: 'pointer' 
  },
  betsList: { display: 'flex', flexDirection: 'column', gap: 16 },
  betCard: { 
    background: 'rgba(255,255,255,0.03)', 
    border: '1px solid rgba(255,255,255,0.08)', 
    borderRadius: 16, 
    padding: 20,
    backdropFilter: 'blur(10px)'
  },
  betHeader: { display: 'flex', justifyContent: 'space-between', marginBottom: 12 },
  betSideYes: { background: 'rgba(0,210,211,0.2)', color: '#00d2d3', padding: '6px 14px', borderRadius: 8, fontSize: 12, fontWeight: 700 },
  betSideNo: { background: 'rgba(255,107,107,0.2)', color: '#ff6b6b', padding: '6px 14px', borderRadius: 8, fontSize: 12, fontWeight: 700 },
  betStatus: { fontSize: 12, fontWeight: 600 },
  betQuestion: { marginBottom: 12, lineHeight: 1.4 },
  betFooter: { display: 'flex', justifyContent: 'space-between', color: '#888', fontSize: 14 },
  leaderboardSection: { maxWidth: 700, margin: '0 auto' },
  leaderboardSubtitle: { textAlign: 'center', color: '#666', marginBottom: 32 },
  leaderboardTable: { 
    background: 'rgba(255,255,255,0.03)', 
    border: '1px solid rgba(255,255,255,0.08)', 
    borderRadius: 20, 
    overflow: 'hidden',
    backdropFilter: 'blur(10px)'
  },
  leaderboardHeader: { display: 'grid', gridTemplateColumns: '60px 1fr 80px 120px', padding: '16px 20px', background: 'rgba(255,255,255,0.05)', fontSize: 12, color: '#666', textTransform: 'uppercase', letterSpacing: 1 },
  leaderboardRow: { 
    display: 'grid', 
    gridTemplateColumns: '60px 1fr 80px 120px', 
    padding: '16px 20px', 
    borderTop: '1px solid rgba(255,255,255,0.05)', 
    alignItems: 'center',
    transition: 'background 0.3s'
  },
  lbRank: { fontWeight: 700, fontSize: 16 },
  lbUser: { fontWeight: 600 },
  lbBets: { color: '#888' },
  lbBalance: { color: '#00d2d3', fontWeight: 600 },
  profileInfo: { textAlign: 'center', marginBottom: 24 },
  profileAvatar: { 
    width: 80, 
    height: 80, 
    borderRadius: '50%', 
    background: 'linear-gradient(135deg, #667eea, #764ba2)', 
    display: 'flex', 
    alignItems: 'center', 
    justifyContent: 'center', 
    fontWeight: 700, 
    fontSize: 32, 
    margin: '0 auto 16px',
    border: '3px solid rgba(0,210,211,0.3)'
  },
  profileUsername: { fontSize: 24, fontWeight: 700, marginBottom: 4 },
  profileEmail: { color: '#666', fontSize: 14 },
  walletSection: { 
    background: 'rgba(255,255,255,0.05)', 
    borderRadius: 16, 
    padding: 20, 
    marginBottom: 20,
    border: '1px solid rgba(255,255,255,0.08)'
  },
  walletTitle: { fontSize: 16, fontWeight: 600, marginBottom: 12 },
  walletAddress: { display: 'flex', alignItems: 'center', gap: 8, marginBottom: 12, flexWrap: 'wrap' },
  addressText: { flex: 1, minWidth: 200, background: 'rgba(0,0,0,0.3)', padding: '12px 14px', borderRadius: 10, fontSize: 13, fontFamily: 'monospace' },
  copyBtn: { 
    padding: '12px 18px', 
    background: 'linear-gradient(135deg, #00d2d3, #0abde3)', 
    border: 'none', 
    borderRadius: 10, 
    color: '#fff', 
    fontSize: 13, 
    fontWeight: 600, 
    cursor: 'pointer' 
  },
  walletBalance: { display: 'flex', alignItems: 'center', gap: 12, marginBottom: 12, flexWrap: 'wrap' },
  solBalance: { fontSize: 20, fontWeight: 700, color: '#00d2d3' },
  refreshBtn: { padding: '8px 14px', background: 'rgba(255,255,255,0.1)', border: 'none', borderRadius: 8, color: '#fff', cursor: 'pointer', fontSize: 16 },
  exportPkBtn: {
    width: '100%',
    padding: 14,
    background: 'rgba(255,193,7,0.15)',
    border: '1px solid rgba(255,193,7,0.3)',
    borderRadius: 10,
    color: '#ffc107',
    fontSize: 14,
    fontWeight: 600,
    cursor: 'pointer'
  },
  depositSection: { 
    background: 'linear-gradient(135deg, rgba(0,210,211,0.1), rgba(0,210,211,0.05))', 
    borderRadius: 16, 
    padding: 20, 
    marginBottom: 20,
    border: '1px solid rgba(0,210,211,0.2)'
  },
  depositTitle: { fontSize: 16, fontWeight: 600, marginBottom: 8 },
  depositText: { color: '#888', fontSize: 14 },
  withdrawSection: { marginBottom: 20 },
  withdrawBtn: { 
    width: '100%', 
    padding: 16, 
    background: 'rgba(255,255,255,0.05)', 
    border: '1px solid rgba(255,255,255,0.1)', 
    borderRadius: 12, 
    color: '#fff', 
    fontSize: 15, 
    fontWeight: 600, 
    cursor: 'pointer' 
  },
  logoutBtn: { 
    width: '100%', 
    padding: 16, 
    background: 'rgba(255,107,107,0.15)', 
    border: '1px solid rgba(255,107,107,0.3)', 
    borderRadius: 12, 
    color: '#ff6b6b', 
    fontSize: 15, 
    fontWeight: 600, 
    cursor: 'pointer',
    transition: 'all 0.3s'
  },
  withdrawBalance: { textAlign: 'center', marginBottom: 24, fontSize: 16 },
  formGroup: { marginBottom: 20, position: 'relative' },
  maxBtn: { position: 'absolute', right: 12, top: 38, padding: '8px 14px', background: 'rgba(0,210,211,0.2)', border: 'none', borderRadius: 8, color: '#00d2d3', fontSize: 12, fontWeight: 600, cursor: 'pointer' },
  feeNotice: { color: '#888', fontSize: 13, marginBottom: 20, textAlign: 'center' },
  footer: {
    marginTop: 80,
    borderTop: '1px solid rgba(255,255,255,0.1)',
    background: 'rgba(10,10,15,0.8)',
    backdropFilter: 'blur(20px)',
    position: 'relative',
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
    gap: 10
  },
  footerLogoIcon: {
    fontSize: 32,
    background: 'linear-gradient(135deg, #00d2d3, #0abde3)',
    WebkitBackgroundClip: 'text',
    WebkitTextFillColor: 'transparent'
  },
  footerLogoText: {
    fontSize: 24,
    fontWeight: 700,
    fontFamily: "'Orbitron', sans-serif",
    letterSpacing: '2px'
  },
  footerLinks: {
    display: 'flex',
    gap: 20
  },
  socialLink: {
    width: 50,
    height: 50,
    borderRadius: '50%',
    background: 'rgba(255,255,255,0.05)',
    border: '1px solid rgba(255,255,255,0.1)',
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
    fontSize: 12,
    fontWeight: 700,
    color: '#00d2d3',
    letterSpacing: '2px',
    textTransform: 'uppercase' as const
  },
  contractBox: {
    display: 'flex',
    alignItems: 'center',
    gap: 12,
    background: 'rgba(255,255,255,0.05)',
    border: '1px solid rgba(255,255,255,0.1)',
    borderRadius: 12,
    padding: '12px 16px',
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
    padding: '8px 16px',
    background: 'linear-gradient(135deg, #00d2d3, #0abde3)',
    border: 'none',
    borderRadius: 8,
    color: '#fff',
    fontSize: 12,
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
  }
}