Feature: Job Feed API Integration
  As the HireFlux platform
  I want to integrate with job board APIs
  So that users can access real job opportunities

  Background:
    Given the system is configured with API credentials
    And Greenhouse API is available
    And Lever API is available
    And rate limiting is configured

  # Job Source Configuration

  Scenario: Configure Greenhouse job source
    Given admin wants to add Greenhouse as a job source
    When the admin configures Greenhouse with:
      | field      | value                     |
      | api_key    | greenhouse_api_key_123    |
      | company_id | acme-corp                 |
      | active     | true                      |
    Then the job source should be saved
    And the configuration should be validated
    And the source should be marked as active

  Scenario: Configure Lever job source
    Given admin wants to add Lever as a job source
    When the admin configures Lever with API key
    Then the job source should be saved
    And Lever API should be tested for connectivity

  Scenario: Disable inactive job source
    Given a job source is configured but not active
    When the daily job sync runs
    Then jobs from inactive source should be skipped
    And no API calls should be made to inactive source

  # Job Fetching from Greenhouse

  Scenario: Fetch active jobs from Greenhouse
    Given Greenhouse has 50 open positions
    When the job sync service runs
    Then all 50 jobs should be fetched
    And each job should contain:
      | field               |
      | job_id              |
      | title               |
      | location            |
      | department          |
      | description         |
      | application_url     |
    And jobs should be stored in database

  Scenario: Handle Greenhouse pagination
    Given Greenhouse API returns paginated results
    And there are 250 jobs total
    And page size is 100
    When the sync fetches all pages
    Then 3 API requests should be made
    And all 250 jobs should be retrieved

  Scenario: Filter Greenhouse jobs by department
    Given the system is configured to fetch only "Engineering" jobs
    When syncing from Greenhouse
    Then only Engineering department jobs should be fetched
    And other departments should be ignored

  # Job Fetching from Lever

  Scenario: Fetch active jobs from Lever
    Given Lever has 30 open positions
    When the job sync service runs
    Then all 30 jobs should be fetched
    And Lever-specific fields should be mapped correctly

  Scenario: Handle Lever API rate limits
    Given Lever rate limit is 10 requests per minute
    When fetching 100 jobs requiring 20 requests
    Then requests should be throttled to respect limit
    And the sync should complete within 2 minutes
    And no rate limit errors should occur

  # Job Data Normalization

  Scenario: Normalize Greenhouse job to standard format
    Given a Greenhouse job with custom structure
    When the job is normalized
    Then standard fields should be mapped:
      | greenhouse_field    | standard_field      |
      | id                  | external_id         |
      | name                | title               |
      | offices             | location            |
      | absolute_url        | external_url        |
      | content             | description         |
    And metadata should be preserved

  Scenario: Extract skills from job description
    Given a job description containing:
      """
      We're looking for a Senior Engineer with 5+ years of Python,
      FastAPI, PostgreSQL, and AWS experience. Docker knowledge is a plus.
      """
    When skills are extracted
    Then the following skills should be identified:
      | skill       | required |
      | Python      | true     |
      | FastAPI     | true     |
      | PostgreSQL  | true     |
      | AWS         | true     |
      | Docker      | false    |

  Scenario: Parse experience requirement
    Given job descriptions with experience requirements:
      | description                | expected_min | expected_max |
      | 3-5 years of experience    | 3            | 5            |
      | 5+ years experience        | 5            | 100          |
      | Entry level position       | 0            | 2            |
      | Senior Engineer (8+ years) | 8            | 100          |
    When parsing experience requirements
    Then correct year ranges should be extracted

  Scenario: Detect remote/hybrid/onsite from description
    Given job descriptions:
      | description                        | expected_type |
      | Fully remote position              | remote        |
      | Hybrid 3 days in office            | hybrid        |
      | On-site in San Francisco           | onsite        |
      | Work from anywhere                 | remote        |
      | Office-based role                  | onsite        |
    When detecting location type
    Then correct location types should be identified

  Scenario: Parse salary range
    Given job descriptions with salary info:
      | description                        | min_salary | max_salary |
      | $120k-$160k                        | 120000     | 160000     |
      | Salary range: $100,000 - $150,000  | 100000     | 150000     |
      | Up to $180k                        | 0          | 180000     |
    When parsing salary information
    Then correct ranges should be extracted

  # Duplicate Detection

  Scenario: Detect duplicate job from same source
    Given a job was fetched yesterday with id "greenhouse_123"
    When the same job is fetched today
    Then the system should detect it as duplicate
    And the existing job should be updated
    And no new job record should be created

  Scenario: Detect duplicate job across sources
    Given a "Senior Python Engineer at Acme Corp" job from Greenhouse
    When the same job appears on Lever with:
      | field      | similarity |
      | title      | 95%        |
      | company    | 100%       |
      | location   | 100%       |
      | posted_date| same day   |
    Then the system should detect it as likely duplicate
    And both sources should be linked
    And only one job should be shown to users

  Scenario: Update changed job details
    Given an existing job with salary "$100k-$120k"
    When the updated job has salary "$110k-$130k"
    Then the job should be updated with new salary
    And update timestamp should be recorded
    And users should be notified of changes

  # Job Enrichment

  Scenario: Enrich job with company data
    Given a job posting from "Stripe"
    When enriching job data
    Then company details should be added:
      | field          | value                    |
      | company_size   | 1001-5000                |
      | industry       | Fintech                  |
      | founded_year   | 2010                     |
      | funding_stage  | Public                   |

  Scenario: Generate job embeddings
    Given a newly fetched job
    When the job is processed
    Then embeddings should be generated for:
      | text_field              |
      | title + description     |
      | required_skills         |
      | preferred_skills        |
    And vectors should be stored in Pinecone

  Scenario: Calculate job freshness score
    Given jobs with different posting dates:
      | posted_date | freshness_score |
      | today       | 100             |
      | 3 days ago  | 90              |
      | 7 days ago  | 75              |
      | 14 days ago | 50              |
      | 30 days ago | 25              |
    When calculating freshness
    Then correct scores should be assigned

  # Error Handling

  Scenario: Handle Greenhouse API timeout
    Given Greenhouse API is slow to respond
    When the request times out after 30 seconds
    Then the system should retry with exponential backoff
    And maximum 3 retry attempts should be made
    And failed jobs should be logged

  Scenario: Handle invalid API credentials
    Given API credentials are invalid
    When attempting to fetch jobs
    Then authentication error should be caught
    And admin should be notified
    And job source should be marked as "error"
    And sync should continue with other sources

  Scenario: Handle malformed job data
    Given a job response missing required fields
    When processing the job
    Then validation error should be logged
    And the job should be skipped
    And error details should be saved
    And sync should continue with next job

  Scenario: Handle API downtime
    Given Greenhouse API returns 503 Service Unavailable
    When attempting sync
    Then the system should wait and retry
    And fallback to cached data if available
    And users should not see errors

  # Rate Limiting and Performance

  Scenario: Respect API rate limits
    Given Greenhouse allows 100 requests per minute
    When fetching 500 jobs requiring 150 requests
    Then requests should be distributed over 2 minutes
    And rate limit should not be exceeded
    And all jobs should be fetched

  Scenario: Batch process job enrichment
    Given 200 new jobs are fetched
    When enriching jobs
    Then jobs should be processed in batches of 50
    And embeddings should be generated in parallel
    And total processing time should be < 5 minutes

  Scenario: Cache API responses
    Given job data was fetched 10 minutes ago
    When requesting the same data
    Then cached response should be used
    And no API call should be made
    And cache TTL should be 15 minutes

  # Scheduled Sync

  Scenario: Daily job sync at midnight
    Given it's midnight UTC
    When the scheduled job sync runs
    Then all active job sources should be synced
    And new jobs should be indexed
    And users with job alerts should be notified

  Scenario: Incremental sync
    Given last sync was 6 hours ago
    When running incremental sync
    Then only jobs updated since last sync should be fetched
    And API calls should be minimized
    And sync should complete faster

  Scenario: Mark stale jobs as inactive
    Given a job hasn't been updated in 60 days
    When the job cleanup task runs
    Then the job should be marked as inactive
    And it should not appear in search results
    And the record should be archived

  # Job Application Tracking

  Scenario: Track job source for applications
    Given a user applies to a job from Greenhouse
    When the application is created
    Then the source should be recorded as "greenhouse"
    And the external job ID should be saved
    And application can be synced back to Greenhouse

  Scenario: Sync application status back to Greenhouse
    Given user applied via HireFlux to Greenhouse job
    When Greenhouse updates application status to "Interview"
    Then HireFlux should sync the status update
    And user should be notified

  # Analytics and Monitoring

  Scenario: Track job source performance
    Given jobs from multiple sources
    When generating source analytics
    Then metrics should include:
      | metric                    |
      | total_jobs_fetched        |
      | active_jobs               |
      | avg_application_rate      |
      | avg_job_quality_score     |
      | api_success_rate          |
      | avg_response_time         |

  Scenario: Monitor API health
    Given job sources are configured
    When health check runs
    Then each API should be tested
    And response time should be measured
    And error rates should be calculated
    And alerts should fire if error rate > 5%

  Scenario: Track job ingestion metrics
    Given daily job sync completes
    Then metrics should be logged:
      | metric              | description                  |
      | jobs_fetched        | Total jobs fetched           |
      | jobs_created        | New jobs created             |
      | jobs_updated        | Existing jobs updated        |
      | jobs_skipped        | Duplicates or invalid        |
      | processing_time     | Total sync duration          |
      | errors              | Number of errors encountered |

  # Data Quality

  Scenario: Validate job data quality
    Given a fetched job
    Then the following should be validated:
      | validation                  |
      | title is not empty          |
      | description is > 100 chars  |
      | location is valid           |
      | posted_date is reasonable   |
      | salary range is logical     |
      | URL is valid                |

  Scenario: Flag suspicious job postings
    Given a job with suspicious characteristics:
      | characteristic                    |
      | Salary way above market rate      |
      | Too many exclamation marks        |
      | Requests personal financial info  |
    Then the job should be flagged for review
    And it should not be shown to users
    And admin should be notified

  # Compliance

  Scenario: Respect job board ToS
    Given Greenhouse ToS limits scraping
    When fetching jobs
    Then only official API should be used
    And ToS compliance should be logged
    And scraping should never be attempted

  Scenario: Handle job expiration
    Given a job posting expires
    When the job is no longer available in API
    Then the job should be marked as inactive
    And users should not see it in search
    And historical data should be preserved

  # Manual Job Addition

  Scenario: Admin adds job manually
    Given admin has a job posting URL
    When admin submits the URL
    Then the job should be fetched and parsed
    And it should be marked as "manual" source
    And it should appear in job search

  Scenario: User submits job referral
    Given a user finds a relevant job
    When the user submits job URL
    Then the job should be queued for review
    And admin should be notified
    And user should earn referral credit
