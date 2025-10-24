Feature: Job Matching with Vector Search
  As a user
  I want to find jobs that match my skills and experience
  So that I can apply to roles with the highest success probability

  Background:
    Given the user is authenticated
    And Pinecone vector database is initialized
    And OpenAI embeddings are configured

  # Skill Embeddings and Vectorization

  Scenario: Extract and vectorize skills from resume
    Given the user has a parsed resume with skills:
      | skill               | years |
      | Python              | 5     |
      | FastAPI             | 2     |
      | Machine Learning    | 3     |
      | Docker              | 4     |
    When the system generates skill embeddings
    Then each skill should have a 1536-dimension vector
    And embeddings should be stored in Pinecone
    And the user profile should be indexed

  Scenario: Generate embeddings for job description
    Given a job posting for "Senior Backend Engineer"
    And the job requires:
      | skill               | level      |
      | Python              | Expert     |
      | FastAPI             | Proficient |
      | PostgreSQL          | Proficient |
      | AWS                 | Intermediate |
    When the system processes the job description
    Then job skills should be extracted
    And embeddings should be generated for each skill
    And the job should be indexed in Pinecone

  Scenario: Update embeddings when resume is modified
    Given the user has an existing resume with embeddings
    When the user adds new skills:
      | skill               |
      | Kubernetes          |
      | GraphQL             |
    Then new embeddings should be generated
    And Pinecone index should be updated
    And old vectors should be replaced

  # Job Matching and Fit Index

  Scenario: Calculate Fit Index for perfect match
    Given the user has skills:
      | skill               | years |
      | Python              | 5     |
      | FastAPI             | 3     |
      | PostgreSQL          | 4     |
    And a job requires:
      | skill               | level      |
      | Python              | Expert     |
      | FastAPI             | Proficient |
      | PostgreSQL          | Proficient |
    When the job matching engine runs
    Then the Fit Index should be 90-100
    And the match should be labeled "Excellent Match"
    And all required skills should be highlighted

  Scenario: Calculate Fit Index for partial match
    Given the user has skills:
      | skill               | years |
      | Python              | 3     |
      | Django              | 2     |
    And a job requires:
      | skill               | level      |
      | Python              | Expert     |
      | FastAPI             | Proficient |
      | PostgreSQL          | Proficient |
      | AWS                 | Proficient |
    When the job matching engine runs
    Then the Fit Index should be 40-60
    And the match should be labeled "Partial Match"
    And missing skills should be identified:
      | missing_skill |
      | FastAPI       |
      | PostgreSQL    |
      | AWS           |

  Scenario: Calculate Fit Index for poor match
    Given the user has skills:
      | skill               | years |
      | Java                | 5     |
      | Spring Boot         | 3     |
    And a job requires:
      | skill               | level      |
      | Python              | Expert     |
      | FastAPI             | Proficient |
      | Machine Learning    | Expert     |
    When the job matching engine runs
    Then the Fit Index should be 0-30
    And the match should be labeled "Low Match"
    And the job should not appear in top matches

  Scenario: Generate match rationale
    Given a job with Fit Index of 75
    When the user views match details
    Then the rationale should explain:
      | aspect              |
      | Matching skills     |
      | Skill gaps          |
      | Experience level    |
      | Related experience  |
    And recommendations should be provided

  # Semantic Search

  Scenario: Find jobs with semantic similarity
    Given the user has experience with "React and Redux"
    When the system searches for frontend jobs
    Then jobs requiring "React and State Management" should match
    And jobs requiring "Vue.js" should have lower similarity
    And Angular jobs should have moderate similarity
    And backend-only jobs should not match

  Scenario: Match transferable skills
    Given the user has "Machine Learning Engineer" experience
    When searching for "Data Scientist" roles
    Then semantic similarity should be high (>80)
    And shared skills should be identified:
      | shared_skill          |
      | Python                |
      | Statistical Analysis  |
      | Model Training        |

  Scenario: Handle skill synonyms
    Given a job requires "Node.js"
    And the user has "JavaScript backend development"
    When the matching engine runs
    Then the skills should be recognized as related
    And similarity score should reflect the relationship

  # Filtering and Ranking

  Scenario: Filter by minimum Fit Index
    Given the user sets minimum Fit Index to 70
    When the system retrieves job matches
    Then only jobs with Fit Index >= 70 should be returned
    And results should be sorted by Fit Index descending

  Scenario: Filter by location preference
    Given the user prefers "Remote" or "San Francisco"
    And there are jobs in:
      | location       | fit_index |
      | Remote         | 85        |
      | San Francisco  | 90        |
      | New York       | 92        |
    When the filtered search runs
    Then only Remote and San Francisco jobs should appear
    And New York job should be excluded despite high fit

  Scenario: Filter by salary range
    Given the user expects $120k-$160k
    And there are jobs offering:
      | salary  | fit_index |
      | 100k    | 95        |
      | 140k    | 85        |
      | 180k    | 90        |
    When salary filter is applied
    Then only the $140k job should be returned
    And jobs outside range should be excluded

  Scenario: Filter by visa sponsorship
    Given the user requires visa sponsorship
    When searching for jobs
    Then only jobs offering sponsorship should appear
    And non-sponsoring jobs should be filtered out
    And sponsorship status should be clearly indicated

  Scenario: Combine multiple filters
    Given the user filters by:
      | filter              | value           |
      | min_fit_index       | 70              |
      | location            | Remote          |
      | min_salary          | 120000          |
      | visa_sponsorship    | true            |
    When the search executes
    Then all filters should be applied
    And results should meet all criteria
    And count should reflect filtered results

  # Performance and Optimization

  Scenario: Cache embedding results
    Given a resume has been vectorized
    When the same resume is processed again
    Then embeddings should be retrieved from cache
    And OpenAI API should not be called
    And response time should be <100ms

  Scenario: Batch process job embeddings
    Given 100 new jobs are ingested
    When the embedding pipeline runs
    Then jobs should be processed in batches of 20
    And rate limits should be respected
    And all jobs should be indexed within 2 minutes

  Scenario: Handle API rate limits gracefully
    Given OpenAI rate limit is reached
    When embedding generation is attempted
    Then the system should retry with exponential backoff
    And partial results should be cached
    And users should see progress indicator

  # Top Matches and Recommendations

  Scenario: Get top 10 job matches
    Given the user has a complete profile
    When requesting top matches
    Then 10 jobs with highest Fit Index should be returned
    And each should include:
      | field              |
      | job_title          |
      | company            |
      | fit_index          |
      | match_rationale    |
      | matching_skills    |
      | skill_gaps         |

  Scenario: Weekly top matches email
    Given the user subscribed to job alerts
    And it's Monday 9 AM
    When the weekly job email is sent
    Then the email should contain top 5 matches
    And Fit Index should be >= 70
    And new jobs from the past week should be prioritized

  Scenario: Personalize job recommendations
    Given the user previously viewed:
      | job_title              |
      | Senior Python Engineer |
      | ML Engineer            |
    When generating recommendations
    Then similar roles should be prioritized
    And user preferences should influence ranking

  # Experience and Seniority Matching

  Scenario: Match experience level
    Given the user has 5 years of experience
    And a job requires "5-7 years experience"
    When calculating Fit Index
    Then experience match should add 10 points
    And seniority should be marked as "Appropriate"

  Scenario: Penalize under-qualified candidates
    Given the user has 2 years of experience
    And a job requires "8+ years experience"
    When calculating Fit Index
    Then experience mismatch should reduce score by 20 points
    And a warning should be shown

  Scenario: Identify stretch opportunities
    Given the user has 4 years of experience
    And a job requires "5-7 years experience"
    When calculating Fit Index
    Then the job should be marked as "Stretch Opportunity"
    And skill match should be weighted more heavily

  # Company and Culture Matching

  Scenario: Match company size preference
    Given the user prefers startups (1-50 employees)
    When searching for jobs
    Then startup jobs should be boosted in ranking
    And enterprise jobs should be deprioritized

  Scenario: Match industry preference
    Given the user prefers "Healthcare" or "Fintech"
    When ranking job matches
    Then jobs in preferred industries should rank higher
    And other industries should have lower boost

  # Real-time Updates

  Scenario: Notify user of high-fit new job
    Given the user has job alerts enabled
    When a new job with Fit Index > 85 is posted
    Then the user should receive immediate notification
    And the notification should include job details
    And a direct apply link should be provided

  Scenario: Update match scores when profile changes
    Given the user has existing job matches
    When the user updates their resume
    Then all match scores should be recalculated
    And new top matches should be identified
    And the user should be notified of changes

  # Analytics and Insights

  Scenario: Show skill gap analysis
    Given the user has viewed 20 job matches
    When the user requests skill insights
    Then most frequently required skills should be shown
    And missing skills should be highlighted
    And learning recommendations should be provided

  Scenario: Track match quality over time
    Given the user has been using the platform for 30 days
    When viewing analytics
    Then average Fit Index trend should be shown
    And skill improvement impact should be displayed

  # Edge Cases

  Scenario: Handle resume with no skills
    Given the user has a resume without listed skills
    When attempting to generate matches
    Then the system should prompt for skills
    And manual skill entry should be suggested
    And basic keyword matching should be used as fallback

  Scenario: Handle job with vague requirements
    Given a job description says "looking for talented engineer"
    When extracting skills
    Then the system should use NLP to infer requirements
    And common skills for the title should be assumed
    And confidence score should be indicated

  Scenario: Handle duplicate job postings
    Given the same job is posted on multiple sources
    When indexing jobs
    Then duplicates should be detected
    And only one version should be shown to user
    And all source links should be preserved
