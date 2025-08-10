import { NextRequest, NextResponse } from 'next/server'
import { z } from 'zod'
import { prisma } from '@/lib/prisma'
import { rateLimiter, getClientIdentifier } from '@/lib/rate-limiter'
// Removed unused SettingsSchema import

export const dynamic = 'force-dynamic'
export const runtime = 'nodejs'

const UpdateSettingsSchema = z.record(z.string(), z.any())

export async function GET(request: NextRequest) {
  try {
    // Rate limiting
    const clientId = getClientIdentifier(request)
    const rateLimit = rateLimiter.allow(clientId)
    
    if (!rateLimit.allowed) {
      return NextResponse.json(
        { error: 'Rate limit exceeded' },
        { status: 429 }
      )
    }

    const settings = await prisma.settings.findMany()
    
    const settingsObject = settings.reduce((acc: any, setting: any) => {
      acc[setting.key] = setting.value
      return acc
    }, {} as Record<string, string>)

    return NextResponse.json({ data: settingsObject })

  } catch (error) {
    console.error('Error fetching settings:', error)
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    )
  }
}

export async function PATCH(request: NextRequest) {
  try {
    // Rate limiting
    const clientId = getClientIdentifier(request)
    const rateLimit = rateLimiter.allow(clientId)
    
    if (!rateLimit.allowed) {
      return NextResponse.json(
        { error: 'Rate limit exceeded' },
        { status: 429 }
      )
    }

    const body = await request.json()
    const updates = UpdateSettingsSchema.parse(body)

    // Update each setting
    const updatedSettings = []
    
    for (const [key, value] of Object.entries(updates)) {
      const setting = await prisma.settings.upsert({
        where: { key },
        update: { 
          value: typeof value === 'string' ? value : JSON.stringify(value),
          updatedAt: new Date()
        },
        create: { 
          key, 
          value: typeof value === 'string' ? value : JSON.stringify(value)
        }
      })
      
      updatedSettings.push(setting)
    }

    return NextResponse.json({
      message: 'Settings updated successfully',
      data: updatedSettings
    })

  } catch (error) {
    console.error('Error updating settings:', error)
    
    if (error instanceof z.ZodError) {
      return NextResponse.json(
        { error: 'Invalid settings data', details: error.errors },
        { status: 400 }
      )
    }

    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    )
  }
}