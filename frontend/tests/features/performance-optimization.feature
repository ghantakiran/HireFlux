# Feature: Performance Optimization - Core Web Vitals (Issue #144)
#
# As a user of HireFlux
# I want the application to load and respond quickly
# So that I have a smooth, fast experience regardless of my device or connection
#
# Priority: P0 (Critical for user experience and SEO)
# Phase: 5 (Advanced)
# Estimated: 2 weeks
#
# Scope:
# - Core Web Vitals (LCP, FID, CLS)
# - Lighthouse score >90
# - Bundle size optimization
# - Image optimization
# - Code splitting
# - Performance monitoring

Feature: Performance Optimization - Core Web Vitals

  # ============================================================================
  # 1. Largest Contentful Paint (LCP) - Loading Performance
  # ============================================================================

  @critical
  Scenario: LCP is under 2.5 seconds on desktop
    Given I am on a desktop device with a fast 4G connection
    When I navigate to the dashboard page
    Then the largest contentful paint should occur within 2.5 seconds
    And the LCP element should be the main content
    And there should be no layout shifts during LCP

  @critical
  Scenario: LCP is under 3.5 seconds on mobile
    Given I am on a mobile device with a 3G connection
    When I navigate to the dashboard page
    Then the largest contentful paint should occur within 3.5 seconds
    And images should load progressively
    And critical CSS should be inlined

  Scenario: LCP is optimized for job listings page
    Given I am viewing the jobs page
    When the page loads
    Then the first job card should be the LCP element
    And it should render within 2.5 seconds
    And images should be lazy loaded below the fold

  Scenario: LCP remains fast on subsequent navigations
    Given I have loaded the dashboard
    When I navigate to the jobs page
    And I navigate back to the dashboard
    Then the LCP should be under 1 second (from cache)
    And no unnecessary re-renders should occur

  # ============================================================================
  # 2. First Input Delay (FID) - Interactivity
  # ============================================================================

  @critical
  Scenario: FID is under 100ms for first interaction
    Given I am on the dashboard page
    And the page has fully loaded
    When I click a button within 3 seconds of page load
    Then the button should respond within 100ms
    And the UI should not be blocked by JavaScript

  Scenario: FID is low during heavy JavaScript execution
    Given I am on a page with data tables and charts
    When I click a filter button
    Then the interaction should respond within 100ms
    And background tasks should not block user input

  Scenario: FID is optimized with code splitting
    Given I navigate to different pages
    When I interact with page elements
    Then only necessary JavaScript should be loaded
    And interactions should remain responsive (<100ms)

  # ============================================================================
  # 3. Cumulative Layout Shift (CLS) - Visual Stability
  # ============================================================================

  @critical
  Scenario: CLS is under 0.1 on page load
    Given I am loading the dashboard page
    When the page renders
    Then the cumulative layout shift should be less than 0.1
    And no elements should shift unexpectedly
    And image dimensions should be reserved

  Scenario: CLS is minimal when loading images
    Given I am viewing a page with images
    When images load
    Then they should not cause content to shift
    And image containers should have explicit dimensions
    And placeholders should match final image size

  Scenario: CLS is zero for above-the-fold content
    Given I am on any page
    When the initial viewport loads
    Then there should be no layout shifts
    And font loading should not cause shifts (FOUT/FOIT)
    And skeleton loaders should match final content size

  Scenario: CLS is controlled during dynamic content loading
    Given I am viewing a job listing page
    When new jobs load dynamically
    Then they should appear below existing content
    And no existing content should shift
    And the user's scroll position should be preserved

  # ============================================================================
  # 4. Lighthouse Performance Score
  # ============================================================================

  @critical @lighthouse
  Scenario: Lighthouse performance score is above 90 on desktop
    Given I run a Lighthouse audit on desktop
    When the audit completes
    Then the Performance score should be >= 90
    And the Best Practices score should be >= 90
    And the Accessibility score should be >= 90
    And the SEO score should be >= 90

  @critical @lighthouse
  Scenario: Lighthouse performance score is above 85 on mobile
    Given I run a Lighthouse audit on mobile
    When the audit completes
    Then the Performance score should be >= 85
    And there should be no blocking resources
    And images should be optimized
    And text compression should be enabled

  Scenario: Lighthouse identifies no major performance issues
    Given I run a Lighthouse audit
    Then there should be no red (0-49) scores
    And there should be no critical performance warnings
    And all opportunities should be addressed
    And diagnostics should show healthy metrics

  # ============================================================================
  # 5. Bundle Size Optimization
  # ============================================================================

  Scenario: JavaScript bundle size is under 200KB (gzipped)
    Given I inspect the production build
    When I analyze the JavaScript bundles
    Then the main bundle should be under 200KB gzipped
    And vendor bundles should be cached separately
    And code splitting should be implemented

  Scenario: CSS bundle size is under 50KB (gzipped)
    Given I inspect the production build
    When I analyze the CSS bundles
    Then the total CSS should be under 50KB gzipped
    And critical CSS should be inlined
    And unused CSS should be removed

  Scenario: Total page weight is under 1MB for initial load
    Given I load the dashboard page
    When I measure total transferred bytes
    Then the initial page load should be under 1MB
    And fonts should be subset and optimized
    And images should be modern formats (WebP, AVIF)

  Scenario: Bundle analysis shows no duplicate dependencies
    Given I run a bundle analysis
    Then there should be no duplicate npm packages
    And tree shaking should be enabled
    And moment.js should not be in the bundle (use date-fns)

  # ============================================================================
  # 6. Image Optimization
  # ============================================================================

  Scenario: All images use next/image component
    Given I inspect the production HTML
    When I search for <img> tags
    Then 95% should be using next/image
    And images should have explicit width/height
    And images should have alt text

  Scenario: Images are served in modern formats
    Given I load a page with images
    When I inspect the network tab
    Then images should be served as WebP or AVIF
    And there should be fallbacks for older browsers
    And images should be properly sized (srcset)

  Scenario: Images are lazy loaded below the fold
    Given I am on a page with many images
    When the page loads
    Then only above-the-fold images should load initially
    And below-the-fold images should lazy load on scroll
    And lazy loading should not cause CLS

  Scenario: Image placeholders prevent layout shift
    Given I am loading a page with images
    When images load
    Then placeholder blur should be shown
    And final image should not cause layout shift
    And LQIP (Low Quality Image Placeholder) should be used

  # ============================================================================
  # 7. Code Splitting and Lazy Loading
  # ============================================================================

  Scenario: Routes are code-split
    Given I analyze the production build
    When I inspect the JavaScript bundles
    Then each route should have its own bundle
    And shared code should be in a common chunk
    And route bundles should be under 100KB each

  Scenario: Heavy components are lazy loaded
    Given I have charts, modals, and heavy UI components
    When I inspect the bundle
    Then these components should be dynamically imported
    And they should only load when needed
    And loading states should be shown

  Scenario: Third-party libraries are code-split
    Given I use libraries like charts, PDF viewers, etc.
    When I analyze the bundle
    Then they should be in separate chunks
    And they should only load on pages that use them
    And common dependencies should be shared

  # ============================================================================
  # 8. Resource Loading Optimization
  # ============================================================================

  Scenario: Critical resources are preloaded
    Given I inspect the HTML <head>
    Then fonts should be preloaded
    And critical images should be preloaded
    And DNS prefetch should be set for external domains

  Scenario: Non-critical resources are deferred
    Given I inspect the HTML
    Then non-critical scripts should have defer attribute
    And third-party scripts should be async
    And analytics should load after page interaction

  Scenario: Resources are cached properly
    Given I load a page
    When I reload the page
    Then static assets should be served from cache
    And cache headers should be set correctly
    And versioned assets should have long cache times

  # ============================================================================
  # 9. Time to First Byte (TTFB)
  # ============================================================================

  Scenario: TTFB is under 600ms
    Given I request the dashboard page
    When I measure the time to first byte
    Then TTFB should be under 600ms
    And server response should be fast
    And CDN should be utilized

  Scenario: Static pages have instant TTFB from CDN
    Given I request a static page
    When I measure TTFB
    Then it should be under 200ms (CDN cache hit)
    And headers should indicate CDN serving

  # ============================================================================
  # 10. First Contentful Paint (FCP)
  # ============================================================================

  Scenario: FCP is under 1.8 seconds
    Given I load any page
    When I measure First Contentful Paint
    Then FCP should be under 1.8 seconds
    And critical CSS should be inlined
    And render-blocking resources should be minimal

  # ============================================================================
  # 11. Speed Index
  # ============================================================================

  Scenario: Speed Index is under 3.4 seconds on mobile
    Given I run a Lighthouse mobile audit
    When I check the Speed Index metric
    Then it should be under 3.4 seconds
    And visual progress should be smooth
    And progressive rendering should be enabled

  # ============================================================================
  # 12. Total Blocking Time (TBT)
  # ============================================================================

  Scenario: TBT is under 200ms
    Given I measure Total Blocking Time
    When the page loads
    Then TBT should be under 200ms
    And long tasks should be broken up
    And JavaScript should not block the main thread

  # ============================================================================
  # 13. Performance Monitoring
  # ============================================================================

  Scenario: Performance metrics are collected in production
    Given I am using the app in production
    When I navigate through pages
    Then Core Web Vitals should be measured
    And metrics should be sent to analytics
    And performance budgets should be enforced

  Scenario: Performance regressions are detected
    Given I deploy a new version
    When I compare metrics with the previous version
    Then no metric should regress by more than 10%
    And alerts should fire if thresholds are exceeded
    And performance tests should run in CI/CD

  # ============================================================================
  # 14. Specific Page Performance
  # ============================================================================

  Scenario: Dashboard loads in under 2 seconds
    Given I am on a fast connection
    When I navigate to the dashboard
    Then the page should be interactive in under 2 seconds
    And all widgets should render progressively
    And skeleton loaders should be shown during loading

  Scenario: Job listing page loads 50 jobs without lag
    Given I am viewing the jobs page
    When 50 job cards are rendered
    Then scroll should remain smooth (60fps)
    And virtualization should be used for long lists
    And pagination should be implemented

  Scenario: Profile settings page loads instantly
    Given I navigate to profile settings
    When the page loads
    Then it should be interactive in under 1 second
    And form fields should not cause layout shifts
    And validation should not block UI

  # ============================================================================
  # 15. Network Performance
  # ============================================================================

  Scenario: HTTP/2 is enabled
    Given I inspect the network connection
    Then the server should support HTTP/2
    And multiplexing should be used
    And header compression should be enabled

  Scenario: Compression is enabled for text assets
    Given I download JavaScript, CSS, and HTML
    Then all text assets should be gzipped or brotli compressed
    And compression ratio should be >= 70%
    And Content-Encoding header should be present

  Scenario: API requests are optimized
    Given I load a data-heavy page
    When API requests are made
    Then responses should be under 500ms
    And data should be paginated
    And unnecessary fields should not be fetched

  # ============================================================================
  # 16. Runtime Performance
  # ============================================================================

  Scenario: Scrolling is smooth at 60fps
    Given I am on a page with many elements
    When I scroll
    Then the frame rate should stay above 60fps
    And scroll jank should be minimal
    And heavy computations should be debounced

  Scenario: Animations run at 60fps
    Given I interact with animated UI elements
    When animations play
    Then they should maintain 60fps
    And GPU acceleration should be used
    And will-change should be applied appropriately

  # ============================================================================
  # 17. Memory Performance
  # ============================================================================

  Scenario: No memory leaks on navigation
    Given I navigate between pages multiple times
    When I measure memory usage
    Then memory should not continuously increase
    And event listeners should be cleaned up
    And React components should unmount properly

  # ============================================================================
  # 18. Acceptance Criteria Validation
  # ============================================================================

  @acceptance
  Scenario: All Core Web Vitals are green
    Given I run a complete performance audit
    Then LCP should be < 2.5s (green)
    And FID should be < 100ms (green)
    And CLS should be < 0.1 (green)
    And all three vitals should pass

  @acceptance
  Scenario: Lighthouse score exceeds 90
    Given I run Lighthouse on desktop
    Then Performance score should be >= 90
    And no critical issues should be present
    And the site should be production-ready

  @acceptance
  Scenario: No performance regressions
    Given I compare with baseline metrics
    Then no metric should regress
    And improvements should be documented
    And performance budgets should be met

  @acceptance
  Scenario: Performance is monitored
    Given the app is in production
    Then Real User Monitoring (RUM) should be active
    And Core Web Vitals should be tracked
    And alerts should be configured for regressions
