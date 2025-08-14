import { z } from 'zod'

const UPS_BASE_URL = process.env.UPS_BASE_URL
const UPS_CLIENT_ID = process.env.UPS_CLIENT_ID
const UPS_CLIENT_SECRET = process.env.UPS_CLIENT_SECRET

const UPS_ENABLED = !!(UPS_BASE_URL && UPS_CLIENT_ID && UPS_CLIENT_SECRET)

let cachedToken: { value: string, exp: number } | null = null

async function getToken (): Promise<string> {
  if (!UPS_ENABLED) throw new Error('UPS not configured')
  
  const now = Date.now()
  if (cachedToken && now < cachedToken.exp) return cachedToken.value

  const res = await fetch(`${UPS_BASE_URL}/security/v1/oauth/token`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
    body: new URLSearchParams({
      grant_type: 'client_credentials',
      client_id: UPS_CLIENT_ID,
      client_secret: UPS_CLIENT_SECRET
    })
  })
  if (!res.ok) throw new Error(`UPS OAuth failed ${res.status}`)
  const data = await res.json() as { access_token: string, expires_in: number }
  cachedToken = { value: data.access_token, exp: now + (data.expires_in - 60) * 1000 }
  return cachedToken.value
}

export interface VerifyInput {
  line1: string
  line2?: string
  city?: string
  state?: string
  postalCode?: string
  countryCode?: string
}

/** requestoption=3 (validation+classification) */
export async function verifyAddress (input: VerifyInput) {
  if (!UPS_ENABLED) {
    throw new Error('UPS address validation not configured')
  }
  const payload = {
    XAVRequest: {
      AddressKeyFormat: {
        AddressLine: [input.line1, input.line2].filter(Boolean),
        PoliticalDivision2: input.city,
        PoliticalDivision1: input.state,
        PostcodePrimaryLow: input.postalCode,
        CountryCode: input.countryCode ?? 'US'
      }
    }
  }

  const token = await getToken()
  const url = `${UPS_BASE_URL}/api/addressvalidation/1/3?regionalrequestindicator=true&maximumcandidatelistsize=10`
  const res = await fetch(url, {
    method: 'POST',
    headers: { Authorization: `Bearer ${token}`, 'Content-Type': 'application/json' },
    body: JSON.stringify(payload)
  })
  if (!res.ok) throw new Error(`UPS AV failed ${res.status}`)
  const data = await res.json()

  const Candidate = z.object({
    AddressKeyFormat: z.object({
      AddressLine: z.array(z.string()).optional(),
      PoliticalDivision2: z.string().optional(),
      PoliticalDivision1: z.string().optional(),
      PostcodePrimaryLow: z.string().optional(),
      CountryCode: z.string().optional()
    }).optional(),
    Quality: z.string().optional(),
    PostalCodeLowEnd: z.string().optional()
  })
  const Parsed = z.object({
    XAVResponse: z.object({
      Candidate: z.array(Candidate).optional(),
      ValidAddressIndicator: z.any().optional()
    })
  })

  const parsed = Parsed.safeParse(data)
  if (!parsed.success) throw new Error('Unexpected UPS AV shape')

  const candidates = parsed.data.XAVResponse.Candidate ?? []
  const best = candidates[0]
  return { ok: true as const, best, candidates }
}