import { QPublicScraper, PropertyRecord } from '../property/qpublic-scraper'
import { ScrapedCase, ScrapedContact } from '../scrapers/base-scraper'
import { AddressService } from '../address/address-service'
import { PhoneService } from '../phone/phone-service'

export interface MatchResult {
  case: ScrapedCase
  properties: Array<PropertyRecord & { matchConfidence: number }>
  enrichedContacts: Array<ScrapedContact & {
    standardizedAddress?: string
    phone?: string
    phoneSource?: string
    phoneConfidence?: number
    upsDeliverable?: boolean
  }>
}

export class DataMatcher {
  private qpublicScraper: QPublicScraper
  private addressService: AddressService
  private phoneService: PhoneService

  constructor() {
    this.qpublicScraper = new QPublicScraper()
    this.addressService = new AddressService(
      process.env.ADDRESS_PROVIDER as 'ups' | 'usps' | 'free' || 'free'
    )
    this.phoneService = new PhoneService(
      process.env.PHONE_PROVIDER as 'csv' | 'truecaller' | 'whitepages' || 'csv'
    )
  }

  async processCase(scrapedCase: ScrapedCase): Promise<MatchResult> {
    console.log(`Processing case: ${scrapedCase.caseId}`)

    // Find matching properties
    const properties = await this.findMatchingProperties(scrapedCase)
    
    // Enrich contact information
    const enrichedContacts = await this.enrichContacts(scrapedCase.contacts, scrapedCase.decedentAddress)

    return {
      case: scrapedCase,
      properties,
      enrichedContacts
    }
  }

  private async findMatchingProperties(scrapedCase: ScrapedCase): Promise<Array<PropertyRecord & { matchConfidence: number }>> {
    const properties: Array<PropertyRecord & { matchConfidence: number }> = []

    try {
      // Search by decedent name
      if (scrapedCase.decedentName) {
        const ownerMatches = await this.qpublicScraper.searchByOwner(
          scrapedCase.decedentName,
          scrapedCase.county
        )
        
        for (const property of ownerMatches) {
          const confidence = this.calculateNameMatchConfidence(
            scrapedCase.decedentName,
            property.currentOwner
          )
          
          if (confidence > 0.7) {
            properties.push({ ...property, matchConfidence: confidence })
          }
        }
      }

      // Search by decedent address
      if (scrapedCase.decedentAddress) {
        const addressMatches = await this.qpublicScraper.searchByAddress(
          scrapedCase.decedentAddress,
          scrapedCase.county
        )

        for (const property of addressMatches) {
          const confidence = this.calculateAddressMatchConfidence(
            scrapedCase.decedentAddress,
            property.situsAddress
          )
          
          if (confidence > 0.8) {
            // Check if we already have this property (avoid duplicates)
            const existing = properties.find(p => p.parcelId === property.parcelId)
            if (!existing) {
              properties.push({ ...property, matchConfidence: confidence })
            } else if (existing.matchConfidence < confidence) {
              // Update with higher confidence
              existing.matchConfidence = confidence
            }
          }
        }
      }

      // Search by contact addresses
      for (const contact of scrapedCase.contacts) {
        if (contact.address) {
          const contactMatches = await this.qpublicScraper.searchByAddress(
            contact.address,
            scrapedCase.county
          )

          for (const property of contactMatches) {
            const confidence = this.calculateAddressMatchConfidence(
              contact.address,
              property.situsAddress
            ) * 0.9 // Lower confidence for contact matches

            if (confidence > 0.7) {
              const existing = properties.find(p => p.parcelId === property.parcelId)
              if (!existing) {
                properties.push({ ...property, matchConfidence: confidence })
              }
            }
          }
        }
      }

      // Sort by confidence
      properties.sort((a, b) => b.matchConfidence - a.matchConfidence)

      console.log(`Found ${properties.length} matching properties for case ${scrapedCase.caseId}`)
      return properties

    } catch (error) {
      console.error('Error finding matching properties:', error)
      return []
    } finally {
      await this.qpublicScraper.cleanup()
    }
  }

  private async enrichContacts(
    contacts: ScrapedContact[],
    decedentAddress?: string
  ): Promise<Array<ScrapedContact & {
    standardizedAddress?: string
    phone?: string
    phoneSource?: string
    phoneConfidence?: number
    upsDeliverable?: boolean
  }>> {
    const enriched = []

    for (const contact of contacts) {
      const enrichedContact: any = { ...contact }

      // Standardize address
      const addressToStandardize = contact.address || decedentAddress
      if (addressToStandardize) {
        try {
          const standardized = await this.addressService.standardizeAddress(addressToStandardize)
          enrichedContact.standardizedAddress = standardized.standardized
          enrichedContact.upsDeliverable = standardized.deliverable
        } catch (error) {
          console.error('Error standardizing address:', error)
        }
      }

      // Find phone number
      if (!contact.phone) {
        try {
          const phoneResult = await this.phoneService.searchPhone(
            contact.name,
            addressToStandardize
          )
          
          if (phoneResult) {
            enrichedContact.phone = phoneResult.phone
            enrichedContact.phoneSource = phoneResult.source
            enrichedContact.phoneConfidence = phoneResult.confidence
          }
        } catch (error) {
          console.error('Error finding phone number:', error)
        }
      }

      enriched.push(enrichedContact)
    }

    return enriched
  }

  private calculateNameMatchConfidence(name1: string, name2: string): number {
    if (!name1 || !name2) return 0

    const n1 = this.normalizeName(name1)
    const n2 = this.normalizeName(name2)

    // Exact match
    if (n1 === n2) return 1.0

    // Split into words
    const words1 = n1.split(' ').filter(w => w.length > 1)
    const words2 = n2.split(' ').filter(w => w.length > 1)

    if (words1.length === 0 || words2.length === 0) return 0

    let matches = 0
    for (const word1 of words1) {
      for (const word2 of words2) {
        if (word1 === word2) {
          matches++
          break
        } else if (word1.length > 3 && word2.length > 3 && 
                  (word1.includes(word2) || word2.includes(word1))) {
          matches += 0.8
          break
        }
      }
    }

    return Math.min(matches / Math.max(words1.length, words2.length), 1.0)
  }

  private calculateAddressMatchConfidence(address1: string, address2: string): number {
    if (!address1 || !address2) return 0

    const a1 = this.normalizeAddress(address1)
    const a2 = this.normalizeAddress(address2)

    // Exact match
    if (a1 === a2) return 1.0

    // Extract key components
    const num1 = this.extractHouseNumber(a1)
    const num2 = this.extractHouseNumber(a2)
    const street1 = this.extractStreetName(a1)
    const street2 = this.extractStreetName(a2)

    let score = 0

    // House number match (high weight)
    if (num1 && num2 && num1 === num2) {
      score += 0.4
    }

    // Street name match
    if (street1 && street2) {
      if (street1 === street2) {
        score += 0.4
      } else if (street1.includes(street2) || street2.includes(street1)) {
        score += 0.3
      }
    }

    // Zip code match
    const zip1 = this.extractZipCode(a1)
    const zip2 = this.extractZipCode(a2)
    if (zip1 && zip2 && zip1 === zip2) {
      score += 0.2
    }

    return Math.min(score, 1.0)
  }

  private normalizeName(name: string): string {
    return name
      .toUpperCase()
      .replace(/[^A-Z\s]/g, '')
      .replace(/\b(JR|SR|III|II|IV)\b/g, '') // Remove suffixes
      .replace(/\s+/g, ' ')
      .trim()
  }

  private normalizeAddress(address: string): string {
    return address
      .toUpperCase()
      .replace(/[^\w\s]/g, ' ')
      .replace(/\s+/g, ' ')
      .trim()
  }

  private extractHouseNumber(address: string): string | null {
    const match = address.match(/^\d+/)
    return match ? match[0] : null
  }

  private extractStreetName(address: string): string | null {
    // Extract everything after house number but before city/state/zip
    const parts = address.split(' ')
    if (parts.length < 2) return null
    
    // Skip house number, take street name and type
    const streetParts = []
    for (let i = 1; i < parts.length; i++) {
      const part = parts[i]
      // Stop at city indicators or zip codes
      if (/^\d{5}/.test(part) || ['GA', 'GEORGIA'].includes(part)) {
        break
      }
      streetParts.push(part)
    }
    
    return streetParts.join(' ') || null
  }

  private extractZipCode(address: string): string | null {
    const match = address.match(/\b(\d{5})/g)
    return match ? match[0] : null
  }

  async cleanup(): Promise<void> {
    await this.qpublicScraper.cleanup()
  }
}