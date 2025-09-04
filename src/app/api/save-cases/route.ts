import { NextResponse } from 'next/server'
import { PrismaClient } from '@prisma/client'

export const dynamic = 'force-dynamic'

const prisma = new PrismaClient()

interface ScrapedCase {
  caseId: string
  county: string
  filingDate: Date
  decedentName: string
  caseType: string
  status: string
  court: string
}

export async function POST(request: Request) {
  try {
    const { cases } = await request.json() as { cases: ScrapedCase[] }
    
    if (!Array.isArray(cases) || cases.length === 0) {
      return NextResponse.json({ 
        success: false, 
        error: 'No cases provided' 
      }, { status: 400 })
    }
    
    console.log(`💾 Saving ${cases.length} cases to database...`)
    
    // Save cases to database
    const savedCases = []
    
    for (const caseData of cases) {
      try {
        // Check if case already exists
        const existingCase = await prisma.case.findUnique({
          where: { caseId: caseData.caseId }
        })
        
        if (existingCase) {
          console.log(`⏭️  Case ${caseData.caseId} already exists, skipping`)
          continue
        }
        
        // Create new case
        const newCase = await prisma.case.create({
          data: {
            caseId: caseData.caseId,
            county: caseData.county,
            filingDate: caseData.filingDate,
            decedentName: caseData.decedentName,
            caseType: caseData.caseType,
            status: caseData.status,
            court: caseData.court
          }
        })
        
        savedCases.push(newCase)
        console.log(`✅ Saved case: ${caseData.caseId} - ${caseData.decedentName}`)
        
      } catch (error) {
        console.error(`❌ Failed to save case ${caseData.caseId}:`, error)
        // Continue with other cases even if one fails
      }
    }
    
    return NextResponse.json({
      success: true,
      message: `Successfully saved ${savedCases.length} new cases`,
      savedCount: savedCases.length,
      skippedCount: cases.length - savedCases.length,
      totalProcessed: cases.length
    })
    
  } catch (error) {
    console.error('Database error:', error)
    
    return NextResponse.json({
      success: false,
      error: 'Failed to save cases to database',
      details: error instanceof Error ? error.message : 'Unknown error'
    }, { status: 500 })
  } finally {
    await prisma.$disconnect()
  }
}