// Types for tide data
export interface Tide {
  time: string
  type: 'high' | 'low'
  level?: number
}

export interface TideData {
  currentLevel: number
  trend: 'rising' | 'falling'
  nextTide: Tide | null
  todaysTides: Tide[]
  lastUpdated: string
}

// Import CSV service for local data fallback
import { loadCSVTideData, isCSVDataAvailable } from './csvTideService'

// DFO-MPO API configuration
const DFO_API_BASE = 'https://api.waterlevels.gc.ca/api/v1'
const RIMOUSKI_STATION_ID = '03360' // Rimouski station ID

// Cache configuration
const CACHE_DURATION = 15 * 60 * 1000 // 15 minutes
let cachedData: TideData | null = null
let cacheTimestamp: number = 0

/**
 * Fetch tide data from DFO-MPO API for Rimouski station
 */
export const fetchTideData = async (): Promise<TideData> => {
  // Check cache first
  const now = Date.now()
  if (cachedData && (now - cacheTimestamp) < CACHE_DURATION) {
    return cachedData
  }

  try {
    // Get current date range (today and tomorrow for complete tide cycles)
    const today = new Date()
    const tomorrow = new Date(today)
    tomorrow.setDate(tomorrow.getDate() + 1)
    
    const startDate = formatDateForAPI(today)
    const endDate = formatDateForAPI(tomorrow)

    // Fetch predictions from DFO API
    const predictionsUrl = `${DFO_API_BASE}/stations/${RIMOUSKI_STATION_ID}/predictions?start=${startDate}&end=${endDate}`
    const observationsUrl = `${DFO_API_BASE}/stations/${RIMOUSKI_STATION_ID}/observations?start=${startDate}&end=${endDate}&limit=1`
    
    console.log('Fetching tide data from:', predictionsUrl)
    
    // Fetch both predictions and latest observation
    const [predictionsResponse, observationsResponse] = await Promise.all([
      fetch(predictionsUrl, {
        headers: {
          'Accept': 'application/json',
        }
      }),
      fetch(observationsUrl, {
        headers: {
          'Accept': 'application/json',
        }
      }).catch(() => null) // Observations might not be available
    ])

    if (!predictionsResponse.ok) {
      throw new Error(`DFO API error: ${predictionsResponse.status} ${predictionsResponse.statusText}`)
    }

    const predictionsData = await predictionsResponse.json()
    let observationsData = null
    
    if (observationsResponse?.ok) {
      observationsData = await observationsResponse.json()
    }

    // Process the data
    const tideData = processTideData(predictionsData, observationsData)
    
    // Cache the result
    cachedData = tideData
    cacheTimestamp = now
    
    return tideData

  } catch (error) {
    console.error('Error fetching tide data:', error)
    
    // Return mock data if API fails (for development/offline mode)
    if (cachedData) {
      console.log('Returning cached data due to API error')
      return cachedData
    }
    
    return generateMockTideData()
  }
}

/**
 * Process raw DFO API data into our TideData format
 */
function processTideData(predictionsData: any, observationsData: any): TideData {
  const now = new Date()
  const today = new Date(now.getFullYear(), now.getMonth(), now.getDate())
  
  // Extract high/low tide predictions
  const tides: Tide[] = []
  
  if (predictionsData?.predictions) {
    // DFO API returns predictions with eventType: 'high' or 'low'
    predictionsData.predictions.forEach((prediction: any) => {
      if (prediction.eventType === 'high' || prediction.eventType === 'low') {
        tides.push({
          time: prediction.eventDate,
          type: prediction.eventType,
          level: prediction.value
        })
      }
    })
  }

  // Sort tides by time
  tides.sort((a, b) => new Date(a.time).getTime() - new Date(b.time).getTime())

  // Get today's tides only
  const todaysTides = tides.filter(tide => {
    const tideDate = new Date(tide.time)
    return tideDate >= today && tideDate < new Date(today.getTime() + 24 * 60 * 60 * 1000)
  })

  // Find next tide
  const nextTide = tides.find(tide => new Date(tide.time) > now) || null

  // Calculate current level and trend
  let currentLevel = 2.5 // Default level
  let trend: 'rising' | 'falling' = 'rising'

  // Use observation data if available
  if (observationsData?.observations && observationsData.observations.length > 0) {
    const latestObservation = observationsData.observations[0]
    currentLevel = latestObservation.value || currentLevel
  } else {
    // Interpolate from predictions if no observations
    currentLevel = interpolateCurrentLevel(tides, now)
  }

  // Determine trend based on next tide
  if (nextTide) {
    trend = nextTide.type === 'high' ? 'rising' : 'falling'
  }

  return {
    currentLevel,
    trend,
    nextTide,
    todaysTides,
    lastUpdated: now.toISOString()
  }
}

/**
 * Interpolate current tide level from predictions
 */
function interpolateCurrentLevel(tides: Tide[], now: Date): number {
  if (tides.length < 2) return 2.5

  // Find the two tides that bracket the current time
  let beforeTide: Tide | null = null
  let afterTide: Tide | null = null

  for (let i = 0; i < tides.length - 1; i++) {
    const currentTide = tides[i]
    const nextTide = tides[i + 1]
    const currentTime = new Date(currentTide.time).getTime()
    const nextTime = new Date(nextTide.time).getTime()
    const nowTime = now.getTime()

    if (nowTime >= currentTime && nowTime <= nextTime) {
      beforeTide = currentTide
      afterTide = nextTide
      break
    }
  }

  if (!beforeTide || !afterTide || !beforeTide.level || !afterTide.level) {
    return 2.5 // Default if interpolation fails
  }

  // Linear interpolation
  const beforeTime = new Date(beforeTide.time).getTime()
  const afterTime = new Date(afterTide.time).getTime()
  const nowTime = now.getTime()
  
  const progress = (nowTime - beforeTime) / (afterTime - beforeTime)
  const levelDiff = afterTide.level - beforeTide.level
  
  return beforeTide.level + (levelDiff * progress)
}

/**
 * Generate mock tide data for development/offline mode
 */
function generateMockTideData(): TideData {
  const now = new Date()
  const today = new Date(now.getFullYear(), now.getMonth(), now.getDate())
  
  // Generate realistic tide times for Rimouski (semi-diurnal, ~12.4 hour cycle)
  const todaysTides: Tide[] = [
    {
      time: new Date(today.getTime() + 2 * 60 * 60 * 1000).toISOString(), // 2:00 AM
      type: 'low',
      level: 0.8
    },
    {
      time: new Date(today.getTime() + 8 * 60 * 60 * 1000).toISOString(), // 8:00 AM
      type: 'high',
      level: 4.2
    },
    {
      time: new Date(today.getTime() + 14 * 60 * 60 * 1000).toISOString(), // 2:00 PM
      type: 'low',
      level: 0.9
    },
    {
      time: new Date(today.getTime() + 20 * 60 * 60 * 1000).toISOString(), // 8:00 PM
      type: 'high',
      level: 4.1
    }
  ]

  const nextTide = todaysTides.find(tide => new Date(tide.time) > now) || todaysTides[0]
  const currentLevel = interpolateCurrentLevel(todaysTides, now)
  const trend = nextTide?.type === 'high' ? 'rising' : 'falling'

  return {
    currentLevel,
    trend,
    nextTide,
    todaysTides,
    lastUpdated: now.toISOString()
  }
}

/**
 * Format date for DFO API (YYYY-MM-DD format)
 */
function formatDateForAPI(date: Date): string {
  return date.toISOString().split('T')[0]
}

/**
 * Clear cached data (useful for testing or manual refresh)
 */
export const clearTideCache = (): void => {
  cachedData = null
  cacheTimestamp = 0
}

/**
 * Get cached data without making API call
 */
export const getCachedTideData = (): TideData | null => {
  const now = Date.now()
  if (cachedData && (now - cacheTimestamp) < CACHE_DURATION) {
    return cachedData
  }
  return null
}