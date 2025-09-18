import { useState, useEffect } from 'react'
import TideClock from './components/TideClock'
import { TideData, fetchTideData } from './services/tideService'
import './App.css'

function App() {
  const [tideData, setTideData] = useState<TideData | null>(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [lastUpdate, setLastUpdate] = useState<Date | null>(null)

  useEffect(() => {
    loadTideData()
    // Update every 15 minutes
    const interval = setInterval(loadTideData, 15 * 60 * 1000)
    return () => clearInterval(interval)
  }, [])

  const loadTideData = async () => {
    try {
      setLoading(true)
      setError(null)
      const data = await fetchTideData()
      setTideData(data)
      setLastUpdate(new Date())
    } catch (err) {
      setError('Erreur lors du chargement des données de marée')
      console.error('Tide data fetch error:', err)
    } finally {
      setLoading(false)
    }
  }

  const handleRefresh = () => {
    loadTideData()
  }

  return (
    <div className="app">
      <header className="app-header">
        <div className="header-content">
          <h1 className="app-title">
            <span className="wave-emoji">🌊</span>
            Horloge des Marées
          </h1>
          <p className="app-subtitle">Rimouski, Québec</p>
          <div className="flags">
            <span className="flag" title="Québec">🏴󐁣󐁿</span>
            <span className="flag" title="Acadie">🟦🟨⚡🟥</span>
          </div>
        </div>
      </header>

      <main className="app-main">
        {loading && !tideData && (
          <div className="loading-container">
            <div className="loading-spinner"></div>
            <p>Chargement des données de marée...</p>
          </div>
        )}

        {error && (
          <div className="error-container">
            <div className="error-icon">⚠️</div>
            <p className="error-message">{error}</p>
            <button onClick={handleRefresh} className="retry-button">
              🔄 Réessayer
            </button>
          </div>
        )}

        {tideData && !error && (
          <>
            <div className="clock-container">
              <TideClock tideData={tideData} loading={loading} />
            </div>

            <div className="info-panel">
              <div className="current-status">
                <h3>État Actuel</h3>
                <div className="status-grid">
                  <div className="status-item">
                    <span className="status-label">Niveau</span>
                    <span className="status-value">{tideData.currentLevel?.toFixed(2)} m</span>
                  </div>
                  <div className="status-item">
                    <span className="status-label">Tendance</span>
                    <span className={`status-value ${tideData.trend}`}>
                      {tideData.trend === 'rising' ? '⬆️ Montante' : '⬇️ Descendante'}
                    </span>
                  </div>
                  <div className="status-item">
                    <span className="status-label">Prochaine</span>
                    <span className="status-value">
                      {tideData.nextTide?.type === 'high' ? '🌊 Marée Haute' : '🏖️ Marée Basse'}
                    </span>
                  </div>
                  <div className="status-item">
                    <span className="status-label">Heure</span>
                    <span className="status-value">
                      {tideData.nextTide?.time ? new Date(tideData.nextTide.time).toLocaleTimeString('fr-CA', { hour: '2-digit', minute: '2-digit' }) : '--:--'}
                    </span>
                  </div>
                </div>
              </div>

              <div className="daily-tides">
                <h3>Marées du Jour</h3>
                <div className="tides-list">
                  {tideData.todaysTides?.map((tide, index) => (
                    <div key={index} className={`tide-item ${tide.type}`}>
                      <span className="tide-time">
                        {new Date(tide.time).toLocaleTimeString('fr-CA', { hour: '2-digit', minute: '2-digit' })}
                      </span>
                      <span className="tide-type">
                        {tide.type === 'high' ? '🌊 Haute' : '🏖️ Basse'}
                      </span>
                      <span className="tide-level">{tide.level?.toFixed(2)} m</span>
                    </div>
                  ))}
                </div>
              </div>
            </div>
          </>
        )}
      </main>

      <footer className="app-footer">
        <div className="footer-content">
          <div className="update-info">
            {lastUpdate && (
              <span className="last-update">
                Dernière mise à jour: {lastUpdate.toLocaleTimeString('fr-CA')}
              </span>
            )}
            <button onClick={handleRefresh} className="refresh-button" disabled={loading}>
              {loading ? '⏳' : '🔄'} Actualiser
            </button>
          </div>
          <div className="data-source">
            <span>Données: Pêches et Océans Canada (DFO-MPO)</span>
            <span className="data-type">
              {tideData?.lastUpdated && new Date(tideData.lastUpdated).getTime() > Date.now() - 60000
                ? '📡 API en temps réel'
                : '📄 Données locales CSV'}
            </span>
          </div>
        </div>
      </footer>
    </div>
  )
}

export default App