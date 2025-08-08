import { 
  AddressProvider, 
  StandardizedAddress, 
  UPSAddressProvider, 
  USPSAddressProvider, 
  FreeAddressProvider 
} from './address-provider'

export class AddressService {
  private provider: AddressProvider

  constructor(providerType: 'ups' | 'usps' | 'free' = 'free') {
    this.provider = this.createProvider(providerType)
  }

  private createProvider(type: 'ups' | 'usps' | 'free'): AddressProvider {
    switch (type) {
      case 'ups':
        return new UPSAddressProvider(
          process.env.UPS_API_KEY || '',
          process.env.UPS_USER_ID || '',
          process.env.UPS_PASSWORD || ''
        )
      case 'usps':
        return new USPSAddressProvider(
          process.env.USPS_USER_ID || ''
        )
      case 'free':
      default:
        return new FreeAddressProvider()
    }
  }

  async standardizeAddress(address: string): Promise<StandardizedAddress> {
    if (!address || address.trim().length === 0) {
      return {
        original: address,
        standardized: address,
        deliverable: false,
        confidence: 0,
        provider: 'none'
      }
    }

    try {
      return await this.provider.standardize(address.trim())
    } catch (error) {
      console.error('Error standardizing address:', error)
      
      // Fallback to free provider if paid provider fails
      if (this.provider instanceof UPSAddressProvider || this.provider instanceof USPSAddressProvider) {
        try {
          const freeProvider = new FreeAddressProvider()
          return await freeProvider.standardize(address.trim())
        } catch (fallbackError) {
          console.error('Fallback address standardization failed:', fallbackError)
        }
      }

      return {
        original: address,
        standardized: address.trim(),
        deliverable: false,
        confidence: 0,
        provider: 'error'
      }
    }
  }

  async validateDeliverability(address: string): Promise<boolean> {
    if (!address || address.trim().length === 0) {
      return false
    }

    try {
      return await this.provider.validateDeliverability(address.trim())
    } catch (error) {
      console.error('Error validating address deliverability:', error)
      return false
    }
  }

  async batchStandardize(addresses: string[]): Promise<StandardizedAddress[]> {
    const results: StandardizedAddress[] = []
    
    for (const address of addresses) {
      // Add delay to respect API rate limits
      if (results.length > 0) {
        await new Promise(resolve => setTimeout(resolve, 100))
      }
      
      const result = await this.standardizeAddress(address)
      results.push(result)
    }

    return results
  }

  switchProvider(providerType: 'ups' | 'usps' | 'free'): void {
    this.provider = this.createProvider(providerType)
  }

  getCurrentProvider(): string {
    if (this.provider instanceof UPSAddressProvider) return 'ups'
    if (this.provider instanceof USPSAddressProvider) return 'usps'
    return 'free'
  }
}