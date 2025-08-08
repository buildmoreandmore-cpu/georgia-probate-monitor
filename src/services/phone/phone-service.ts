import { 
  PhoneProvider, 
  PhoneResult, 
  TrueCallerProvider, 
  WhitePagesProvider, 
  CSVPhoneProvider 
} from './phone-provider'

export class PhoneService {
  private provider: PhoneProvider
  private csvProvider: CSVPhoneProvider

  constructor(providerType: 'csv' | 'truecaller' | 'whitepages' = 'csv') {
    this.csvProvider = new CSVPhoneProvider()
    this.provider = this.createProvider(providerType)
  }

  private createProvider(type: 'csv' | 'truecaller' | 'whitepages'): PhoneProvider {
    switch (type) {
      case 'truecaller':
        return new TrueCallerProvider(process.env.TRUECALLER_API_KEY || '')
      case 'whitepages':
        return new WhitePagesProvider(process.env.WHITEPAGES_API_KEY || '')
      case 'csv':
      default:
        return this.csvProvider
    }
  }

  async searchPhone(name: string, address?: string): Promise<PhoneResult | null> {
    if (!name || name.trim().length === 0) {
      return null
    }

    try {
      const result = await this.provider.searchPhone(name.trim(), address?.trim())
      
      // If primary provider fails and it's not CSV, try CSV as fallback
      if (!result && !(this.provider instanceof CSVPhoneProvider)) {
        return await this.csvProvider.searchPhone(name.trim(), address?.trim())
      }

      return result
    } catch (error) {
      console.error('Error searching for phone:', error)
      
      // Fallback to CSV provider
      if (!(this.provider instanceof CSVPhoneProvider)) {
        try {
          return await this.csvProvider.searchPhone(name.trim(), address?.trim())
        } catch (fallbackError) {
          console.error('Fallback phone search failed:', fallbackError)
        }
      }

      return null
    }
  }

  async batchSearchPhone(contacts: Array<{ name: string; address?: string }>): Promise<Array<PhoneResult | null>> {
    const results: Array<PhoneResult | null> = []
    
    for (const contact of contacts) {
      // Add delay to respect API rate limits
      if (results.length > 0) {
        await new Promise(resolve => setTimeout(resolve, 200))
      }
      
      const result = await this.searchPhone(contact.name, contact.address)
      results.push(result)
    }

    return results
  }

  async uploadCSVData(csvContent: string): Promise<number> {
    try {
      return await this.csvProvider.loadFromCSV(csvContent)
    } catch (error) {
      console.error('Error uploading CSV data:', error)
      throw new Error('Failed to process CSV data')
    }
  }

  getCSVDataSize(): number {
    return this.csvProvider.getDataSize()
  }

  clearCSVData(): void {
    this.csvProvider.clearData()
  }

  switchProvider(providerType: 'csv' | 'truecaller' | 'whitepages'): void {
    this.provider = this.createProvider(providerType)
  }

  getCurrentProvider(): string {
    if (this.provider instanceof TrueCallerProvider) return 'truecaller'
    if (this.provider instanceof WhitePagesProvider) return 'whitepages'
    return 'csv'
  }

  validatePhoneNumber(phone: string): boolean {
    // Basic phone number validation
    const phoneRegex = /^[\+]?[1-9][\d]{3,14}$/
    const cleaned = phone.replace(/\D/g, '')
    return phoneRegex.test(cleaned) && cleaned.length >= 10
  }

  formatPhoneNumber(phone: string): string {
    const cleaned = phone.replace(/\D/g, '')
    
    if (cleaned.length === 10) {
      return `(${cleaned.slice(0, 3)}) ${cleaned.slice(3, 6)}-${cleaned.slice(6)}`
    } else if (cleaned.length === 11 && cleaned.startsWith('1')) {
      return `+1 (${cleaned.slice(1, 4)}) ${cleaned.slice(4, 7)}-${cleaned.slice(7)}`
    }
    
    return phone // Return as-is if we can't format
  }
}