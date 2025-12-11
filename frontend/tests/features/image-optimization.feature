# Feature: Image Optimization & Lazy Loading (Issue #145)
#
# As a user of HireFlux
# I want images to load quickly and efficiently
# So that I have a fast, smooth experience with minimal data usage
#
# Priority: P0 (Critical for performance and UX)
# Phase: 5 (Advanced)
# Estimated: 1 week
#
# Scope:
# - Convert all <img> tags to next/image
# - Implement lazy loading for below-the-fold images
# - Serve modern formats (WebP, AVIF)
# - Add responsive images with srcset
# - Prevent layout shift with placeholders
# - Optimize image sizes

Feature: Image Optimization & Lazy Loading

  # ============================================================================
  # 1. next/image Component Usage
  # ============================================================================

  @critical
  Scenario: All images use next/image component
    Given I inspect the production HTML source
    When I search for <img> elements
    Then at least 95% should be rendered by next/image
    And raw <img> tags should only exist for external sources
    And all next/image components should have proper configuration

  Scenario: Company logos use next/image
    Given I am viewing company profile pages
    When I inspect the logo elements
    Then they should use next/image component
    And they should have width and height attributes
    And they should have alt text for accessibility

  Scenario: User avatars use next/image
    Given I am viewing user profiles or listings
    When I inspect avatar images
    Then they should use next/image component
    And they should have fallback for missing images
    And they should be sized appropriately (small, medium, large)

  Scenario: Job listing images use next/image
    Given I am viewing job listings with company logos
    When I inspect the images
    Then they should use next/image component
    And they should have priority loading for above-the-fold
    And they should lazy load for below-the-fold

  # ============================================================================
  # 2. Lazy Loading - Below the Fold
  # ============================================================================

  @critical
  Scenario: Below-the-fold images are lazy loaded
    Given I am on a page with many images
    When the page initially loads
    Then only images in the viewport should be loaded
    And below-the-fold images should have loading="lazy"
    And they should load as I scroll down

  Scenario: Lazy loading on job listings page
    Given I am viewing the jobs page with 50 job cards
    When the page loads
    Then only the first 10-12 job card images should load
    And as I scroll, more images should load progressively
    And no more than 5 images should load simultaneously

  Scenario: Lazy loading on dashboard widgets
    Given I am on the dashboard with charts and images
    When the page loads
    Then above-the-fold images should load immediately
    And below-the-fold widgets should lazy load
    And scroll performance should remain smooth (60fps)

  Scenario: Lazy loading doesn't cause layout shift
    Given I am scrolling through a page with lazy-loaded images
    When images load
    Then the page should not jump or shift
    And image containers should reserve space
    And CLS should remain under 0.1

  # ============================================================================
  # 3. Modern Image Formats (WebP, AVIF)
  # ============================================================================

  @critical
  Scenario: Images are served in WebP format
    Given I am using a modern browser that supports WebP
    When I load a page with images
    Then images should be served as WebP
    And the Content-Type should be image/webp
    And there should be fallbacks for older browsers

  Scenario: Images are served in AVIF format when supported
    Given I am using a browser that supports AVIF
    When I load images
    Then they should be served as AVIF (smaller than WebP)
    And there should be progressive enhancement
    And fallback chain should be: AVIF → WebP → JPEG/PNG

  Scenario: Image format fallbacks work correctly
    Given I am using an older browser without WebP support
    When I request images
    Then I should receive JPEG or PNG format
    And images should still display correctly
    And no broken images should appear

  Scenario: File size reduction with modern formats
    Given I compare image sizes between formats
    When I measure file sizes
    Then AVIF should be 30-50% smaller than JPEG
    And WebP should be 20-30% smaller than JPEG
    And quality should remain visually identical

  # ============================================================================
  # 4. Responsive Images (srcset)
  # ============================================================================

  Scenario: Images have multiple sizes for different devices
    Given I inspect next/image components
    When I check the rendered HTML
    Then images should have srcset attribute
    And they should have sizes attribute
    And multiple resolutions should be generated (1x, 2x, 3x)

  Scenario: Correct image size served based on device
    Given I am on a mobile device with 375px width
    When I request an image
    Then the server should serve a mobile-optimized size
    And it should not download desktop-sized images
    And bandwidth should be conserved

  Scenario: Retina displays get high-resolution images
    Given I am on a device with 2x or 3x pixel density
    When images load
    Then they should be sharp and crisp
    And the appropriate resolution should be served
    And no pixelation should be visible

  # ============================================================================
  # 5. Placeholder and Blur
  # ============================================================================

  @critical
  Scenario: Images have blur placeholders during load
    Given I am on a slow connection
    When images are loading
    Then I should see a blurred placeholder
    And the placeholder should match the aspect ratio
    And the transition to full image should be smooth

  Scenario: LQIP (Low Quality Image Placeholder) is used
    Given I load a page with large images
    When the page renders
    Then low-quality placeholders should show immediately
    And they should provide a preview of the final image
    And full images should progressively enhance

  Scenario: Placeholder prevents layout shift
    Given I am loading a page with images
    When placeholders are shown
    Then they should occupy the exact space of the final image
    And no content should shift when images load
    And CLS should be 0 for image loading

  Scenario: Skeleton loaders for missing placeholders
    Given an image doesn't have a blur placeholder
    When the image is loading
    Then a skeleton loader should be displayed
    And it should have the correct dimensions
    And it should animate smoothly

  # ============================================================================
  # 6. Image Dimensions (Width & Height)
  # ============================================================================

  @critical
  Scenario: All images have explicit width and height
    Given I inspect all next/image components
    When I check their attributes
    Then 100% should have width specified
    And 100% should have height specified
    And aspect ratios should be preserved

  Scenario: Images prevent Cumulative Layout Shift
    Given I load a page with images
    When I measure CLS
    Then the CLS score should be < 0.1
    And images should not cause content to jump
    And space should be reserved before images load

  Scenario: Responsive images maintain aspect ratio
    Given I resize the browser window
    When images adapt to the new size
    Then they should maintain their aspect ratio
    And they should not appear stretched or squished
    And object-fit should be used appropriately

  # ============================================================================
  # 7. Priority Loading
  # ============================================================================

  Scenario: Above-the-fold images have priority
    Given I am on any page
    When I inspect the first visible image
    Then it should have priority={true}
    And it should load before other resources
    And it should not be lazy loaded

  Scenario: Hero images load first
    Given I am on a landing page with a hero image
    When the page loads
    Then the hero image should have highest priority
    And it should be part of the LCP element
    And it should load within 1 second

  Scenario: Logo and critical branding load first
    Given I am on any page
    When the page renders
    Then the company logo should load immediately
    And it should not lazy load
    And it should be preloaded in the <head>

  # ============================================================================
  # 8. Image Optimization Settings
  # ============================================================================

  Scenario: Images are optimized with correct quality
    Given I inspect image optimization settings
    When I check the quality parameter
    Then it should be between 75-85 for photos
    And it should be 90+ for logos and icons
    And there should be no visible quality degradation

  Scenario: Image caching is configured correctly
    Given I load an image
    When I check the response headers
    Then Cache-Control should have a long max-age
    And images should be versioned (content hash)
    And subsequent loads should come from cache

  Scenario: Image CDN is being used
    Given I inspect image URLs
    When images load
    Then they should be served from a CDN
    And URLs should include optimization parameters
    And images should be geographically distributed

  # ============================================================================
  # 9. External Images
  # ============================================================================

  Scenario: External images are proxied through next/image
    Given I have images from external domains
    When I use next/image with external URLs
    Then they should be allowed in next.config.js
    And they should be optimized by Next.js
    And they should be cached on the CDN

  Scenario: User-uploaded images are optimized
    Given users upload profile pictures or company logos
    When images are displayed
    Then they should be processed through next/image
    And they should be resized to appropriate dimensions
    And they should be converted to modern formats

  # ============================================================================
  # 10. Performance Impact
  # ============================================================================

  @critical
  Scenario: Image optimization improves LCP
    Given I measure LCP before optimization
    When I implement next/image everywhere
    Then LCP should improve by at least 30%
    And it should be under 2.5 seconds
    And the LCP element should be an optimized image

  Scenario: Image optimization reduces page weight
    Given I measure total page size before optimization
    When I implement WebP/AVIF and lazy loading
    Then page weight should decrease by 40-60%
    And initial load should be under 1MB
    And subsequent loads should be faster (cache)

  Scenario: Image optimization improves CLS
    Given I measure CLS before optimization
    When I add explicit dimensions and placeholders
    Then CLS should be under 0.1
    And there should be zero layout shifts from images
    And the page should feel more stable

  # ============================================================================
  # 11. Accessibility
  # ============================================================================

  Scenario: All images have descriptive alt text
    Given I inspect all images in the app
    When I check the alt attributes
    Then 100% should have alt text
    And decorative images should have alt=""
    And alt text should be descriptive and meaningful

  Scenario: Alt text is contextually appropriate
    Given I am viewing a job listing with company logo
    When I check the alt text
    Then it should describe the company (e.g., "Acme Corp logo")
    And it should not be generic (e.g., not just "logo")
    And it should help screen reader users

  # ============================================================================
  # 12. Error Handling
  # ============================================================================

  Scenario: Broken images show fallback
    Given an image fails to load (404)
    When the error occurs
    Then a fallback placeholder should be shown
    And it should not break the layout
    And an error should be logged for monitoring

  Scenario: Missing images use default placeholder
    Given a user profile has no avatar
    When I view the profile
    Then a default avatar should be displayed
    And it should use next/image component
    And it should match the design system

  # ============================================================================
  # 13. Specific Page Optimizations
  # ============================================================================

  Scenario: Dashboard images are optimized
    Given I am on the dashboard
    When I inspect all images
    Then profile avatars should use next/image
    And chart icons should be SVG (not raster images)
    And all images should lazy load except above-the-fold

  Scenario: Job listings images are optimized
    Given I am viewing 50 job listings
    When the page loads
    Then company logos should use next/image
    And they should be sized consistently (e.g., 64x64)
    And lazy loading should prevent loading all 50 at once

  Scenario: Company profile images are optimized
    Given I am viewing a company profile page
    When images load
    Then the company banner should use next/image
    And employee photos should lazy load
    And office photos should be in a gallery with lazy loading

  # ============================================================================
  # 14. Mobile Optimization
  # ============================================================================

  Scenario: Mobile devices receive smaller images
    Given I am on a mobile device
    When I load a page with images
    Then images should be appropriately sized for mobile
    And I should not download desktop-sized images
    And data usage should be minimized

  Scenario: Mobile images load quickly on 3G
    Given I simulate a 3G connection on mobile
    When I load the dashboard
    Then images should load within 3 seconds
    And progressive loading should show placeholders
    And the experience should feel fast

  # ============================================================================
  # 15. Monitoring and Analytics
  # ============================================================================

  Scenario: Image performance is monitored
    Given I have performance monitoring enabled
    When images load in production
    Then image load times should be tracked
    And format distribution should be measured (WebP %, AVIF %)
    And optimization effectiveness should be reported

  Scenario: Broken images are detected
    Given I have error monitoring enabled
    When an image fails to load
    Then the error should be logged
    And I should be notified if error rate exceeds threshold
    And problematic images should be identified

  # ============================================================================
  # 16. Acceptance Criteria Validation
  # ============================================================================

  @acceptance
  Scenario: All images are optimized
    Given I audit all images in the application
    Then 95%+ should use next/image
    And all should have width/height
    And all should have alt text
    And modern formats should be served

  @acceptance
  Scenario: Lazy loading is working
    Given I test lazy loading on various pages
    Then below-the-fold images should not load initially
    And they should load on scroll
    And no layout shift should occur

  @acceptance
  Scenario: Modern formats are served
    Given I inspect image responses
    Then WebP should be served to supporting browsers
    And AVIF should be served when supported
    And fallbacks should work for older browsers

  @acceptance
  Scenario: No layout shift from images
    Given I measure CLS across all pages
    Then CLS should be < 0.1
    And images should not cause content jumping
    And all images should have reserved space
