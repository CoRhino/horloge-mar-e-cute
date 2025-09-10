import { useEffect, useState } from 'react'
import { TideData } from '../services/tideService'
import './TideClock.css'

interface TideClockProps {
  tideData: TideData
  loading?: boolean
}

const TideClock: React.FC<TideClockProps> = ({ tideData, loading = false }) => {
  const [currentTime, setCurrentTime] = useState(new Date())

  useEffect(() => {
    const timer = setInterval(() => {
      setCurrentTime(new Date())
    }, 1000)

    return () => clearInterval(timer)
  }, [])

  // Calculate tide cycle position (0-1, where 0 is low tide, 0.5 is high tide)
  const calculateTidePosition = (): number => {
    if (!tideData.todaysTides || tideData.todaysTides.length === 0) return 0

    const now = currentTime.getTime()
    const tides = tideData.todaysTides.sort((a, b) => 
      new Date(a.time).getTime() - new Date(b.time).getTime()
    )

    // Find the current tide cycle (between two consecutive tides)
    let prevTide = tides[tides.length - 1] // Default to last tide of previous day
    let nextTide = tides[0]

    for (let i = 0; i < tides.length - 1; i++) {
      const currentTideTime = new Date(tides[i].time).getTime()
      const nextTideTime = new Date(tides[i + 1].time).getTime()
      
      if (now >= currentTideTime && now <= nextTideTime) {
        prevTide = tides[i]
        nextTide = tides[i + 1]
        break
      }
    }

    if (!prevTide || !nextTide) return 0

    const prevTime = new Date(prevTide.time).getTime()
    const nextTime = new Date(nextTide.time).getTime()
    const progress = (now - prevTime) / (nextTime - prevTime)

    // If going from low to high tide, position goes from 0 to 0.5
    // If going from high to low tide, position goes from 0.5 to 1
    if (prevTide.type === 'low' && nextTide.type === 'high') {
      return progress * 0.5
    } else if (prevTide.type === 'high' && nextTide.type === 'low') {
      return 0.5 + (progress * 0.5)
    }

    return progress * 0.5
  }

  const tidePosition = calculateTidePosition()
  const handRotation = (tidePosition * 360) - 90 // -90 to start at top

  // Calculate tide level percentage for visual display
  const tideLevel = tideData.currentLevel || 0
  const maxLevel = 6 // Approximate max tide level for Rimouski
  const levelPercentage = Math.min(Math.max((tideLevel / maxLevel) * 100, 0), 100)

  return (
    <div className={`tide-clock ${loading ? 'loading' : ''}`}>
      <div className="clock-outer-ring">
        {/* Hour markers */}
        {Array.from({ length: 12 }, (_, i) => (
          <div
            key={i}
            className="hour-marker"
            style={{
              transform: `rotate(${i * 30}deg) translateY(-140px)`,
            }}
          >
            <div className="marker-dot" />
          </div>
        ))}

        {/* Tide cycle markers */}
        <div className="tide-markers">
          <div className="tide-marker high-tide" title="Marée Haute">
            <span>🌊</span>
          </div>
          <div className="tide-marker low-tide-right" title="Marée Basse">
            <span>🏖️</span>
          </div>
          <div className="tide-marker low-tide-left" title="Marée Basse">
            <span>🏖️</span>
          </div>
          <div className="tide-marker high-tide-bottom" title="Marée Haute">
            <span>🌊</span>
          </div>
        </div>

        {/* Tide level indicator ring */}
        <div className="tide-level-ring">
          <svg className="level-svg" viewBox="0 0 200 200">
            <circle
              cx="100"
              cy="100"
              r="85"
              fill="none"
              stroke="rgba(79, 172, 254, 0.2)"
              strokeWidth="6"
            />
            <circle
              cx="100"
              cy="100"
              r="85"
              fill="none"
              stroke="var(--color-accent-blue)"
              strokeWidth="6"
              strokeLinecap="round"
              strokeDasharray={`${(levelPercentage / 100) * 534.07} 534.07`}
              strokeDashoffset="133.52"
              transform="rotate(-90 100 100)"
              className="level-progress"
            />
          </svg>
        </div>

        {/* Main clock face */}
        <div className="clock-face">
          {/* Digital time display */}
          <div className="digital-time">
            {currentTime.toLocaleTimeString('fr-CA', {
              hour: '2-digit',
              minute: '2-digit',
              second: '2-digit'
            })}
          </div>

          {/* Current tide level */}
          <div className="current-level">
            <span className="level-value">{tideLevel.toFixed(2)}</span>
            <span className="level-unit">m</span>
          </div>

          {/* Tide trend indicator */}
          <div className={`trend-indicator ${tideData.trend}`}>
            {tideData.trend === 'rising' ? '⬆️' : '⬇️'}
            <span>{tideData.trend === 'rising' ? 'Montante' : 'Descendante'}</span>
          </div>

          {/* Next tide info */}
          {tideData.nextTide && (
            <div className="next-tide-info">
              <div className="next-tide-type">
                {tideData.nextTide.type === 'high' ? '🌊 Prochaine Haute' : '🏖️ Prochaine Basse'}
              </div>
              <div className="next-tide-time">
                {new Date(tideData.nextTide.time).toLocaleTimeString('fr-CA', {
                  hour: '2-digit',
                  minute: '2-digit'
                })}
              </div>
            </div>
          )}
        </div>

        {/* Tide hand */}
        <div
          className="tide-hand"
          style={{
            transform: `rotate(${handRotation}deg)`,
          }}
        >
          <div className="hand-tip" />
        </div>

        {/* Center dot */}
        <div className="center-dot" />
      </div>

      {/* Clock labels */}
      <div className="clock-labels">
        <div className="label-top">Haute Marée</div>
        <div className="label-right">Marée</div>
        <div className="label-bottom">Basse Marée</div>
        <div className="label-left">Cycle</div>
      </div>

      {/* Loading overlay */}
      {loading && (
        <div className="loading-overlay">
          <div className="loading-spinner-small" />
        </div>
      )}
    </div>
  )
}

export default TideClock