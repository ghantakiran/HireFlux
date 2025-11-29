/**
 * Public Company Profile Page (Issue #113)
 *
 * Job seeker-facing company profile view
 * - Company information display
 * - Culture & benefits
 * - Office locations
 * - Social media links
 * - SEO optimization (meta tags, JSON-LD)
 * - Mobile responsive
 * - Hide incomplete sections
 */

import React from 'react';
import { Metadata } from 'next';
import {
  Building2,
  MapPin,
  Globe,
  Users,
  Briefcase,
  Linkedin,
  Twitter,
  Facebook,
  Instagram,
  CheckCircle2,
} from 'lucide-react';

// ============================================================================
// Types
// ============================================================================

interface CompanyData {
  name: string;
  slug: string;
  industry: string;
  size: string;
  website: string;
  description: string;
  logo: string | null;
  values: string;
  culture: string;
  benefits: string[];
  locations: Array<{
    id: string;
    address: string;
    type: 'Headquarters' | 'Office';
  }>;
  socialMedia: {
    linkedin: string;
    twitter: string;
    facebook: string;
    instagram: string;
  };
  isPublic: boolean;
}

// ============================================================================
// Mock Data (would come from API/database)
// ============================================================================

const MOCK_COMPANIES: Record<string, CompanyData> = {
  'techcorp-inc': {
    name: 'TechCorp Inc',
    slug: 'techcorp-inc',
    industry: 'Technology',
    size: '51-200 employees',
    website: 'https://techcorp.com',
    description: 'We build innovative software solutions that transform businesses and empower teams to achieve their goals.',
    logo: 'https://via.placeholder.com/200',
    values: 'Innovation, Collaboration, Growth',
    culture: 'We foster a creative and inclusive workplace where every voice matters and innovation thrives.',
    benefits: [
      'Health Insurance',
      'Remote Work',
      '401(k) Matching',
      'Unlimited PTO',
      'Professional Development',
      'Gym Membership',
    ],
    locations: [
      { id: '1', address: '123 Main St, San Francisco, CA 94105', type: 'Headquarters' },
      { id: '2', address: '456 Market St, New York, NY 10001', type: 'Office' },
      { id: '3', address: '789 Tech Blvd, Austin, TX 78701', type: 'Office' },
    ],
    socialMedia: {
      linkedin: 'https://linkedin.com/company/techcorp',
      twitter: 'https://twitter.com/techcorp',
      facebook: 'https://facebook.com/techcorp',
      instagram: 'https://instagram.com/techcorp',
    },
    isPublic: true,
  },
  'incomplete-company': {
    name: 'Incomplete Company',
    slug: 'incomplete-company',
    industry: 'Technology',
    size: '11-50 employees',
    website: 'https://incomplete.com',
    description: 'A company with minimal information.',
    logo: null,
    values: '',
    culture: '',
    benefits: [],
    locations: [],
    socialMedia: {
      linkedin: '',
      twitter: '',
      facebook: '',
      instagram: '',
    },
    isPublic: true,
  },
  'private-company': {
    name: 'Private Company',
    slug: 'private-company',
    industry: 'Finance',
    size: '201-500 employees',
    website: 'https://private.com',
    description: 'This is a private company.',
    logo: null,
    values: '',
    culture: '',
    benefits: [],
    locations: [],
    socialMedia: {
      linkedin: '',
      twitter: '',
      facebook: '',
      instagram: '',
    },
    isPublic: false,
  },
};

// ============================================================================
// Metadata Generation (SEO)
// ============================================================================

export async function generateMetadata({ params }: { params: { slug: string } }): Promise<Metadata> {
  const company = MOCK_COMPANIES[params.slug];

  if (!company) {
    return {
      title: 'Company Not Found',
    };
  }

  const truncatedDescription = company.description.length > 160
    ? company.description.substring(0, 160) + '...'
    : company.description;

  return {
    title: `${company.name} - Company Profile | HireFlux`,
    description: truncatedDescription,
    openGraph: {
      title: company.name,
      description: truncatedDescription,
      images: company.logo ? [company.logo] : [],
    },
  };
}

// ============================================================================
// Page Component
// ============================================================================

export default function CompanyPublicProfilePage({ params }: { params: { slug: string } }) {
  const company = MOCK_COMPANIES[params.slug];

  // Company not found
  if (!company) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center p-4">
        <div className="text-center">
          <h1 className="text-2xl font-bold text-gray-900 mb-2">Company Not Found</h1>
          <p className="text-gray-600">The company you're looking for doesn't exist.</p>
        </div>
      </div>
    );
  }

  // Private profile
  if (!company.isPublic) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center p-4">
        <div data-private-profile-message className="text-center">
          <h1 className="text-2xl font-bold text-gray-900 mb-2">Profile Not Available</h1>
          <p className="text-gray-600">This profile is not available</p>
        </div>
      </div>
    );
  }

  // Check what sections have content
  const hasBenefits = company.benefits.length > 0;
  const hasLocations = company.locations.length > 0;
  const hasCulture = company.values || company.culture;
  const hasSocialMedia = Object.values(company.socialMedia).some(url => url);

  // Generate JSON-LD structured data
  const jsonLd = {
    '@context': 'https://schema.org',
    '@type': 'Organization',
    name: company.name,
    url: company.website,
    logo: company.logo || undefined,
    description: company.description,
    address: company.locations
      .filter(loc => loc.type === 'Headquarters')
      .map(loc => ({
        '@type': 'PostalAddress',
        streetAddress: loc.address,
      }))[0],
    sameAs: Object.values(company.socialMedia).filter(url => url),
  };

  return (
    <>
      {/* JSON-LD Structured Data */}
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{ __html: JSON.stringify(jsonLd) }}
      />

      <div data-public-profile className="min-h-screen bg-gray-50 py-8">
        <div className="max-w-5xl mx-auto px-4 sm:px-6 lg:px-8">
          {/* Header Section */}
          <div className="bg-white rounded-lg shadow-sm p-8 mb-6">
            <div className="flex items-start gap-6">
              {/* Company Logo */}
              {company.logo && (
                <img
                  data-company-logo
                  src={company.logo}
                  alt={`${company.name} logo`}
                  className="w-24 h-24 rounded-lg object-cover border border-gray-200"
                />
              )}

              <div className="flex-1">
                {/* Company Name */}
                <h1 data-company-name className="text-3xl font-bold text-gray-900 mb-2">
                  {company.name}
                </h1>

                {/* Industry & Size */}
                <div className="flex flex-wrap gap-4 text-gray-600 mb-4">
                  <div data-company-industry className="flex items-center gap-2">
                    <Briefcase className="w-4 h-4" />
                    <span>{company.industry}</span>
                  </div>
                  <div data-company-size className="flex items-center gap-2">
                    <Users className="w-4 h-4" />
                    <span>{company.size}</span>
                  </div>
                  {company.website && (
                    <a
                      href={company.website}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="flex items-center gap-2 text-blue-600 hover:text-blue-700"
                    >
                      <Globe className="w-4 h-4" />
                      <span>Visit Website</span>
                    </a>
                  )}
                </div>

                {/* Description */}
                <p data-company-description className="text-gray-700 leading-relaxed">
                  {company.description}
                </p>
              </div>
            </div>
          </div>

          {/* Culture & Values Section */}
          {hasCulture && (
            <div data-culture-section className="bg-white rounded-lg shadow-sm p-8 mb-6">
              <h2 className="text-2xl font-semibold text-gray-900 mb-4">Culture & Values</h2>

              {company.values && (
                <div className="mb-4">
                  <h3 className="text-lg font-medium text-gray-900 mb-2">Our Values</h3>
                  <p className="text-gray-700">{company.values}</p>
                </div>
              )}

              {company.culture && (
                <div>
                  <h3 className="text-lg font-medium text-gray-900 mb-2">Our Culture</h3>
                  <p className="text-gray-700 leading-relaxed">{company.culture}</p>
                </div>
              )}
            </div>
          )}

          {/* Benefits Section */}
          {hasBenefits && (
            <div data-benefits-section className="bg-white rounded-lg shadow-sm p-8 mb-6">
              <h2 className="text-2xl font-semibold text-gray-900 mb-4">Benefits & Perks</h2>
              <div data-benefits-list className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                {company.benefits.map((benefit, index) => (
                  <div key={index} className="flex items-center gap-3">
                    <CheckCircle2 className="w-5 h-5 text-green-500 shrink-0" />
                    <span className="text-gray-700">{benefit}</span>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* Office Locations Section */}
          {hasLocations && (
            <div data-locations-section className="bg-white rounded-lg shadow-sm p-8 mb-6">
              <h2 className="text-2xl font-semibold text-gray-900 mb-4">Office Locations</h2>
              <div data-locations-list className="space-y-4">
                {company.locations.map((location) => (
                  <div key={location.id} data-location-item className="flex items-start gap-3">
                    <MapPin className="w-5 h-5 text-gray-400 mt-1" />
                    <div>
                      <p className="text-gray-900">{location.address}</p>
                      {location.type === 'Headquarters' && (
                        <span className="inline-block mt-1 px-2 py-0.5 bg-blue-100 text-blue-700 text-xs rounded-full">
                          Headquarters
                        </span>
                      )}
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* Social Media Section */}
          {hasSocialMedia && (
            <div className="bg-white rounded-lg shadow-sm p-8">
              <h2 className="text-2xl font-semibold text-gray-900 mb-4">Connect With Us</h2>
              <div className="flex flex-wrap gap-4">
                {company.socialMedia.linkedin && (
                  <a
                    data-social-linkedin
                    href={company.socialMedia.linkedin}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="flex items-center gap-2 px-4 py-2 border border-gray-300 rounded-lg hover:bg-gray-50 transition-colors"
                  >
                    <Linkedin className="w-5 h-5 text-blue-600" />
                    <span>LinkedIn</span>
                  </a>
                )}
                {company.socialMedia.twitter && (
                  <a
                    data-social-twitter
                    href={company.socialMedia.twitter}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="flex items-center gap-2 px-4 py-2 border border-gray-300 rounded-lg hover:bg-gray-50 transition-colors"
                  >
                    <Twitter className="w-5 h-5 text-blue-400" />
                    <span>Twitter</span>
                  </a>
                )}
                {company.socialMedia.facebook && (
                  <a
                    data-social-facebook
                    href={company.socialMedia.facebook}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="flex items-center gap-2 px-4 py-2 border border-gray-300 rounded-lg hover:bg-gray-50 transition-colors"
                  >
                    <Facebook className="w-5 h-5 text-blue-700" />
                    <span>Facebook</span>
                  </a>
                )}
                {company.socialMedia.instagram && (
                  <a
                    data-social-instagram
                    href={company.socialMedia.instagram}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="flex items-center gap-2 px-4 py-2 border border-gray-300 rounded-lg hover:bg-gray-50 transition-colors"
                  >
                    <Instagram className="w-5 h-5 text-pink-600" />
                    <span>Instagram</span>
                  </a>
                )}
              </div>
            </div>
          )}
        </div>
      </div>
    </>
  );
}
