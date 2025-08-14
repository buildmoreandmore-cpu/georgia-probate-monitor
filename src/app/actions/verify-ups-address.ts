'use server'

import { z } from 'zod'
import { createSafeActionClient } from 'next-safe-action'
import { verifyAddress } from '@/lib/ups-client'

const Input = z.object({
  line1: z.string().min(1),
  line2: z.string().optional(),
  city: z.string().optional(),
  state: z.string().optional(),
  postalCode: z.string().optional(),
  countryCode: z.string().default('US')
})

const action = createSafeActionClient()

export const verifyUpsAddress = action.schema(Input).action(async ({ parsedInput: input }) => {
  if (!input.postalCode && !(input.city && input.state))
    return { ok: false as const, message: 'Need postal code or city+state' }
  try {
    return await verifyAddress(input)
  } catch {
    return { ok: false as const, message: 'UPS validation failed' }
  }
})