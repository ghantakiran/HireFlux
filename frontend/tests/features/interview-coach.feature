# Feature: Interview Coach Interface (Issue #108)
#
# As a job seeker
# I want to practice interviews with AI-powered coaching
# So that I can improve my interview skills and performance

Feature: Interview Coach Interface

  Background:
    Given I am logged in as a job seeker
    And I have a complete profile with resume

  # Core Session Setup
  Scenario: Display interview coach page
    Given I am on the interview coach page
    Then I should see the page title "Interview Buddy" or "Interview Coach"
    And I should see interview settings panel
    And I should see session stats
    And I should see the main practice interface

  Scenario: Select interview type
    Given I am on the interview coach page
    When I click on interview type dropdown
    Then I should see interview type options:
      | Type             |
      | Technical        |
      | Behavioral       |
      | System Design    |
      | Product          |
      | Leadership       |
    When I select "Technical" interview type
    Then the interview type should be set to "Technical"

  Scenario: Select role level
    Given I am on the interview coach page
    When I click on role level dropdown
    Then I should see role level options:
      | Level                  |
      | Junior (0-2 years)     |
      | Mid-Level (3-5 years)  |
      | Senior (6+ years)      |
      | Staff/Principal        |
    When I select "Senior (6+ years)"
    Then the role level should be set to "Senior"

  Scenario: Select company type
    Given I am on the interview coach page
    When I click on company type dropdown
    Then I should see company type options:
      | Type         |
      | FAANG        |
      | Tech Startup |
      | Enterprise   |
      | Fintech      |
      | Healthcare   |
    When I select "FAANG"
    Then the company type should be set to "FAANG"

  Scenario: Configure focus areas
    Given I am on the interview coach page
    When I click on focus areas dropdown
    Then I should see focus area options
    When I select "Python & Backend"
    Then the focus area should be set to "Python & Backend"

  # Session Start
  Scenario: Start new interview session
    Given I have configured interview settings
    When I click "Start Interview" or "Start Practice"
    Then I should see a loading indicator
    And a new interview session should be created
    And I should see the first question within 3 seconds

  Scenario: Start session with default settings
    Given I am on the interview coach page
    When I click "Start Interview" without configuring settings
    Then the session should start with default settings
    And I should see the first question

  # Question Display
  Scenario: View interview question
    Given I have started an interview session
    Then I should see the current question number (e.g., "Question 1 of 5")
    And I should see the question text
    And I should see a timer or time limit
    And I should see an answer input field

  Scenario: Question is relevant to settings
    Given I selected "Technical" interview type
    And I selected "Senior" level
    And I selected "Python & Backend" focus
    When I start an interview session
    Then the questions should be technical questions
    And the questions should match senior level difficulty
    And the questions should relate to Python or Backend

  Scenario: View multiple questions in session
    Given I have started an interview session
    Then I should see "Question 1 of X" where X is total questions
    When I answer the question and click "Next Question"
    Then I should see "Question 2 of X"
    And the question number should increment

  # Text Answer Recording
  Scenario: Type answer to question
    Given I am viewing a question
    When I type text in the answer field
    Then my typed text should appear in the field
    And the text should be saved automatically

  Scenario: Submit text answer
    Given I have typed an answer
    When I click "Submit Answer"
    Then the answer should be submitted
    And I should see AI feedback within 5 seconds
    And I should see a sample answer

  Scenario: Reset answer
    Given I have typed an answer
    When I click "Reset Answer" or "Clear"
    Then the answer field should be cleared
    And I should see a confirmation if answer was substantial

  # Voice Answer Recording
  Scenario: Start voice recording
    Given I am viewing a question
    When I click "Voice Input" or "Start Recording"
    Then I should see a recording indicator
    And I should see a "Recording..." status
    And I should see recording duration timer

  Scenario: Stop voice recording
    Given I am recording a voice answer
    When I click "Stop Recording"
    Then the recording should stop
    And the audio should be transcribed to text
    And the transcribed text should appear in the answer field

  Scenario: Voice recording permission denied
    Given browser microphone permission is denied
    When I click "Voice Input"
    Then I should see an error message
    And I should see instructions to enable microphone
    And the text input should remain available

  Scenario: Toggle between voice and text input
    Given I am on a question
    When I switch from text to voice input
    Then the voice recording should activate
    When I switch back to text input
    Then the voice recording should stop
    And any transcribed text should be preserved

  # AI Feedback (STAR Framework)
  Scenario: Receive AI feedback for answer
    Given I have submitted an answer
    Then I should see AI-generated feedback
    And the feedback should include STAR framework analysis
    And I should see feedback score or rating

  Scenario: STAR framework analysis
    Given I submitted an answer
    Then I should see feedback on:
      | Component       | Description                    |
      | Situation       | Context setting                |
      | Task            | Responsibility                 |
      | Action          | What you did                   |
      | Result          | Outcome and impact             |

  Scenario: Feedback includes strengths and improvements
    Given I have received AI feedback
    Then I should see "Strengths" section with positive points
    And I should see "Areas for Improvement" section
    And each point should be specific and actionable

  Scenario: Feedback quality score
    Given I submitted an answer
    Then I should see a numerical score (e.g., "8.5/10")
    And I should see a breakdown by criteria:
      | Criterion           |
      | Clarity             |
      | Completeness        |
      | Relevance           |
      | STAR alignment      |
      | Communication style |

  Scenario: View sample answer
    Given I have submitted an answer
    Then I should see a "Sample Answer" or "Model Answer"
    And the sample answer should follow STAR framework
    And the sample answer should be high quality

  # Session Progress
  Scenario: Track progress through session
    Given I am in an interview session with 5 questions
    When I complete question 1
    Then I should see "Question 2 of 5"
    When I complete question 2
    Then I should see "Question 3 of 5"
    And I should see a progress indicator (e.g., progress bar)

  Scenario: Navigate between questions
    Given I am on question 3 of 5
    When I click "Previous Question"
    Then I should see question 2
    When I click "Next Question"
    Then I should see question 3
    And my previous answers should be preserved

  Scenario: Skip question
    Given I am viewing a question
    When I click "Skip Question"
    Then I should move to the next question
    And the skipped question should be marked as unanswered

  # Session Completion
  Scenario: Complete interview session
    Given I am on the last question of the session
    When I submit my final answer
    Then I should see "Session Complete" message
    And I should see overall session results
    And I should see a summary of all questions and answers

  Scenario: View session results
    Given I have completed a session
    Then I should see:
      | Metric                  |
      | Overall session score   |
      | Questions answered      |
      | Average response time   |
      | Strengths summary       |
      | Areas to improve        |

  Scenario: Session results include all questions
    Given I completed a 5-question session
    Then I should see all 5 questions in the results
    And each question should show my answer
    And each question should show AI feedback
    And each question should show the sample answer

  # Performance Metrics
  Scenario: View session stats
    Given I have completed multiple sessions
    When I view the session stats panel
    Then I should see "Sessions Completed" count
    And I should see "Average Score"
    And I should see "Questions Answered" total
    And I should see "Improvement Rate" percentage

  Scenario: Track improvement over time
    Given I have completed 10+ sessions
    Then I should see a trend chart or graph
    And the chart should show score improvement over time
    And I should see my best and worst performance

  Scenario: Performance metrics by interview type
    Given I have completed sessions in multiple types
    Then I should be able to filter metrics by interview type
    And I should see average scores per type
    And I should see my strongest and weakest types

  # Session History
  Scenario: View recent sessions list
    Given I am on the interview coach page
    Then I should see "Recent Sessions" or "Session History"
    And I should see at least 3 recent sessions
    And each session should show:
      | Field             |
      | Interview type    |
      | Company/role      |
      | Score             |
      | Date/time         |

  Scenario: Review past session
    Given I see a past session in the list
    When I click "Review" on that session
    Then I should see the full session details
    And I should see all questions from that session
    And I should see all my answers
    And I should see all AI feedback

  Scenario: Filter session history
    Given I have multiple past sessions
    When I filter by "Technical" interview type
    Then I should see only technical interview sessions
    When I filter by "Last 7 days"
    Then I should see only sessions from the past week

  Scenario: Search session history
    Given I have many past sessions
    When I search for "Google"
    Then I should see sessions related to Google
    When I search for "System Design"
    Then I should see system design sessions

  # Timer & Time Management
  Scenario: View question timer
    Given I am viewing a question
    Then I should see a countdown timer
    And the timer should show remaining time (e.g., "2:00")
    And the timer should update every second

  Scenario: Timer expires
    Given I am answering a question with 2 minutes limit
    When the timer reaches 0:00
    Then I should see a "Time's up" notification
    And I should be prompted to submit or continue
    And the timer should be highlighted in red

  Scenario: Extend time limit
    Given the timer has expired
    When I click "Add More Time" or "Extend"
    Then I should get additional time (e.g., +1 minute)
    And the timer should reset with new time

  # Question Bank Management
  Scenario: View question bank
    Given I am on the interview coach page
    When I click "Question Bank" or "Browse Questions"
    Then I should see a list of available questions
    And I should be able to filter by interview type
    And I should be able to filter by difficulty

  Scenario: Practice specific question
    Given I am viewing the question bank
    When I select a specific question
    And I click "Practice This Question"
    Then a new session should start with that question
    And I should be able to answer it
    And I should receive AI feedback

  Scenario: Mark question as favorite
    Given I am viewing a question
    When I click "Add to Favorites" or star icon
    Then the question should be added to my favorites
    And I should see it in "Favorite Questions" list

  Scenario: Question difficulty levels
    Given I am viewing questions
    Then each question should show difficulty:
      | Level        |
      | Easy         |
      | Medium       |
      | Hard         |
      | Expert       |

  # Mock Interview Mode
  Scenario: Start mock interview
    Given I am on the interview coach page
    When I click "Start Mock Interview"
    Then I should see a full interview simulation
    And I should see multiple questions (5-10)
    And I should see a realistic timer
    And I should have limited or no ability to skip

  Scenario: Mock interview is timed
    Given I am in a mock interview
    Then I should see an overall session timer
    And each question should have individual time limits
    And I should see time remaining for the full interview

  Scenario: Mock interview results
    Given I completed a mock interview
    Then I should see comprehensive results
    And I should see how I performed vs. typical candidates
    And I should see readiness score (e.g., "80% ready")

  # Real-time Hints
  Scenario: Request hint during question
    Given I am struggling with a question
    When I click "Show Hint" or "Need Help"
    Then I should see a helpful hint
    And the hint should guide without giving away the answer
    And using a hint should slightly lower my score

  Scenario: View example structure
    Given I am on a behavioral question
    When I click "Show STAR Structure"
    Then I should see a template for STAR framework
    And I should see example bullets for each component

  # Answer Comparison
  Scenario: Compare answer to sample
    Given I have submitted an answer
    When I click "Compare to Sample"
    Then I should see my answer on the left
    And I should see the sample answer on the right
    And I should see highlighted differences
    And I should see what was missing from my answer

  # Pause and Resume
  Scenario: Pause interview session
    Given I am in an active session
    When I click "Pause Session"
    Then the session should pause
    And the timer should stop
    And I should see a "Paused" indicator

  Scenario: Resume paused session
    Given I have a paused session
    When I click "Resume Session"
    Then the session should resume
    And the timer should restart
    And I should see the same question

  Scenario: Auto-save progress
    Given I am in a session
    When I close the browser or navigate away
    Then my progress should be auto-saved
    When I return to the interview coach page
    Then I should see an option to "Resume Previous Session"
    And my answers should be preserved

  # Practice Modes
  Scenario: Select practice mode
    Given I am configuring a session
    When I select "Timed Practice" mode
    Then each question should have strict time limits
    When I select "Untimed Practice" mode
    Then I should have unlimited time per question

  Scenario: Select session length
    Given I am starting a new session
    When I select "Quick Practice (3 questions)"
    Then the session should have 3 questions
    When I select "Full Interview (10 questions)"
    Then the session should have 10 questions

  # Feedback Customization
  Scenario: Request detailed feedback
    Given I have submitted an answer
    When I click "Request Detailed Feedback"
    Then I should see more comprehensive analysis
    And I should see line-by-line critique
    And I should see specific improvement suggestions

  Scenario: Feedback tone options
    Given I am configuring settings
    When I select "Encouraging" feedback tone
    Then AI feedback should be more positive
    When I select "Critical" feedback tone
    Then AI feedback should be more direct and critical

  # Accessibility
  Scenario: Keyboard navigation
    Given I am on the interview coach page
    Then I should be able to navigate with Tab key
    And I should be able to submit with Enter key
    And I should be able to access all controls via keyboard

  Scenario: Screen reader support
    Given I am using a screen reader
    When I navigate the interview coach page
    Then all elements should be announced properly
    And question text should be readable
    And feedback should be readable

  Scenario: Voice commands
    Given voice input is enabled
    When I say "Next question"
    Then I should move to the next question
    When I say "Submit answer"
    Then my answer should be submitted

  # Mobile Responsiveness
  Scenario: View on mobile device
    Given I am on a mobile device
    When I open the interview coach page
    Then the layout should be mobile-optimized
    And I should see a single-column layout
    And buttons should be easy to tap

  Scenario: Voice recording on mobile
    Given I am on a mobile device
    When I start voice recording
    Then the mobile microphone should activate
    And I should see clear recording indicators

  # Error Handling
  Scenario: Handle API errors gracefully
    Given the AI service is unavailable
    When I submit an answer
    Then I should see an error message
    And I should see a "Retry" button
    And my answer should be preserved

  Scenario: Handle network interruption
    Given I lose internet connection during a session
    Then I should see an offline indicator
    And my progress should be saved locally
    When connection is restored
    Then I should be able to sync my progress

  Scenario: Microphone access error
    Given microphone access fails
    When I try to use voice input
    Then I should see a helpful error message
    And I should see troubleshooting steps
    And text input should remain functional

  # Performance
  Scenario: Fast question loading
    Given I start a new session
    Then the first question should load within 2 seconds
    When I move to the next question
    Then it should load within 1 second

  Scenario: AI feedback response time
    Given I submit an answer
    Then AI feedback should appear within 5 seconds
    And I should see a loading indicator during processing

  # Data Privacy
  Scenario: Session data privacy
    Given I complete a session
    Then my answers should be stored securely
    And I should be able to delete session history
    When I delete a session
    Then all data should be permanently removed

  # Export & Sharing
  Scenario: Export session results
    Given I have completed a session
    When I click "Export Results"
    Then I should see export format options (PDF, CSV)
    When I select PDF
    Then a PDF report should be downloaded

  Scenario: Share session results
    Given I have completed a session
    When I click "Share Results"
    Then I should get a shareable link
    And I should be able to control sharing permissions
