'use client'

import { useState, useEffect, useRef } from 'react'

// NEW: MarketOption type
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
  type: 'BINARY' | 'MULTIPLE_CHOICE'  // NEW
  imageUrl: string | null              // NEW
  yesOdds: number
  volume: number
  endDate: string
  resolved: boolean
  outcome: string | null               // Changed from boolean to string for multiple choice
  trending: boolean
  options: MarketOption[]              // NEW
}

export default function AdminPage() {
  const [isAuthenticated, setIsAuthenticated] = useState(false)
  const [password, setPassword] = useState('')
  const [authError, setAuthError] = useState('')
  const [markets, setMarkets] = useState<Market[]>([])
  const [showCreateModal, setShowCreateModal] = useState(false)
  const [showResolveModal, setShowResolveModal] = useState(false)
  const [selectedMarket, setSelectedMarket] = useState<Market | null>(null)
  const [selectedWinningOption, setSelectedWinningOption] = useState<string | null>(null)  // NEW
  
  // UPDATED: newMarket state with type, imageUrl, options
  const [newMarket, setNewMarket] = useState({
    question: '',
    category: 'Crypto',
    endDate: '',
    trending: false,
    type: 'BINARY' as 'BINARY' | 'MULTIPLE_CHOICE',  // NEW
    imageUrl: '' as string,                          // NEW
    options: ['', ''] as string[]                    // NEW: array of option labels
  })
  
  const [notification, setNotification] = useState<{ message: string; type: string } | null>(null)
  const [treasury, setTreasury] = useState<{ address: string; balance: number } | null>(null)
  
  // NEW: Image upload states
  const [uploading, setUploading] = useState(false)
  const fileInputRef = useRef<HTMLInputElement>(null)

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

  // NEW: Image upload handler
  const handleImageUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0]
    if (!file) return

    // Validate file type
    const validTypes = ['image/jpeg', 'image/png', 'image/gif', 'image/webp']
    if (!validTypes.includes(file.type)) {
      showNotif('Please upload a JPEG, PNG, GIF, or WebP image', 'error')
      return
    }

    // Validate file size (max 5MB)
    if (file.size > 5 * 1024 * 1024) {
      showNotif('Image must be less than 5MB', 'error')
      return
    }

    setUploading(true)
    
    try {
      const formData = new FormData()
      formData.append('file', file)

      const res = await fetch('/api/upload', {
        method: 'POST',
        body: formData
      })

      const data = await res.json()

      if (res.ok) {
        setNewMarket({ ...newMarket, imageUrl: data.url })
        showNotif('Image uploaded!')
      } else {
        showNotif(data.error || 'Upload failed', 'error')
      }
    } catch (error) {
      showNotif('Upload failed', 'error')
    } finally {
      setUploading(false)
    }
  }

  // NEW: Option management functions
  const addOption = () => {
    if (newMarket.options.length < 5) {
      setNewMarket({ ...newMarket, options: [...newMarket.options, ''] })
    }
  }

  const removeOption = (index: number) => {
    if (newMarket.options.length > 2) {
      const updated = newMarket.options.filter((_, i) => i !== index)
      setNewMarket({ ...newMarket, options: updated })
    }
  }

  const updateOption = (index: number, value: string) => {
    const updated = [...newMarket.options]
    updated[index] = value
    setNewMarket({ ...newMarket, options: updated })
  }

  // UPDATED: createMarket with type, imageUrl, options
  const createMarket = async () => {
    // Validation
    if (!newMarket.question.trim()) {
      showNotif('Please enter a question', 'error')
      return
    }
    if (!newMarket.endDate) {
      showNotif('Please select an end date', 'error')
      return
    }

    // Validate options for multiple choice
    if (newMarket.type === 'MULTIPLE_CHOICE') {
      const validOptions = newMarket.options.filter(o => o.trim())
      if (validOptions.length < 2) {
        showNotif('Please enter at least 2 options', 'error')
        return
      }
    }

    const body: any = {
      question: newMarket.question,
      category: newMarket.category,
      endDate: newMarket.endDate,
      trending: newMarket.trending,
      type: newMarket.type
    }

    // Add imageUrl if present
    if (newMarket.imageUrl) {
      body.imageUrl = newMarket.imageUrl
    }

    // Add options for multiple choice
    if (newMarket.type === 'MULTIPLE_CHOICE') {
      body.options = newMarket.options.filter(o => o.trim())
    }

    const res = await fetch('/api/admin/markets', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(body)
    })

    if (res.ok) {
      showNotif('Market created successfully!')
      setShowCreateModal(false)
      setNewMarket({ 
        question: '', 
        category: 'Crypto', 
        endDate: '', 
        trending: false,
        type: 'BINARY',
        imageUrl: '',
        options: ['', '']
      })
      fetchMarkets()
    } else {
      const data = await res.json()
      showNotif(data.error || 'Error creating market', 'error')
    }
  }

  // UPDATED: resolveMarket supports both binary and multiple choice
  const resolveMarket = async (outcome: boolean | string) => {
    if (!selectedMarket) return

    const body: any = { marketId: selectedMarket.id }
    
    if (selectedMarket.type === 'MULTIPLE_CHOICE') {
      if (!selectedWinningOption) {
        showNotif('Please select a winning option', 'error')
        return
      }
      body.outcome = selectedWinningOption
    } else {
      body.outcome = outcome
    }

    const res = await fetch('/api/admin/resolve', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(body)
    })

    const data = await res.json()

    if (res.ok) {
      showNotif(`Market resolved! ${data.winnersCount} winners paid out ${data.totalPaidOut.toFixed(4)} SOL`)
      setShowResolveModal(false)
      setSelectedMarket(null)
      setSelectedWinningOption(null)
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
                <span style={styles.colType}>Type</span>
                <span style={styles.colCategory}>Category</span>
                <span style={styles.colOdds}>Odds</span>
                <span style={styles.colVolume}>Volume</span>
                <span style={styles.colActions}>Actions</span>
              </div>
              {activeMarkets.map(market => (
                <div key={market.id} style={styles.tableRow}>
                  <span style={styles.colQuestion}>
                    {market.trending && '🔥 '}
                    {market.imageUrl && '🖼️ '}
                    {market.question}
                  </span>
                  <span style={styles.colType}>
                    <span style={market.type === 'MULTIPLE_CHOICE' ? styles.typeBadgeMulti : styles.typeBadgeBinary}>
                      {market.type === 'MULTIPLE_CHOICE' ? 'MULTI' : 'Y/N'}
                    </span>
                  </span>
                  <span style={styles.colCategory}>{market.category}</span>
                  <span style={styles.colOdds}>
                    {market.type === 'BINARY' 
                      ? `${market.yesOdds}%` 
                      : `${market.options?.length || 0} opts`
                    }
                  </span>
                  <span style={styles.colVolume}>{market.volume.toFixed(2)}</span>
                  <span style={styles.colActions}>
                    <button 
                      style={styles.resolveBtn}
                      onClick={() => { 
                        setSelectedMarket(market)
                        setSelectedWinningOption(null)
                        setShowResolveModal(true)
                      }}
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
                <span style={styles.colType}>Type</span>
                <span style={styles.colCategory}>Category</span>
                <span style={styles.colVolume}>Volume</span>
                <span style={styles.colOutcome}>Outcome</span>
              </div>
              {resolvedMarkets.map(market => (
                <div key={market.id} style={{...styles.tableRow, opacity: 0.7}}>
                  <span style={styles.colQuestion}>{market.question}</span>
                  <span style={styles.colType}>
                    <span style={market.type === 'MULTIPLE_CHOICE' ? styles.typeBadgeMulti : styles.typeBadgeBinary}>
                      {market.type === 'MULTIPLE_CHOICE' ? 'MULTI' : 'Y/N'}
                    </span>
                  </span>
                  <span style={styles.colCategory}>{market.category}</span>
                  <span style={styles.colVolume}>{market.volume.toFixed(2)}</span>
                  <span style={{
                    ...styles.colOutcome,
                    color: '#00d2d3'
                  }}>
                    {market.type === 'BINARY' 
                      ? (market.outcome === 'yes' || market.outcome === 'true' ? '✓ YES' : '✗ NO')
                      : `✓ ${market.options?.find(o => o.id === market.outcome)?.label || market.outcome}`
                    }
                  </span>
                </div>
              ))}
            </div>
          )}
        </div>
      </main>

      {/* Create Modal - UPDATED with type, image, options */}
      {showCreateModal && (
        <div style={styles.modalOverlay} onClick={() => setShowCreateModal(false)}>
          <div style={styles.modal} onClick={e => e.stopPropagation()}>
            <button style={styles.closeModal} onClick={() => setShowCreateModal(false)}>×</button>
            <h2 style={styles.modalTitle}>Create Market</h2>
            
            {/* NEW: Type Selector */}
            <div style={styles.formGroup}>
              <label style={styles.label}>Market Type</label>
              <div style={styles.typeSelector}>
                <button
                  style={newMarket.type === 'BINARY' ? styles.typeButtonActive : styles.typeButton}
                  onClick={() => setNewMarket({ ...newMarket, type: 'BINARY' })}
                >
                  Yes/No
                </button>
                <button
                  style={newMarket.type === 'MULTIPLE_CHOICE' ? styles.typeButtonActive : styles.typeButton}
                  onClick={() => setNewMarket({ ...newMarket, type: 'MULTIPLE_CHOICE' })}
                >
                  Multiple Choice
                </button>
              </div>
            </div>

            {/* NEW: Image Upload */}
            <div style={styles.formGroup}>
              <label style={styles.label}>Image (optional)</label>
              <input
                type="file"
                ref={fileInputRef}
                onChange={handleImageUpload}
                accept="image/jpeg,image/png,image/gif,image/webp"
                style={{ display: 'none' }}
              />
              {newMarket.imageUrl ? (
                <div style={styles.imagePreview}>
                  <img src={newMarket.imageUrl} alt="Preview" style={styles.previewImg} />
                  <button 
                    style={styles.removeImageBtn}
                    onClick={() => setNewMarket({ ...newMarket, imageUrl: '' })}
                  >
                    ✕ Remove
                  </button>
                </div>
              ) : (
                <button
                  style={styles.uploadBtn}
                  onClick={() => fileInputRef.current?.click()}
                  disabled={uploading}
                >
                  {uploading ? 'Uploading...' : '📷 Upload Image'}
                </button>
              )}
            </div>

            <div style={styles.formGroup}>
              <label style={styles.label}>Question</label>
              <input
                type="text"
                placeholder={newMarket.type === 'BINARY' 
                  ? "Will Bitcoin reach $200k by end of 2025?" 
                  : "Who will win the 2024 election?"
                }
                value={newMarket.question}
                onChange={e => setNewMarket({...newMarket, question: e.target.value})}
                style={styles.input}
              />
            </div>

            {/* NEW: Options for Multiple Choice */}
            {newMarket.type === 'MULTIPLE_CHOICE' && (
              <div style={styles.formGroup}>
                <label style={styles.label}>Options (2-5)</label>
                {newMarket.options.map((option, index) => (
                  <div key={index} style={styles.optionRow}>
                    <input
                      type="text"
                      placeholder={`Option ${index + 1}`}
                      value={option}
                      onChange={e => updateOption(index, e.target.value)}
                      style={styles.optionInput}
                    />
                    {newMarket.options.length > 2 && (
                      <button
                        style={styles.removeOptionBtn}
                        onClick={() => removeOption(index)}
                      >
                        ✕
                      </button>
                    )}
                  </div>
                ))}
                {newMarket.options.length < 5 && (
                  <button style={styles.addOptionBtn} onClick={addOption}>
                    + Add Option
                  </button>
                )}
              </div>
            )}

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

      {/* Resolve Modal - UPDATED for multiple choice */}
      {showResolveModal && selectedMarket && (
        <div style={styles.modalOverlay} onClick={() => setShowResolveModal(false)}>
          <div style={styles.modal} onClick={e => e.stopPropagation()}>
            <button style={styles.closeModal} onClick={() => setShowResolveModal(false)}>×</button>
            <h2 style={styles.modalTitle}>Resolve Market</h2>
            <p style={styles.resolveQuestion}>{selectedMarket.question}</p>
            
            <p style={styles.resolveWarning}>
              ⚠️ This action cannot be undone. Winners will be paid automatically from treasury.
            </p>

            {selectedMarket.type === 'BINARY' ? (
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
            ) : (
              /* NEW: Option selection for Multiple Choice */
              <div style={styles.resolveOptions}>
                <p style={styles.resolveOptionsLabel}>Select winning option:</p>
                {selectedMarket.options?.map(option => (
                  <button
                    key={option.id}
                    style={{
                      ...styles.resolveOptionBtn,
                      borderColor: selectedWinningOption === option.id ? '#00d2d3' : 'rgba(255,255,255,0.1)',
                      background: selectedWinningOption === option.id ? 'rgba(0,210,211,0.2)' : 'rgba(255,255,255,0.05)'
                    }}
                    onClick={() => setSelectedWinningOption(option.id)}
                  >
                    {option.label}
                    <span style={styles.optionOddsDisplay}>{option.odds.toFixed(0)}%</span>
                  </button>
                ))}
                <button
                  style={{
                    ...styles.submitBtn,
                    marginTop: 16,
                    opacity: selectedWinningOption ? 1 : 0.5
                  }}
                  onClick={() => resolveMarket(selectedWinningOption!)}
                  disabled={!selectedWinningOption}
                >
                  Confirm Resolution
                </button>
              </div>
            )}
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
    gridTemplateColumns: '2fr 80px 100px 80px 80px 150px',
    padding: '16px 20px',
    background: 'rgba(255,255,255,0.05)',
    fontSize: 12,
    color: '#888',
    textTransform: 'uppercase',
    letterSpacing: 1
  },
  tableRow: {
    display: 'grid',
    gridTemplateColumns: '2fr 80px 100px 80px 80px 150px',
    padding: '16px 20px',
    borderTop: '1px solid rgba(255,255,255,0.05)',
    alignItems: 'center',
    fontSize: 14
  },
  colQuestion: { overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap', paddingRight: 12 },
  colType: {},
  colCategory: { color: '#00d2d3' },
  colOdds: {},
  colVolume: {},
  colDate: { color: '#888' },
  colActions: { display: 'flex', gap: 8 },
  colOutcome: { fontWeight: 600 },
  // NEW: Type badges
  typeBadgeBinary: {
    background: 'rgba(0,210,211,0.2)',
    color: '#00d2d3',
    padding: '4px 8px',
    borderRadius: 6,
    fontSize: 11,
    fontWeight: 600
  },
  typeBadgeMulti: {
    background: 'rgba(102,126,234,0.2)',
    color: '#667eea',
    padding: '4px 8px',
    borderRadius: 6,
    fontSize: 11,
    fontWeight: 600
  },
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
    zIndex: 1000,
    padding: 16
  },
  modal: {
    background: 'linear-gradient(135deg, #1a1a2e, #16213e)',
    borderRadius: 20,
    padding: 32,
    width: '100%',
    maxWidth: 500,
    maxHeight: '90vh',
    overflowY: 'auto',
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
  // NEW: Type selector styles
  typeSelector: {
    display: 'flex',
    gap: 12
  },
  typeButton: {
    flex: 1,
    padding: 14,
    background: 'rgba(255,255,255,0.05)',
    border: '2px solid rgba(255,255,255,0.1)',
    borderRadius: 10,
    color: '#888',
    fontSize: 14,
    fontWeight: 600,
    cursor: 'pointer',
    transition: 'all 0.3s'
  },
  typeButtonActive: {
    flex: 1,
    padding: 14,
    background: 'rgba(0,210,211,0.15)',
    border: '2px solid #00d2d3',
    borderRadius: 10,
    color: '#00d2d3',
    fontSize: 14,
    fontWeight: 600,
    cursor: 'pointer'
  },
  // NEW: Image upload styles
  uploadBtn: {
    width: '100%',
    padding: 14,
    background: 'rgba(255,255,255,0.05)',
    border: '2px dashed rgba(255,255,255,0.2)',
    borderRadius: 10,
    color: '#888',
    fontSize: 14,
    cursor: 'pointer',
    transition: 'all 0.3s'
  },
  imagePreview: {
    position: 'relative',
    borderRadius: 10,
    overflow: 'hidden'
  },
  previewImg: {
    width: '100%',
    height: 150,
    objectFit: 'cover',
    borderRadius: 10
  },
  removeImageBtn: {
    position: 'absolute',
    top: 8,
    right: 8,
    padding: '6px 12px',
    background: 'rgba(255,107,107,0.9)',
    border: 'none',
    borderRadius: 6,
    color: '#fff',
    fontSize: 12,
    cursor: 'pointer'
  },
  // NEW: Option styles
  optionRow: {
    display: 'flex',
    gap: 8,
    marginBottom: 8
  },
  optionInput: {
    flex: 1,
    padding: 12,
    background: 'rgba(255,255,255,0.05)',
    border: '1px solid rgba(255,255,255,0.1)',
    borderRadius: 8,
    color: '#fff',
    fontSize: 14
  },
  removeOptionBtn: {
    padding: '0 12px',
    background: 'rgba(255,107,107,0.2)',
    border: '1px solid rgba(255,107,107,0.3)',
    borderRadius: 8,
    color: '#ff6b6b',
    fontSize: 16,
    cursor: 'pointer'
  },
  addOptionBtn: {
    width: '100%',
    padding: 10,
    background: 'rgba(0,210,211,0.1)',
    border: '1px dashed rgba(0,210,211,0.3)',
    borderRadius: 8,
    color: '#00d2d3',
    fontSize: 13,
    cursor: 'pointer'
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
  },
  // NEW: Resolve options for multiple choice
  resolveOptions: {
    display: 'flex',
    flexDirection: 'column',
    gap: 10
  },
  resolveOptionsLabel: {
    color: '#888',
    fontSize: 14,
    marginBottom: 8
  },
  resolveOptionBtn: {
    display: 'flex',
    justifyContent: 'space-between',
    alignItems: 'center',
    padding: 16,
    background: 'rgba(255,255,255,0.05)',
    border: '2px solid rgba(255,255,255,0.1)',
    borderRadius: 12,
    color: '#fff',
    fontSize: 15,
    fontWeight: 500,
    cursor: 'pointer',
    transition: 'all 0.3s'
  },
  optionOddsDisplay: {
    color: '#888',
    fontSize: 13
  }
}