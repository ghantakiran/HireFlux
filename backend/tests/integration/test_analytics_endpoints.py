"""Integration tests for Analytics API endpoints

Tests all 16 analytics endpoints with real database interactions.
"""

import pytest
from fastapi.testclient import TestClient
from datetime import datetime, timedelta
import uuid


class TestDashboardEndpoints:
    """Tests for dashboard overview endpoints"""

    def test_get_dashboard_overview(self, client, auth_headers, test_applications):
        """Should return dashboard overview with all metrics"""
        response = client.get("/api/v1/analytics/dashboard", headers=auth_headers)

        assert response.status_code == 200
        data = response.json()

        # Verify structure
        assert "health_score" in data
        assert "applications_this_week" in data
        assert "interviews_this_week" in data
        assert "recent_activity" in data

        # Verify health score
        assert 0 <= data["health_score"]["overall_score"] <= 100
        assert "level" in data["health_score"]

    def test_get_detailed_analytics(self, client, auth_headers, test_applications):
        """Should return detailed analytics with time range"""
        response = client.get(
            "/api/v1/analytics/dashboard/detailed?time_range=LAST_30_DAYS",
            headers=auth_headers,
        )

        assert response.status_code == 200
        data = response.json()

        assert "pipeline_stats" in data
        assert "conversion_funnel" in data
        assert "trends" in data

    def test_get_dashboard_overview_no_applications(
        self, client, auth_headers, test_user
    ):
        """Should return dashboard with zero applications"""
        response = client.get("/api/v1/analytics/dashboard", headers=auth_headers)

        assert response.status_code == 200
        data = response.json()

        assert data["health_score"]["overall_score"] >= 0

    def test_get_dashboard_overview_unauthorized(self, client, unauthorized_headers):
        """Should reject unauthorized access"""
        response = client.get(
            "/api/v1/analytics/dashboard", headers=unauthorized_headers
        )

        assert response.status_code == 401

    def test_get_dashboard_overview_no_auth(self, client):
        """Should reject requests without authentication"""
        response = client.get("/api/v1/analytics/dashboard")

        assert response.status_code == 401


class TestHealthScoreEndpoints:
    """Tests for health score calculation"""

    def test_get_health_score(self, client, auth_headers, test_applications):
        """Should calculate health score correctly"""
        response = client.get("/api/v1/analytics/health-score", headers=auth_headers)

        assert response.status_code == 200
        data = response.json()["data"]

        assert "score" in data
        assert "status" in data
        assert "factors" in data
        assert "recommendations" in data

        # Score should be 0-100
        assert 0 <= data["score"] <= 100

        # Status should be one of the expected values
        assert data["status"] in [
            "excellent",
            "good",
            "fair",
            "needs_improvement",
            "critical",
        ]

        # Should have factors
        assert len(data["factors"]) > 0
        for factor in data["factors"]:
            assert "name" in factor
            assert "score" in factor
            assert "weight" in factor

    def test_get_health_score_trend(self, client, auth_headers, test_applications):
        """Should return health score history"""
        # Query for last 30 days
        response = client.get(
            "/api/v1/analytics/health-score/trend?days=30", headers=auth_headers
        )

        assert response.status_code == 200
        data = response.json()["data"]

        assert "trend" in data
        assert "current_score" in data
        assert "previous_score" in data
        assert "change" in data

        # Trend should be array of data points
        assert isinstance(data["trend"], list)

    def test_get_health_score_custom_period(
        self, client, auth_headers, test_applications
    ):
        """Should support custom time periods"""
        response = client.get(
            "/api/v1/analytics/health-score/trend?days=7", headers=auth_headers
        )

        assert response.status_code == 200
        data = response.json()["data"]

        assert "trend" in data


class TestPipelineStatsEndpoints:
    """Tests for pipeline statistics"""

    def test_get_pipeline_stats(self, client, auth_headers, test_applications):
        """Should return pipeline statistics"""
        response = client.get(
            "/api/v1/analytics/pipeline/stats?time_range=LAST_30_DAYS",
            headers=auth_headers,
        )

        assert response.status_code == 200
        data = response.json()

        assert "total_applications" in data
        assert "by_status" in data
        assert "response_rate" in data
        assert "interview_rate" in data

        # Verify counts
        assert isinstance(data["total_applications"], int)

    def test_get_pipeline_distribution(self, client, auth_headers, test_applications):
        """Should break down pipeline by status"""
        response = client.get(
            "/api/v1/analytics/pipeline/distribution?time_range=LAST_30_DAYS",
            headers=auth_headers,
        )

        assert response.status_code == 200
        data = response.json()

        # Should have distribution array
        assert isinstance(data, list)
        for item in data:
            assert "stage" in item
            assert "count" in item
            assert "percentage" in item

    def test_get_conversion_funnel(self, client, auth_headers, test_applications):
        """Should return conversion funnel data"""
        response = client.get(
            "/api/v1/analytics/pipeline/funnel?time_range=LAST_30_DAYS",
            headers=auth_headers,
        )

        assert response.status_code == 200
        data = response.json()

        # Should have funnel stages
        assert isinstance(data, list)
        for stage in data:
            assert "stage" in stage
            assert "count" in stage
            assert "conversion_rate" in stage


class TestActivityTrendEndpoints:
    """Tests for activity and trends"""

    def test_get_activity_timeline(self, client, auth_headers, test_applications):
        """Should return activity timeline"""
        response = client.get(
            "/api/v1/analytics/activity?skip=0&limit=20", headers=auth_headers
        )

        assert response.status_code == 200
        data = response.json()

        assert "events" in data
        assert "total_count" in data

        # Events should be array
        assert isinstance(data["events"], list)

    def test_get_application_trend(self, client, auth_headers, test_applications):
        """Should return application trend over time"""
        response = client.get(
            "/api/v1/analytics/trends/applications?time_range=LAST_30_DAYS",
            headers=auth_headers,
        )

        assert response.status_code == 200
        data = response.json()

        # Should have daily data points
        assert isinstance(data, list)
        for trend in data:
            assert "date" in trend
            assert "applications" in trend

    def test_get_time_series_applications(
        self, client, auth_headers, test_applications
    ):
        """Should return time series chart for applications"""
        response = client.get(
            "/api/v1/analytics/trends/timeseries/applications?time_range=LAST_30_DAYS",
            headers=auth_headers,
        )

        assert response.status_code == 200
        data = response.json()

        assert "metric" in data
        assert "data_points" in data
        assert "trend_direction" in data


class TestSuccessMetricsEndpoints:
    """Tests for success metrics"""

    def test_get_success_metrics(self, client, auth_headers, test_applications):
        """Should return comprehensive success metrics"""
        response = client.get(
            "/api/v1/analytics/metrics/success?time_range=LAST_30_DAYS",
            headers=auth_headers,
        )

        assert response.status_code == 200
        data = response.json()

        assert "applications_count" in data
        assert "response_rate" in data
        assert "interview_rate" in data
        assert "offer_rate" in data

    def test_get_peer_comparison(self, client, auth_headers, test_applications):
        """Should compare with platform averages"""
        response = client.get(
            "/api/v1/analytics/benchmarks/peer-comparison", headers=auth_headers
        )

        assert response.status_code == 200
        data = response.json()

        assert "user_metrics" in data
        assert "platform_averages" in data
        assert "percentile" in data
        assert "performance_level" in data


class TestQuickStatsEndpoints:
    """Tests for quick stats widgets"""

    def test_get_quick_stats(self, client, auth_headers, test_applications):
        """Should return quick stats for dashboard widgets"""
        response = client.get("/api/v1/analytics/quick-stats", headers=auth_headers)

        assert response.status_code == 200
        data = response.json()

        assert "applications_this_week" in data
        assert "interviews_this_week" in data
        assert "offers_pending" in data
        assert "new_matches" in data
        assert "health_score" in data
        assert "health_level" in data

        # Health score should be 0-100
        assert 0 <= data["health_score"] <= 100


class TestAnomalyDetectionEndpoints:
    """Tests for anomaly detection"""

    def test_detect_anomalies(self, client, auth_headers, test_applications):
        """Should detect anomalies in application patterns"""
        response = client.get("/api/v1/analytics/anomalies", headers=auth_headers)

        assert response.status_code == 200
        data = response.json()

        assert "detected_anomalies" in data
        assert "summary" in data

        # Anomalies should be array
        anomalies = data["detected_anomalies"]
        assert isinstance(anomalies, list)

        if len(anomalies) > 0:
            for anomaly in anomalies:
                assert "type" in anomaly
                assert "severity" in anomaly
                assert "description" in anomaly
                assert "recommendation" in anomaly


class TestExportEndpoints:
    """Tests for data export functionality"""

    def test_export_dashboard_data(self, client, auth_headers, test_applications):
        """Should export complete dashboard data"""
        response = client.get(
            "/api/v1/analytics/export?time_range=LAST_30_DAYS", headers=auth_headers
        )

        assert response.status_code == 200
        data = response.json()

        assert "user_id" in data
        assert "generated_at" in data
        assert "time_range" in data
        assert "overview" in data
        assert "detailed_analytics" in data
        assert "activity_timeline" in data
        assert "anomaly_report" in data

    def test_export_different_time_ranges(
        self, client, auth_headers, test_applications
    ):
        """Should support different time ranges"""
        for time_range in ["LAST_7_DAYS", "LAST_30_DAYS", "LAST_90_DAYS"]:
            response = client.get(
                f"/api/v1/analytics/export?time_range={time_range}",
                headers=auth_headers,
            )

            assert response.status_code == 200
            data = response.json()
            assert data["time_range"] == time_range


class TestAdminEndpoints:
    """Tests for admin endpoints"""

    def test_get_platform_stats(self, client, auth_headers, test_applications):
        """Should return platform-wide statistics"""
        response = client.get(
            "/api/v1/analytics/admin/platform-stats", headers=auth_headers
        )

        assert response.status_code == 200
        data = response.json()

        assert "total_users" in data
        assert "total_applications" in data
        assert "avg_applications_per_user" in data

        # Should be positive numbers
        assert data["total_users"] >= 0
        assert data["total_applications"] >= 0


class TestPerformanceMetrics:
    """Tests for performance and response times"""

    def test_dashboard_performance(self, client, auth_headers, test_applications):
        """Dashboard endpoint should respond within 500ms"""
        import time

        start = time.time()
        response = client.get("/api/v1/analytics/dashboard", headers=auth_headers)
        duration = time.time() - start

        assert response.status_code == 200
        # Should be fast even with multiple queries
        assert duration < 0.5, f"Dashboard took {duration}s, expected < 0.5s"

    def test_concurrent_requests(self, client, auth_headers, test_applications):
        """Should handle concurrent requests"""
        import concurrent.futures

        def make_request():
            return client.get(
                "/api/v1/analytics/pipeline/stats?time_range=LAST_30_DAYS",
                headers=auth_headers,
            )

        # Make 10 concurrent requests
        with concurrent.futures.ThreadPoolExecutor(max_workers=10) as executor:
            futures = [executor.submit(make_request) for _ in range(10)]
            results = [f.result() for f in concurrent.futures.as_completed(futures)]

        # All should succeed
        assert all(r.status_code == 200 for r in results)


class TestErrorHandling:
    """Tests for error scenarios"""

    def test_invalid_metric(self, client, auth_headers):
        """Should reject invalid metrics in time series"""
        response = client.get(
            "/api/v1/analytics/trends/timeseries/invalid_metric?time_range=LAST_30_DAYS",
            headers=auth_headers,
        )

        assert response.status_code == 400

    def test_invalid_time_range(self, client, auth_headers):
        """Should reject invalid time ranges"""
        response = client.get(
            "/api/v1/analytics/trends/applications?time_range=INVALID",
            headers=auth_headers,
        )

        assert response.status_code == 422  # Validation error

    def test_nonexistent_endpoint(self, client, auth_headers):
        """Should return 404 for nonexistent endpoints"""
        response = client.get("/api/v1/analytics/nonexistent", headers=auth_headers)

        assert response.status_code == 404
