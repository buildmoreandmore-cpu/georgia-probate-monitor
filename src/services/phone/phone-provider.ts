export interface PhoneResult {
  phone: string
  confidence: number
  source: string
}

export interface PhoneProvider {
  searchPhone(name: string, address?: string): Promise<PhoneResult | null>
}

export class TrueCallerProvider implements PhoneProvider {
  constructor(private apiKey: string) {}

  async searchPhone(name: string, address?: string): Promise<PhoneResult | null> {
    // TrueCaller API integration would go here
    // This is a stub implementation
    return {
      phone: '(555) 123-4567',
      confidence: 0.8,
      source: 'truecaller'
    }
  }
}

export class WhitePagesProvider implements PhoneProvider {
  constructor(private apiKey: string) {}

  async searchPhone(name: string, address?: string): Promise<PhoneResult | null> {
    // WhitePages API integration would go here
    // This is a stub implementation
    return {
      phone: '(555) 987-6543',
      confidence: 0.75,
      source: 'whitepages'
    }
  }
}

export class CSVPhoneProvider implements PhoneProvider {
  private phoneData: Map<string, PhoneResult> = new Map()

  constructor() {
    this.loadPhoneData()
  }

  async searchPhone(name: string, address?: string): Promise<PhoneResult | null> {
    const normalizedName = this.normalizeName(name)
    
    // Try exact match first
    const result = this.phoneData.get(normalizedName)
    if (result) {
      return result
    }

    // Try fuzzy matching
    for (const [csvName, phoneResult] of this.phoneData.entries()) {
      if (this.isNameMatch(normalizedName, csvName)) {
        return {
          ...phoneResult,
          confidence: phoneResult.confidence * 0.9 // Lower confidence for fuzzy match
        }
      }
    }

    return null
  }

  async loadFromCSV(csvContent: string): Promise<number> {
    const lines = csvContent.split('\n')
    let recordsLoaded = 0

    // Skip header row
    for (let i = 1; i < lines.length; i++) {
      const line = lines[i].trim()
      if (!line) continue

      try {
        const [name, phone, address] = this.parseCSVLine(line)
        if (name && phone) {
          const normalizedName = this.normalizeName(name)
          this.phoneData.set(normalizedName, {
            phone: this.normalizePhone(phone),
            confidence: 1.0,
            source: 'csv'
          })
          recordsLoaded++
        }
      } catch (error) {
        console.error(`Error parsing CSV line ${i + 1}: ${line}`, error)
        continue
      }
    }

    return recordsLoaded
  }

  private loadPhoneData(): void {
    // Load any existing phone data from storage
    // This would typically load from a database or file
  }

  private normalizeName(name: string): string {
    return name
      .toUpperCase()
      .replace(/[^A-Z\s]/g, '')
      .replace(/\s+/g, ' ')
      .trim()
  }

  private normalizePhone(phone: string): string {
    // Extract digits only
    const digits = phone.replace(/\D/g, '')
    
    // Add US country code if missing
    if (digits.length === 10) {
      return `+1${digits}`
    } else if (digits.length === 11 && digits.startsWith('1')) {
      return `+${digits}`
    }
    
    return phone // Return as-is if we can't normalize
  }

  private parseCSVLine(line: string): [string, string, string] {
    // Handle CSV parsing with potential commas in quoted fields
    const fields: string[] = []
    let current = ''
    let inQuotes = false
    
    for (let i = 0; i < line.length; i++) {
      const char = line[i]
      
      if (char === '"') {
        inQuotes = !inQuotes
      } else if (char === ',' && !inQuotes) {
        fields.push(current.trim())
        current = ''
      } else {
        current += char
      }
    }
    
    fields.push(current.trim()) // Add the last field
    
    return [
      fields[0]?.replace(/"/g, '') || '',
      fields[1]?.replace(/"/g, '') || '',
      fields[2]?.replace(/"/g, '') || ''
    ]
  }

  private isNameMatch(name1: string, name2: string): boolean {
    // Simple fuzzy matching logic
    const words1 = name1.split(' ')
    const words2 = name2.split(' ')
    
    // Check if any significant words match
    for (const word1 of words1) {
      if (word1.length > 2) { // Skip short words like middle initials
        for (const word2 of words2) {
          if (word2.length > 2 && (
            word1 === word2 || 
            word1.includes(word2) || 
            word2.includes(word1)
          )) {
            return true
          }
        }
      }
    }
    
    return false
  }

  getDataSize(): number {
    return this.phoneData.size
  }

  clearData(): void {
    this.phoneData.clear()
  }
}