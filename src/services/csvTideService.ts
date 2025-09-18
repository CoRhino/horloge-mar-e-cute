import { TideData, Tide } from './tideService'

/**
 * Service for parsing local CSV tide prediction files
 * This serves as a backup/alternative to the API service
 */

export interface CSVTideRecord {
  timestamp: string
  level: number
}

/**
 * Parse CSV tide prediction file
 */
export const parseCSVTideData = async (csvContent: string): Promise<TideData> => {
  try {
    const lines = csvContent.split('\n')
    const records: CSVTideRecord[] = []
    
    // Skip header lines and metadata
    let dataStartIndex = 0
    for (let i = 0; i < lines.length; i++) {
      const line = lines[i].trim()
      // Look for actual data lines (should contain date and numeric value)
      if (line.match(/^\d{4}-\d{2}-\d{2}.*,.*\d+\.\d+/)) {
        dataStartIndex = i
        break
      }
    }

    // Parse data lines
    for (let i = dataStartIndex; i < lines.length; i++) {
      const line = lines[i].trim()
      if (!line) continue
      
      const [dateStr, levelStr] = line.split(',')
      if (dateStr && levelStr) {
        const timestamp = parseCSVTimestamp(dateStr.trim())
        const level = parseFloat(levelStr.trim())
        
        if (timestamp && !isNaN(level)) {
          records.push({ timestamp, level })
        }
      }
    }

    return processCSVRecords(records)
  } catch (error) {
    console.error('Error parsing CSV tide data:', error)
    throw new Error('Failed to parse CSV tide data')
  }
}

/**
 * Load CSV tide data from public directory
 */
export const loadCSVTideData = async (): Promise<TideData> => {
  try {
    // Try to load today's CSV file
    const today = new Date()
    const dateStr = today.toISOString().split('T')[0] // YYYY-MM-DD format
    
    const response = await fetch(`/prediction/prédictions_02985_Rimouski_${dateStr}.csv`)
    
    if (!response.ok) {
      throw new Error(`CSV file not found: ${response.status}`)
    }
    
    const csvContent = await response.text()
    return parseCSVTideData(csvContent)
  } catch (error) {
    console.error('Error loading CSV tide data:', error)
    throw error
  }
}

/**
 * Parse CSV timestamp format to ISO string
 */
function parseCSVTimestamp(dateStr: string): string | null {
  try {
    // Handle various CSV date formats
    // Examples: "2025-09-11 14:30", "2025-09-11T14:30:00", etc.
    
    let cleanDateStr = dateStr.replace(/[""]/g, '').trim()
    
    // If it's just a date, assume it's for today
    if (cleanDateStr.match(/^\d{4}-\d{2}-\d{2}$/)) {
      cleanDateStr += ' 00:00:00'
    }
    
    // If it has date and time but no seconds
    if (cleanDateStr.match(/^\d{4}-\d{2}-\d{2} \d{2}:\d{2}$/)) {
      cleanDateStr += ':00'
    }
    
    // Convert space to T for ISO format
    cleanDateStr = cleanDateStr.replace(' ', 'T')
    
    // Add timezone if missing
    if (!cleanDateStr.includes('Z') && !cleanDateStr.includes('+') && !cleanDateStr.includes('-', 10)) {
      cleanDateStr += '-04:00' // Atlantic time
    }
    
    const date = new Date(cleanDateStr)
    return date.toISOString()
  } catch (error) {
    console.error('Error parsing CSV timestamp:', dateStr, error)
    return null
  }
}

/**
 * Process CSV records into TideData format
 */
function processCSVRecords(records: CSVTideRecord[]): TideData {
  const now = new Date()
  const today = new Date(now.getFullYear(), now.getMonth(), now.getDate())
  
  // Sort records by timestamp
  records.sort((a, b) => new Date(a.timestamp).getTime() - new Date(b.timestamp).getTime())
  
  // Find high and low tides (local extrema)
  const tides: Tide[] = []
  
  for (let i = 1; i < records.length - 1; i++) {
    const prev = records[i - 1]
    const current = records[i]
    const next = records[i + 1]
    
    // Check for local maximum (high tide)
    if (current.level > prev.level && current.level > next.level) {
      tides.push({
        time: current.timestamp,
        type: 'high',
        level: current.level
      })
    }
    // Check for local minimum (low tide)
    else if (current.level < prev.level && current.level < next.level) {
      tides.push({
        time: current.timestamp,
        type: 'low',
        level: current.level
      })
    }
  }
  
  // Get today's tides
  const todaysTides = tides.filter(tide => {
    const tideDate = new Date(tide.time)
    return tideDate >= today && tideDate < new Date(today.getTime() + 24 * 60 * 60 * 1000)
  })
  
  // Find next tide
  const nextTide = tides.find(tide => new Date(tide.time) > now) || null
  
  // Calculate current level (interpolate from records)
  const currentLevel = interpolateCurrentLevel(records, now)
  
  // Determine trend
  const trend = determineTrend(records, now)
  
  return {
    currentLevel,
    trend,
    nextTide,
    todaysTides,
    lastUpdated: now.toISOString()
  }
}

/**
 * Interpolate current tide level from CSV records
 */
function interpolateCurrentLevel(records: CSVTideRecord[], now: Date): number {
  const nowTime = now.getTime()
  
  // Find surrounding records
  let beforeRecord: CSVTideRecord | null = null
  let afterRecord: CSVTideRecord | null = null
  
  for (let i = 0; i < records.length - 1; i++) {
    const currentTime = new Date(records[i].timestamp).getTime()
    const nextTime = new Date(records[i + 1].timestamp).getTime()
    
    if (nowTime >= currentTime && nowTime <= nextTime) {
      beforeRecord = records[i]
      afterRecord = records[i + 1]
      break
    }
  }
  
  if (!beforeRecord || !afterRecord) {
    // Return last known level or default
    return records.length > 0 ? records[records.length - 1].level : 2.5
  }
  
  // Linear interpolation
  const beforeTime = new Date(beforeRecord.timestamp).getTime()
  const afterTime = new Date(afterRecord.timestamp).getTime()
  const progress = (nowTime - beforeTime) / (afterTime - beforeTime)
  
  return beforeRecord.level + (afterRecord.level - beforeRecord.level) * progress
}

/**
 * Determine current trend from CSV records
 */
function determineTrend(records: CSVTideRecord[], now: Date): 'rising' | 'falling' {
  const nowTime = now.getTime()
  
  // Look for trend over the last hour
  const oneHourAgo = nowTime - (60 * 60 * 1000)
  const recentRecords = records.filter(record => {
    const recordTime = new Date(record.timestamp).getTime()
    return recordTime >= oneHourAgo && recordTime <= nowTime
  })
  
  if (recentRecords.length < 2) {
    return 'rising' // Default
  }
  
  // Compare first and last levels in the recent period
  const firstLevel = recentRecords[0].level
  const lastLevel = recentRecords[recentRecords.length - 1].level
  
  return lastLevel > firstLevel ? 'rising' : 'falling'
}

/**
 * Check if CSV data is available for today
 */
export const isCSVDataAvailable = async (): Promise<boolean> => {
  try {
    const today = new Date()
    const dateStr = today.toISOString().split('T')[0]
    const response = await fetch(`/prediction/prédictions_02985_Rimouski_${dateStr}.csv`, { method: 'HEAD' })
    return response.ok
  } catch {
    return false
  }
}