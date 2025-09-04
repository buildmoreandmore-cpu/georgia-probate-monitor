// import Link from 'next/link' // Unused import commented out for deployment fix
import { ChevronRightIcon, MagnifyingGlassIcon, DocumentTextIcon, ClockIcon, ShieldCheckIcon, GlobeAltIcon, CheckIcon } from '@heroicons/react/24/outline'
import { SafeCheckoutButton } from '@/components/SafeCheckoutButton'

export default function LandingPage() {
  return (
    <div className="mx-auto max-w-4xl px-4 md:px-6">
      {/* Hero Section */}
      <div className="text-center py-12 md:py-16">
        <h1 className="text-4xl md:text-5xl font-bold text-gray-900 mb-4 leading-tight">
          Access Georgia Probate Records Online Quickly & Securely
        </h1>
        
        <h2 className="text-xl md:text-2xl text-gray-600 mb-8 font-medium leading-relaxed">
          Search probate court documents, wills, and estate records from anywhere in Georgia—fast, reliable, and hassle-free.
        </h2>
        
        <p className="text-lg text-gray-700 mb-10 leading-relaxed max-w-3xl mx-auto">
          Looking for probate records in Georgia? Our online platform makes it simple to find, request, and access probate court filings, estate documents, wills, and related legal records. Whether you&apos;re researching family history, handling legal matters, or managing estate planning, we provide a streamlined process for accessing Georgia probate records online without long courthouse waits.
        </p>

        {/* CTA Button */}
        <div className="flex flex-col items-center gap-4">
          <SafeCheckoutButton />
          <p className="text-sm text-gray-600">Cancel anytime • No setup fees</p>
        </div>
      </div>

      {/* Key Benefits Section */}
      <div className="py-12 md:py-16">
        <h3 className="text-2xl font-bold text-gray-900 text-center mb-12">
          Why Choose Our Platform?
        </h3>
        
        <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-8">
          <div className="flex items-start space-x-4">
            <div className="flex-shrink-0">
              <GlobeAltIcon className="w-8 h-8 text-blue-600" />
            </div>
            <div>
              <h4 className="font-semibold text-gray-900 mb-2">Search Across Georgia Counties</h4>
              <p className="text-gray-600">Access probate records from counties throughout Georgia in one convenient location.</p>
            </div>
          </div>

          <div className="flex items-start space-x-4">
            <div className="flex-shrink-0">
              <DocumentTextIcon className="w-8 h-8 text-blue-600" />
            </div>
            <div>
              <h4 className="font-semibold text-gray-900 mb-2">Comprehensive Document Access</h4>
              <p className="text-gray-600">Find wills, estate plans, guardianship filings, and related court documents.</p>
            </div>
          </div>

          <div className="flex items-start space-x-4">
            <div className="flex-shrink-0">
              <ClockIcon className="w-8 h-8 text-blue-600" />
            </div>
            <div>
              <h4 className="font-semibold text-gray-900 mb-2">Available 24/7</h4>
              <p className="text-gray-600">Easy-to-use online platform accessible anytime, anywhere you need it.</p>
            </div>
          </div>

          <div className="flex items-start space-x-4">
            <div className="flex-shrink-0">
              <ShieldCheckIcon className="w-8 h-8 text-blue-600" />
            </div>
            <div>
              <h4 className="font-semibold text-gray-900 mb-2">Secure & Confidential</h4>
              <p className="text-gray-600">Safe, secure document retrieval with complete confidentiality protection.</p>
            </div>
          </div>

          <div className="flex items-start space-x-4">
            <div className="flex-shrink-0">
              <MagnifyingGlassIcon className="w-8 h-8 text-blue-600" />
            </div>
            <div>
              <h4 className="font-semibold text-gray-900 mb-2">Save Time</h4>
              <p className="text-gray-600">Digital access eliminates the need for time-consuming in-person courthouse visits.</p>
            </div>
          </div>

          <div className="flex items-start space-x-4">
            <div className="flex-shrink-0">
              <ChevronRightIcon className="w-8 h-8 text-blue-600" />
            </div>
            <div>
              <h4 className="font-semibold text-gray-900 mb-2">Instant Results</h4>
              <p className="text-gray-600">Get immediate access to public records without waiting in long lines.</p>
            </div>
          </div>
        </div>
      </div>

      {/* Pricing Section */}
      <div className="py-12 md:py-16 border-t border-gray-200">
        <h3 className="text-2xl font-bold text-gray-900 text-center mb-4">
          Simple, Transparent Pricing
        </h3>
        <p className="text-gray-600 text-center mb-12 max-w-2xl mx-auto">
          Get unlimited access to Georgia probate records with our comprehensive monthly subscription.
        </p>
        
        <div className="max-w-lg mx-auto">
          <div className="bg-white rounded-lg shadow-lg border border-gray-200 p-8">
            <div className="text-center mb-6">
              <h4 className="text-xl font-semibold text-gray-900 mb-2">Professional Access</h4>
              <div className="flex items-center justify-center">
                <span className="text-4xl font-bold text-gray-900">$29.99</span>
                <span className="text-gray-600 ml-2">/month</span>
              </div>
            </div>
            
            <ul className="space-y-3 mb-8">
              <li className="flex items-center">
                <CheckIcon className="w-5 h-5 text-green-600 mr-3" />
                <span className="text-gray-700">Unlimited probate record searches</span>
              </li>
              <li className="flex items-center">
                <CheckIcon className="w-5 h-5 text-green-600 mr-3" />
                <span className="text-gray-700">Access to all Georgia counties</span>
              </li>
              <li className="flex items-center">
                <CheckIcon className="w-5 h-5 text-green-600 mr-3" />
                <span className="text-gray-700">Real-time case monitoring</span>
              </li>
              <li className="flex items-center">
                <CheckIcon className="w-5 h-5 text-green-600 mr-3" />
                <span className="text-gray-700">Download & export capabilities</span>
              </li>
              <li className="flex items-center">
                <CheckIcon className="w-5 h-5 text-green-600 mr-3" />
                <span className="text-gray-700">24/7 platform access</span>
              </li>
              <li className="flex items-center">
                <CheckIcon className="w-5 h-5 text-green-600 mr-3" />
                <span className="text-gray-700">Cancel anytime</span>
              </li>
            </ul>
            
            <SafeCheckoutButton className="w-full justify-center">
              <>
                Start Your Subscription
                <ChevronRightIcon className="w-5 h-5 ml-2" />
              </>
            </SafeCheckoutButton>
          </div>
        </div>
      </div>

      {/* FAQ Section */}
      <div className="py-12 md:py-16 border-t border-gray-200">
        <h3 className="text-2xl font-bold text-gray-900 text-center mb-12">
          Frequently Asked Questions
        </h3>
        
        <div className="space-y-8 max-w-3xl mx-auto">
          <div>
            <h4 className="text-xl font-semibold text-gray-900 mb-3">
              What are probate records?
            </h4>
            <p className="text-gray-700 leading-relaxed">
              Probate records are official court documents relating to the distribution of a deceased person&apos;s estate, guardianships, and wills. These documents provide legal documentation of how assets are handled after someone passes away.
            </p>
          </div>

          <div>
            <h4 className="text-xl font-semibold text-gray-900 mb-3">
              Who can access probate records in Georgia?
            </h4>
            <p className="text-gray-700 leading-relaxed">
              Most probate documents are public record and can be accessed by anyone. However, some documents may have restrictions based on privacy laws or court orders.
            </p>
          </div>

          <div>
            <h4 className="text-xl font-semibold text-gray-900 mb-3">
              Why search online?
            </h4>
            <p className="text-gray-700 leading-relaxed">
              Online access saves time and provides instant availability of public documents without the need to travel to the courthouse, wait in lines, or work within limited office hours.
            </p>
          </div>
        </div>
      </div>

      {/* Final CTA Section */}
      <div className="py-12 md:py-16 text-center bg-gray-50 rounded-lg">
        <h3 className="text-2xl font-bold text-gray-900 mb-4">
          Don&apos;t wait in line at the probate office—get the records you need now.
        </h3>
        
        <p className="text-lg text-gray-600 mb-8">
          Start your search for Georgia probate records online today.
        </p>
        
        <SafeCheckoutButton>
          <>
            <MagnifyingGlassIcon className="w-6 h-6 mr-2" />
            Subscribe for $29.99/Month
            <ChevronRightIcon className="w-5 h-5 ml-2" />
          </>
        </SafeCheckoutButton>
      </div>
    </div>
  )
}