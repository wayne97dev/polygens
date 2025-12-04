'use client'

import { useState, useEffect } from 'react'

type Market = {
  id: string
  question: string
  category: string
  yesOdds: number
  volume: number
  endDate: string
  resolved: boolean
  outcome: boolean | null
  trending: boolean
}

export default function AdminPage() {
  const [isAuthenticated, setIsAuthenticated] = useState(false)
  const [password, setPassword] = useState('')
  const [authError, setAuthError] = useState('')
  const [markets, setMarkets] = useState<Market[]>([])
  const [showCreateModal, setShowCreateModal] = useState(false)
  const [showResolveModal, setShowResolveModal] = useState(false)
  const [selectedMarket, setSelectedMarket] = useState<Market | null>(null)
  const [newMarket, setNewMarket] = useState({
    question: '',
    category: 'Crypto',
    endDate: '',
    trending: false
  })
  const [notification, setNotification] = useState<{ message: string; type: string } | null>(null)
  const [treasury, setTreasury] = useState<{ address: string; balance: number } | null>(null)

  const categories = ['Crypto', 'Tech', 'Finance', 'Politics', 'Sports']

  useEffect(() => {
    // Check if already authenticated in this session
    const adminAuth = sessionStorage.getItem('adminAuth')
    if (adminAuth === 'true') {
      setIsAuthenticated(true)
      fetchMarkets()
      fetchTreasury()
    }
  }, [])

  const handleLogin = async () => {
    const res = await fetch('/api/admin/auth', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ password })
    })

    if (res.ok) {
      setIsAuthenticated(true)
      sessionStorage.setItem('adminAuth', 'true')
      setAuthError('')
      fetchMarkets()
      fetchTreasury()
    } else {
      setAuthError('Invalid password')
    }
  }

  const handleLogout = () => {
    setIsAuthenticated(false)
    sessionStorage.removeItem('adminAuth')
    setPassword('')
  }

  const fetchMarkets = async () => {
    const res = await fetch('/api/admin/markets')
    const data = await res.json()
    setMarkets(data)
  }

  const fetchTreasury = async () => {
    try {
      const res = await fetch('/api/admin/treasury')
      const data = await res.json()
      setTreasury(data)
    } catch (error) {
      console.error('Error fetching treasury:', error)
    }
  }

  const showNotif = (message: string, type = 'success') => {
    setNotification({ message, type })
    setTimeout(() => setNotification(null), 3000)
  }

  const createMarket = async () => {
    const res = await fetch('/api/admin/markets', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(newMarket)
    })

    if (res.ok) {
      showNotif('Market created successfully!')
      setShowCreateModal(false)
      setNewMarket({ question: '', category: 'Crypto', endDate: '', trending: false })
      fetchMarkets()
    } else {
      showNotif('Error creating market', 'error')
    }
  }

  const resolveMarket = async (outcome: boolean) => {
    if (!selectedMarket) return

    const res = await fetch('/api/admin/resolve', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ marketId: selectedMarket.id, outcome })
    })

    const data = await res.json()

    if (res.ok) {
      showNotif(`Market resolved! ${data.winnersCount} winners paid out ${data.totalPaidOut.toFixed(4)} SOL`)
      setShowResolveModal(false)
      setSelectedMarket(null)
      fetchMarkets()
      fetchTreasury()
    } else {
      showNotif(data.error || 'Error resolving market', 'error')
    }
  }

  const deleteMarket = async (marketId: string) => {
    if (!confirm('Are you sure you want to delete this market?')) return

    const res = await fetch(`/api/admin/markets?id=${marketId}`, {
      method: 'DELETE'
    })

    if (res.ok) {
      showNotif('Market deleted!')
      fetchMarkets()
    } else {
      showNotif('Error deleting market', 'error')
    }
  }

  // Login Screen
  if (!isAuthenticated) {
    return (
      <div style={styles.loginContainer}>
        <div style={styles.loginBox}>
          <h1 style={styles.loginTitle}>🔐 Admin Access</h1>
          <p style={styles.loginSubtitle}>Enter password to continue</p>
          
          <input
            type="password"
            placeholder="Admin Password"
            value={password}
            onChange={e => setPassword(e.target.value)}
            onKeyPress={e => e.key === 'Enter' && handleLogin()}
            style={styles.input}
          />
          
          {authError && <p style={styles.errorText}>{authError}</p>}
          
          <button style={styles.loginBtn} onClick={handleLogin}>
            Enter Admin Panel
          </button>
          
          <a href="/" style={styles.backLink}>← Back to Polygens</a>
        </div>
      </div>
    )
  }

  const activeMarkets = markets.filter(m => !m.resolved)
  const resolvedMarkets = markets.filter(m => m.resolved)
  const totalVolume = markets.reduce((sum, m) => sum + m.volume, 0)

  return (
    <div style={styles.container}>
      {notification && (
        <div style={{
          ...styles.notification,
          background: notification.type === 'error' 
            ? 'linear-gradient(135deg, #ff4757, #ff3838)' 
            : 'linear-gradient(135deg, #00d2d3, #0abde3)'
        }}>
          {notification.message}
        </div>
      )}

      <header style={styles.header}>
        <div style={styles.headerLeft}>
          <h1 style={styles.logo}>◈ POLYGENS <span style={styles.adminBadge}>ADMIN</span></h1>
        </div>
        <div style={styles.headerRight}>
          <a href="/" style={styles.viewSiteBtn}>View Site</a>
          <button style={styles.logoutBtn} onClick={handleLogout}>Logout</button>
        </div>
      </header>

      <main style={styles.main}>
        <div style={styles.statsGrid}>
          <div style={styles.statCard}>
            <div style={styles.statValue}>{markets.length}</div>
            <div style={styles.statLabel}>Total Markets</div>
          </div>
          <div style={styles.statCard}>
            <div style={styles.statValue}>{activeMarkets.length}</div>
            <div style={styles.statLabel}>Active Markets</div>
          </div>
          <div style={styles.statCard}>
            <div style={styles.statValue}>{resolvedMarkets.length}</div>
            <div style={styles.statLabel}>Resolved</div>
          </div>
          <div style={styles.statCard}>
            <div style={styles.statValue}>{totalVolume.toFixed(2)} SOL</div>
            <div style={styles.statLabel}>Total Volume</div>
          </div>
        </div>

        {treasury && (
          <div style={styles.treasuryCard}>
            <h3 style={styles.treasuryTitle}>💰 Treasury Wallet</h3>
            <p style={styles.treasuryAddress}>{treasury.address}</p>
            <p style={styles.treasuryBalance}>{treasury.balance.toFixed(4)} SOL</p>
          </div>
        )}

        <div style={styles.section}>
          <div style={styles.sectionHeader}>
            <h2 style={styles.sectionTitle}>Active Markets</h2>
            <button style={styles.createBtn} onClick={() => setShowCreateModal(true)}>
              + Create Market
            </button>
          </div>

          {activeMarkets.length === 0 ? (
            <p style={styles.emptyText}>No active markets</p>
          ) : (
            <div style={styles.marketsTable}>
              <div style={styles.tableHeader}>
                <span style={styles.colQuestion}>Question</span>
                <span style={styles.colCategory}>Category</span>
                <span style={styles.colOdds}>Odds</span>
                <span style={styles.colVolume}>Volume</span>
                <span style={styles.colDate}>End Date</span>
                <span style={styles.colActions}>Actions</span>
              </div>
              {activeMarkets.map(market => (
                <div key={market.id} style={styles.tableRow}>
                  <span style={styles.colQuestion}>
                    {market.trending && '🔥 '}{market.question}
                  </span>
                  <span style={styles.colCategory}>{market.category}</span>
                  <span style={styles.colOdds}>{market.yesOdds}%</span>
                  <span style={styles.colVolume}>{market.volume.toFixed(2)}</span>
                  <span style={styles.colDate}>{new Date(market.endDate).toLocaleDateString()}</span>
                  <span style={styles.colActions}>
                    <button 
                      style={styles.resolveBtn}
                      onClick={() => { setSelectedMarket(market); setShowResolveModal(true); }}
                    >
                      Resolve
                    </button>
                    <button 
                      style={styles.deleteBtn}
                      onClick={() => deleteMarket(market.id)}
                    >
                      Delete
                    </button>
                  </span>
                </div>
              ))}
            </div>
          )}
        </div>

        <div style={styles.section}>
          <h2 style={styles.sectionTitle}>Resolved Markets</h2>
          {resolvedMarkets.length === 0 ? (
            <p style={styles.emptyText}>No resolved markets</p>
          ) : (
            <div style={styles.marketsTable}>
              <div style={styles.tableHeader}>
                <span style={styles.colQuestion}>Question</span>
                <span style={styles.colCategory}>Category</span>
                <span style={styles.colVolume}>Volume</span>
                <span style={styles.colOutcome}>Outcome</span>
              </div>
              {resolvedMarkets.map(market => (
                <div key={market.id} style={{...styles.tableRow, opacity: 0.7}}>
                  <span style={styles.colQuestion}>{market.question}</span>
                  <span style={styles.colCategory}>{market.category}</span>
                  <span style={styles.colVolume}>{market.volume.toFixed(2)}</span>
                  <span style={{
                    ...styles.colOutcome,
                    color: market.outcome ? '#00d2d3' : '#ff6b6b'
                  }}>
                    {market.outcome ? '✓ YES' : '✗ NO'}
                  </span>
                </div>
              ))}
            </div>
          )}
        </div>
      </main>

      {/* Create Modal */}
      {showCreateModal && (
        <div style={styles.modalOverlay} onClick={() => setShowCreateModal(false)}>
          <div style={styles.modal} onClick={e => e.stopPropagation()}>
            <button style={styles.closeModal} onClick={() => setShowCreateModal(false)}>×</button>
            <h2 style={styles.modalTitle}>Create Market</h2>
            
            <div style={styles.formGroup}>
              <label style={styles.label}>Question</label>
              <input
                type="text"
                placeholder="Will Bitcoin reach $200k by end of 2025?"
                value={newMarket.question}
                onChange={e => setNewMarket({...newMarket, question: e.target.value})}
                style={styles.input}
              />
            </div>

            <div style={styles.formGroup}>
              <label style={styles.label}>Category</label>
              <select
                value={newMarket.category}
                onChange={e => setNewMarket({...newMarket, category: e.target.value})}
                style={styles.select}
              >
                {categories.map(cat => (
                  <option key={cat} value={cat}>{cat}</option>
                ))}
              </select>
            </div>

            <div style={styles.formGroup}>
              <label style={styles.label}>End Date</label>
              <input
                type="date"
                value={newMarket.endDate}
                onChange={e => setNewMarket({...newMarket, endDate: e.target.value})}
                style={styles.input}
              />
            </div>

            <div style={styles.checkboxGroup}>
              <input
                type="checkbox"
                id="trending"
                checked={newMarket.trending}
                onChange={e => setNewMarket({...newMarket, trending: e.target.checked})}
              />
              <label htmlFor="trending" style={styles.checkboxLabel}>🔥 Mark as Trending</label>
            </div>

            <button style={styles.submitBtn} onClick={createMarket}>Create Market</button>
          </div>
        </div>
      )}

      {/* Resolve Modal */}
      {showResolveModal && selectedMarket && (
        <div style={styles.modalOverlay} onClick={() => setShowResolveModal(false)}>
          <div style={styles.modal} onClick={e => e.stopPropagation()}>
            <button style={styles.closeModal} onClick={() => setShowResolveModal(false)}>×</button>
            <h2 style={styles.modalTitle}>Resolve Market</h2>
            <p style={styles.resolveQuestion}>{selectedMarket.question}</p>
            
            <p style={styles.resolveWarning}>
              ⚠️ This action cannot be undone. Winners will be paid automatically from treasury.
            </p>

            <div style={styles.resolveButtons}>
              <button 
                style={styles.resolveYes}
                onClick={() => resolveMarket(true)}
              >
                ✓ Resolve YES
              </button>
              <button 
                style={styles.resolveNo}
                onClick={() => resolveMarket(false)}
              >
                ✗ Resolve NO
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}

const styles: { [key: string]: React.CSSProperties } = {
  loginContainer: {
    minHeight: '100vh',
    background: 'linear-gradient(135deg, #0a0a0f 0%, #1a1a2e 50%, #0a0a0f 100%)',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    fontFamily: '-apple-system, BlinkMacSystemFont, sans-serif'
  },
  loginBox: {
    background: 'rgba(255,255,255,0.05)',
    border: '1px solid rgba(255,255,255,0.1)',
    borderRadius: 20,
    padding: 40,
    width: '100%',
    maxWidth: 400,
    textAlign: 'center'
  },
  loginTitle: {
    color: '#fff',
    fontSize: 28,
    marginBottom: 8
  },
  loginSubtitle: {
    color: '#888',
    marginBottom: 24
  },
  errorText: {
    color: '#ff6b6b',
    fontSize: 14,
    marginBottom: 12
  },
  loginBtn: {
    width: '100%',
    padding: 16,
    background: 'linear-gradient(135deg, #667eea, #764ba2)',
    border: 'none',
    borderRadius: 12,
    color: '#fff',
    fontSize: 16,
    fontWeight: 600,
    cursor: 'pointer',
    marginBottom: 16
  },
  backLink: {
    color: '#888',
    textDecoration: 'none',
    fontSize: 14
  },
  container: {
    minHeight: '100vh',
    background: 'linear-gradient(135deg, #0a0a0f 0%, #1a1a2e 50%, #0a0a0f 100%)',
    color: '#fff',
    fontFamily: '-apple-system, BlinkMacSystemFont, sans-serif'
  },
  notification: {
    position: 'fixed',
    top: 20,
    right: 20,
    padding: '16px 24px',
    borderRadius: 12,
    color: '#fff',
    fontWeight: 600,
    zIndex: 1000
  },
  header: {
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'space-between',
    padding: '20px 40px',
    borderBottom: '1px solid rgba(255,255,255,0.1)',
    background: 'rgba(10,10,15,0.8)'
  },
  headerLeft: {
    display: 'flex',
    alignItems: 'center',
    gap: 16
  },
  headerRight: {
    display: 'flex',
    alignItems: 'center',
    gap: 12
  },
  logo: {
    fontSize: 24,
    fontWeight: 700,
    background: 'linear-gradient(135deg, #00d2d3, #0abde3)',
    WebkitBackgroundClip: 'text',
    WebkitTextFillColor: 'transparent'
  },
  adminBadge: {
    background: 'linear-gradient(135deg, #ff6b6b, #ee5a5a)',
    WebkitBackgroundClip: 'text',
    WebkitTextFillColor: 'transparent',
    fontSize: 14,
    fontWeight: 700
  },
  viewSiteBtn: {
    padding: '10px 20px',
    background: 'rgba(255,255,255,0.1)',
    border: '1px solid rgba(255,255,255,0.2)',
    borderRadius: 8,
    color: '#fff',
    textDecoration: 'none',
    fontSize: 14
  },
  logoutBtn: {
    padding: '10px 20px',
    background: 'rgba(255,107,107,0.2)',
    border: '1px solid rgba(255,107,107,0.3)',
    borderRadius: 8,
    color: '#ff6b6b',
    cursor: 'pointer',
    fontSize: 14,
    fontWeight: 600
  },
  main: {
    maxWidth: 1200,
    margin: '0 auto',
    padding: '40px 20px'
  },
  statsGrid: {
    display: 'grid',
    gridTemplateColumns: 'repeat(4, 1fr)',
    gap: 20,
    marginBottom: 32
  },
  statCard: {
    background: 'rgba(255,255,255,0.05)',
    border: '1px solid rgba(255,255,255,0.1)',
    borderRadius: 16,
    padding: 24,
    textAlign: 'center'
  },
  statValue: {
    fontSize: 28,
    fontWeight: 700,
    color: '#00d2d3',
    marginBottom: 4
  },
  statLabel: {
    color: '#888',
    fontSize: 14
  },
  treasuryCard: {
    background: 'linear-gradient(135deg, rgba(0,210,211,0.1), rgba(0,210,211,0.05))',
    border: '1px solid rgba(0,210,211,0.2)',
    borderRadius: 16,
    padding: 24,
    marginBottom: 32,
    textAlign: 'center'
  },
  treasuryTitle: {
    fontSize: 18,
    fontWeight: 600,
    marginBottom: 8
  },
  treasuryAddress: {
    fontFamily: 'monospace',
    fontSize: 14,
    color: '#888',
    marginBottom: 8
  },
  treasuryBalance: {
    fontSize: 32,
    fontWeight: 700,
    color: '#00d2d3'
  },
  section: {
    marginBottom: 40
  },
  sectionHeader: {
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: 20
  },
  sectionTitle: {
    fontSize: 22,
    fontWeight: 600
  },
  createBtn: {
    padding: '12px 24px',
    background: 'linear-gradient(135deg, #00d2d3, #0abde3)',
    border: 'none',
    borderRadius: 10,
    color: '#fff',
    fontSize: 14,
    fontWeight: 600,
    cursor: 'pointer'
  },
  emptyText: {
    color: '#666',
    textAlign: 'center',
    padding: 40
  },
  marketsTable: {
    background: 'rgba(255,255,255,0.03)',
    border: '1px solid rgba(255,255,255,0.08)',
    borderRadius: 16,
    overflow: 'hidden'
  },
  tableHeader: {
    display: 'grid',
    gridTemplateColumns: '2fr 100px 80px 100px 120px 150px',
    padding: '16px 20px',
    background: 'rgba(255,255,255,0.05)',
    fontSize: 12,
    color: '#888',
    textTransform: 'uppercase',
    letterSpacing: 1
  },
  tableRow: {
    display: 'grid',
    gridTemplateColumns: '2fr 100px 80px 100px 120px 150px',
    padding: '16px 20px',
    borderTop: '1px solid rgba(255,255,255,0.05)',
    alignItems: 'center',
    fontSize: 14
  },
  colQuestion: { overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap', paddingRight: 12 },
  colCategory: { color: '#00d2d3' },
  colOdds: {},
  colVolume: {},
  colDate: { color: '#888' },
  colActions: { display: 'flex', gap: 8 },
  colOutcome: { fontWeight: 600 },
  resolveBtn: {
    padding: '6px 12px',
    background: 'rgba(0,210,211,0.2)',
    border: '1px solid rgba(0,210,211,0.3)',
    borderRadius: 6,
    color: '#00d2d3',
    fontSize: 12,
    cursor: 'pointer'
  },
  deleteBtn: {
    padding: '6px 12px',
    background: 'rgba(255,107,107,0.2)',
    border: '1px solid rgba(255,107,107,0.3)',
    borderRadius: 6,
    color: '#ff6b6b',
    fontSize: 12,
    cursor: 'pointer'
  },
  modalOverlay: {
    position: 'fixed',
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    background: 'rgba(0,0,0,0.8)',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    zIndex: 1000
  },
  modal: {
    background: 'linear-gradient(135deg, #1a1a2e, #16213e)',
    borderRadius: 20,
    padding: 32,
    width: '100%',
    maxWidth: 500,
    position: 'relative',
    border: '1px solid rgba(255,255,255,0.1)'
  },
  closeModal: {
    position: 'absolute',
    top: 16,
    right: 16,
    background: 'none',
    border: 'none',
    color: '#888',
    fontSize: 24,
    cursor: 'pointer'
  },
  modalTitle: {
    fontSize: 22,
    fontWeight: 600,
    marginBottom: 24
  },
  formGroup: {
    marginBottom: 20
  },
  label: {
    display: 'block',
    marginBottom: 8,
    color: '#888',
    fontSize: 14
  },
  input: {
    width: '100%',
    padding: 14,
    background: 'rgba(255,255,255,0.05)',
    border: '1px solid rgba(255,255,255,0.1)',
    borderRadius: 10,
    color: '#fff',
    fontSize: 15,
    boxSizing: 'border-box'
  },
  select: {
    width: '100%',
    padding: 14,
    background: 'rgba(255,255,255,0.05)',
    border: '1px solid rgba(255,255,255,0.1)',
    borderRadius: 10,
    color: '#fff',
    fontSize: 15
  },
  checkboxGroup: {
    display: 'flex',
    alignItems: 'center',
    gap: 10,
    marginBottom: 24
  },
  checkboxLabel: {
    color: '#888',
    fontSize: 14
  },
  submitBtn: {
    width: '100%',
    padding: 16,
    background: 'linear-gradient(135deg, #667eea, #764ba2)',
    border: 'none',
    borderRadius: 12,
    color: '#fff',
    fontSize: 16,
    fontWeight: 600,
    cursor: 'pointer'
  },
  resolveQuestion: {
    color: '#888',
    marginBottom: 20,
    lineHeight: 1.5
  },
  resolveWarning: {
    background: 'rgba(255,193,7,0.1)',
    border: '1px solid rgba(255,193,7,0.3)',
    borderRadius: 10,
    padding: 16,
    color: '#ffc107',
    fontSize: 14,
    marginBottom: 24
  },
  resolveButtons: {
    display: 'flex',
    gap: 12
  },
  resolveYes: {
    flex: 1,
    padding: 16,
    background: 'linear-gradient(135deg, #00d2d3, #0abde3)',
    border: 'none',
    borderRadius: 12,
    color: '#fff',
    fontSize: 16,
    fontWeight: 600,
    cursor: 'pointer'
  },
  resolveNo: {
    flex: 1,
    padding: 16,
    background: 'linear-gradient(135deg, #ff6b6b, #ee5a5a)',
    border: 'none',
    borderRadius: 12,
    color: '#fff',
    fontSize: 16,
    fontWeight: 600,
    cursor: 'pointer'
  }
}
