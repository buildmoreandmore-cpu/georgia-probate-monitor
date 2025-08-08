import { z } from 'zod'

export const ContactSchema = z.object({
  type: z.enum(['executor', 'administrator', 'petitioner']),
  name: z.string(),
  original_address: z.string(),
  standardized_address: z.string(),
  ups_deliverable: z.boolean(),
  phone: z.string().nullable(),
  phone_source: z.enum(['csv', 'provider']).nullable()
})

export const ParcelSchema = z.object({
  parcel_id: z.string(),
  county: z.string(),
  situs_address: z.string(),
  tax_mailing_address: z.string(),
  current_owner: z.string(),
  last_sale_date: z.string().nullable(),
  assessed_value: z.number().nullable(),
  qpublic_url: z.string()
})

export const CaseOutputSchema = z.object({
  case_id: z.string(),
  county: z.string(),
  filing_date: z.string(),
  decedent: z.object({
    name: z.string(),
    address: z.string()
  }),
  estate_value: z.number().nullable(),
  contacts: z.array(ContactSchema),
  parcels: z.array(ParcelSchema)
})

export const ScrapingJobSchema = z.object({
  county: z.string(),
  source: z.string(),
  status: z.enum(['pending', 'running', 'completed', 'failed'])
})

export const SettingsSchema = z.object({
  address_provider: z.enum(['free', 'ups', 'usps']),
  phone_provider: z.enum(['csv', 'truecaller', 'whitepages']),
  rate_limit_rpm: z.number().min(1).max(1000),
  scrape_delay_ms: z.number().min(500).max(10000),
  enabled_counties: z.string(),
  cron_schedule: z.string()
})

export type CaseOutput = z.infer<typeof CaseOutputSchema>
export type Contact = z.infer<typeof ContactSchema>
export type Parcel = z.infer<typeof ParcelSchema>
export type ScrapingJob = z.infer<typeof ScrapingJobSchema>
export type Settings = z.infer<typeof SettingsSchema>