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

        {/* Simple CTA Button */}
        <div className="flex flex-col items-center gap-4">
          <a
            href="/sign-up"
            className="inline-flex items-center px-6 py-3 border border-transparent text-base font-medium rounded-md shadow-sm text-white bg-blue-600 hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500"
          >
            Start Your Subscription - $29.99/Month
          </a>
          <p className="text-sm text-gray-600">Cancel anytime • No setup fees</p>
        </div>
      </div>

      {/* Simple message */}
      <div className="py-12 text-center">
        <p className="text-gray-600">
          This is a simplified version to test for JavaScript errors.
        </p>
      </div>
    </div>
  )
}