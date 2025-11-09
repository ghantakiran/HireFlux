/**
 * Mock data for Employer Analytics E2E tests
 * Sprint 15-16: Advanced Analytics & Reporting
 */

export const mockAnalyticsOverview = {
  company_id: "550e8400-e29b-41d4-a716-446655440000",
  start_date: "2025-01-01",
  end_date: "2025-03-31",
  total_applications: 250,
  total_hires: 15,
  avg_time_to_hire: 28.5,
  avg_cost_per_hire: "66.00",
  avg_fit_index: 78.5,
  top_performing_jobs: [
    {
      job_id: "job-001",
      title: "Senior Python Developer",
      conversion_rate: 0.12,
      applications: 80,
      hires: 10
    },
    {
      job_id: "job-002",
      title: "Full Stack Engineer",
      conversion_rate: 0.08,
      applications: 60,
      hires: 5
    }
  ],
  pipeline_conversion: {
    new_to_reviewing: 0.75,
    reviewing_to_phone_screen: 0.50,
    phone_screen_to_technical: 0.60,
    technical_to_hired: 0.33
  }
};

export const mockPipelineFunnel = {
  company_id: "550e8400-e29b-41d4-a716-446655440000",
  job_id: null,
  stages: [
    {
      stage: "new",
      count: 100,
      avg_days_in_stage: 2.5,
      drop_off_rate: 0.25
    },
    {
      stage: "reviewing",
      count: 75,
      avg_days_in_stage: 5.0,
      drop_off_rate: 0.33
    },
    {
      stage: "phone_screen",
      count: 50,
      avg_days_in_stage: 7.0,
      drop_off_rate: 0.40
    },
    {
      stage: "technical_interview",
      count: 30,
      avg_days_in_stage: 3.5,
      drop_off_rate: 0.33
    },
    {
      stage: "final_interview",
      count: 20,
      avg_days_in_stage: 4.0,
      drop_off_rate: 0.25
    },
    {
      stage: "offer",
      count: 15,
      avg_days_in_stage: 2.0,
      drop_off_rate: 0.07
    },
    {
      stage: "hired",
      count: 14,
      avg_days_in_stage: null,
      drop_off_rate: null
    },
    {
      stage: "rejected",
      count: 86,
      avg_days_in_stage: null,
      drop_off_rate: null
    }
  ],
  overall_conversion_rate: 0.14
};

export const mockSourcingMetrics = {
  company_id: "550e8400-e29b-41d4-a716-446655440000",
  start_date: "2025-01-01",
  end_date: "2025-03-31",
  sources: [
    {
      source: "auto_apply",
      count: 150,
      avg_fit_index: 75.5,
      hires: 8,
      conversion_rate: 0.053
    },
    {
      source: "manual",
      count: 60,
      avg_fit_index: 82.3,
      hires: 5,
      conversion_rate: 0.083
    },
    {
      source: "referral",
      count: 25,
      avg_fit_index: 88.7,
      hires: 3,
      conversion_rate: 0.12
    },
    {
      source: "job_board",
      count: 15,
      avg_fit_index: 70.2,
      hires: 1,
      conversion_rate: 0.067
    }
  ],
  total_applications: 250,
  total_hires: 17
};

export const mockTimeMetrics = {
  company_id: "550e8400-e29b-41d4-a716-446655440000",
  start_date: "2025-01-01",
  end_date: "2025-03-31",
  avg_time_to_first_application: 3.5,
  avg_time_to_shortlist: 7.2,
  avg_time_to_offer: 25.0,
  avg_time_to_hire: 28.5,
  target_time_to_hire: 30,
  performance_vs_target: -5.0  // 5% better than target
};

export const mockQualityMetrics = {
  company_id: "550e8400-e29b-41d4-a716-446655440000",
  avg_fit_index: 78.5,
  interview_show_up_rate: 0.92,
  offer_acceptance_rate: 0.85,
  six_month_retention_rate: 0.88,
  twelve_month_retention_rate: 0.75
};

export const mockCostMetrics = {
  company_id: "550e8400-e29b-41d4-a716-446655440000",
  start_date: "2025-01-01",
  end_date: "2025-03-31",
  total_subscription_cost: "297.00",  // $99/month × 3 months
  total_applications: 250,
  total_hires: 17,
  cost_per_application: "1.19",
  cost_per_hire: "17.47",
  roi: "28.5"
};

// Empty state mocks (for testing graceful degradation)
export const mockEmptyAnalytics = {
  company_id: "550e8400-e29b-41d4-a716-446655440000",
  start_date: "2025-01-01",
  end_date: "2025-03-31",
  total_applications: 0,
  total_hires: 0,
  avg_time_to_hire: null,
  avg_cost_per_hire: null,
  avg_fit_index: null,
  top_performing_jobs: [],
  pipeline_conversion: {}
};

export const mockEmptyFunnel = {
  company_id: "550e8400-e29b-41d4-a716-446655440000",
  job_id: null,
  stages: [],
  overall_conversion_rate: 0
};

// Date range presets
export const dateRangePresets = {
  last_7_days: {
    start_date: new Date(Date.now() - 7 * 24 * 60 * 60 * 1000).toISOString().split('T')[0],
    end_date: new Date().toISOString().split('T')[0]
  },
  last_30_days: {
    start_date: new Date(Date.now() - 30 * 24 * 60 * 60 * 1000).toISOString().split('T')[0],
    end_date: new Date().toISOString().split('T')[0]
  },
  last_90_days: {
    start_date: new Date(Date.now() - 90 * 24 * 60 * 60 * 1000).toISOString().split('T')[0],
    end_date: new Date().toISOString().split('T')[0]
  },
  custom: {
    start_date: "2025-01-01",
    end_date: "2025-03-31"
  }
};

// API route handlers
export const analyticsRouteHandlers = {
  overview: `/api/v1/employer/companies/*/analytics/overview*`,
  funnel: `/api/v1/employer/companies/*/analytics/funnel*`,
  sources: `/api/v1/employer/companies/*/analytics/sources*`,
  timeMetrics: `/api/v1/employer/companies/*/analytics/time-metrics*`,
  quality: `/api/v1/employer/companies/*/analytics/quality*`,
  costs: `/api/v1/employer/companies/*/analytics/costs*`
};
