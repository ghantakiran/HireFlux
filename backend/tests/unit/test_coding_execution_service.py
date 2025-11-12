"""
Unit Tests for CodingExecutionService - Sprint 19-20 Week 37

Tests code execution integration with Judge0 and Piston APIs.
Following TDD principles with comprehensive test coverage.
"""

import pytest
from unittest.mock import Mock, patch, MagicMock
from app.services.coding_execution_service import CodingExecutionService, LANGUAGE_IDS


class TestCodingExecutionService:
    """Test suite for CodingExecutionService"""

    def setup_method(self):
        """Set up test fixtures"""
        self.service = CodingExecutionService()

    # ========================================================================
    # Language Support Tests
    # ========================================================================

    def test_is_supported_language_valid(self):
        """Test language support check for valid languages"""
        assert self.service.is_supported_language("python") is True
        assert self.service.is_supported_language("javascript") is True
        assert self.service.is_supported_language("java") is True
        assert self.service.is_supported_language("Python") is True  # Case insensitive

    def test_is_supported_language_invalid(self):
        """Test language support check for invalid languages"""
        assert self.service.is_supported_language("invalid") is False
        assert self.service.is_supported_language("") is False
        assert self.service.is_supported_language("cobol") is False

    def test_get_supported_languages(self):
        """Test getting list of supported languages"""
        languages = self.service.get_supported_languages()

        assert isinstance(languages, list)
        assert len(languages) > 0
        assert "python" in languages
        assert "javascript" in languages
        assert "java" in languages

    def test_get_language_template_python(self):
        """Test getting Python starter template"""
        template = self.service.get_language_template("python", "solve")

        assert "def solve()" in template
        assert "if __name__ == '__main__':" in template
        assert "print" in template

    def test_get_language_template_javascript(self):
        """Test getting JavaScript starter template"""
        template = self.service.get_language_template("javascript", "solve")

        assert "function solve()" in template
        assert "console.log" in template

    def test_get_language_template_java(self):
        """Test getting Java starter template"""
        template = self.service.get_language_template("java")

        assert "public class Solution" in template
        assert "public static void main" in template

    # ========================================================================
    # Piston API Tests (Fallback)
    # ========================================================================

    @patch('app.services.coding_execution_service.requests.post')
    def test_execute_with_piston_success(self, mock_post):
        """Test successful code execution with Piston"""
        # Mock Piston API response
        mock_response = Mock()
        mock_response.json.return_value = {
            "run": {
                "stdout": "Hello, World!\n",
                "stderr": "",
                "code": 0
            }
        }
        mock_response.raise_for_status = Mock()
        mock_post.return_value = mock_response

        # Execute code (service should use Piston as fallback if no Judge0 key)
        service_no_judge0 = CodingExecutionService()
        service_no_judge0.use_judge0 = False

        result = service_no_judge0.execute_code(
            code="print('Hello, World!')",
            language="python",
            test_input=""
        )

        # Assertions
        assert result["status"]["id"] == 3  # Accepted
        assert result["status"]["description"] == "Accepted"
        assert result["stdout"] == "Hello, World!\n"
        mock_post.assert_called_once()

    @patch('app.services.coding_execution_service.requests.post')
    def test_execute_with_piston_runtime_error(self, mock_post):
        """Test code execution with runtime error via Piston"""
        mock_response = Mock()
        mock_response.json.return_value = {
            "run": {
                "stdout": "",
                "stderr": "ZeroDivisionError: division by zero",
                "code": 1
            }
        }
        mock_response.raise_for_status = Mock()
        mock_post.return_value = mock_response

        service_no_judge0 = CodingExecutionService()
        service_no_judge0.use_judge0 = False

        result = service_no_judge0.execute_code(
            code="x = 1 / 0",
            language="python"
        )

        assert result["status"]["id"] == 11  # Runtime Error
        assert "ZeroDivisionError" in result["stderr"]

    @patch('app.services.coding_execution_service.requests.post')
    def test_execute_with_piston_compilation_error(self, mock_post):
        """Test code with compilation error via Piston"""
        mock_response = Mock()
        mock_response.json.return_value = {
            "compile": {
                "output": "SyntaxError: invalid syntax"
            }
        }
        mock_response.raise_for_status = Mock()
        mock_post.return_value = mock_response

        service_no_judge0 = CodingExecutionService()
        service_no_judge0.use_judge0 = False

        result = service_no_judge0.execute_code(
            code="def foo(\n    pass",  # Invalid syntax
            language="python"
        )

        assert result["status"]["id"] == 6  # Compilation Error
        assert "SyntaxError" in result["compile_output"]

    @patch('app.services.coding_execution_service.requests.post')
    def test_execute_with_piston_unsupported_language(self, mock_post):
        """Test execution with unsupported language"""
        service_no_judge0 = CodingExecutionService()
        service_no_judge0.use_judge0 = False

        result = service_no_judge0.execute_code(
            code="print('test')",
            language="cobol"
        )

        assert result["status"]["id"] == 13  # Internal Error
        assert "not supported" in result["error"]

    @patch('app.services.coding_execution_service.requests.post')
    def test_execute_with_piston_api_error(self, mock_post):
        """Test handling Piston API errors"""
        import requests
        mock_post.side_effect = requests.exceptions.RequestException("API timeout")

        service_no_judge0 = CodingExecutionService()
        service_no_judge0.use_judge0 = False

        result = service_no_judge0.execute_code(
            code="print('test')",
            language="python"
        )

        assert result["status"]["id"] == 13  # Internal Error
        assert "Piston API error" in result["error"]

    # ========================================================================
    # Test Case Execution Tests
    # ========================================================================

    @patch('app.services.coding_execution_service.CodingExecutionService.execute_code')
    def test_execute_test_cases_all_pass(self, mock_execute):
        """Test executing multiple test cases with all passing"""
        # Mock execution results
        mock_execute.side_effect = [
            {"status": {"id": 3}, "stdout": "5", "time": 0.1},
            {"status": {"id": 3}, "stdout": "10", "time": 0.15},
            {"status": {"id": 3}, "stdout": "15", "time": 0.12}
        ]

        test_cases = [
            {"input": "2 3", "expected_output": "5", "points": 10},
            {"input": "4 6", "expected_output": "10", "points": 15},
            {"input": "7 8", "expected_output": "15", "points": 20}
        ]

        result = self.service.execute_test_cases(
            code="a, b = map(int, input().split())\nprint(a + b)",
            language="python",
            test_cases=test_cases
        )

        assert result["total_tests"] == 3
        assert result["passed_tests"] == 3
        assert result["failed_tests"] == 0
        assert result["total_points"] == 45
        assert result["earned_points"] == 45

    @patch('app.services.coding_execution_service.CodingExecutionService.execute_code')
    def test_execute_test_cases_partial_pass(self, mock_execute):
        """Test executing test cases with partial success"""
        mock_execute.side_effect = [
            {"status": {"id": 3}, "stdout": "5", "time": 0.1},
            {"status": {"id": 3}, "stdout": "11", "time": 0.15},  # Wrong output
            {"status": {"id": 3}, "stdout": "15", "time": 0.12}
        ]

        test_cases = [
            {"input": "2 3", "expected_output": "5", "points": 10},
            {"input": "4 6", "expected_output": "10", "points": 15},
            {"input": "7 8", "expected_output": "15", "points": 20}
        ]

        result = self.service.execute_test_cases(
            code="a, b = map(int, input().split())\nprint(a + b)",
            language="python",
            test_cases=test_cases
        )

        assert result["total_tests"] == 3
        assert result["passed_tests"] == 2
        assert result["failed_tests"] == 1
        assert result["total_points"] == 45
        assert result["earned_points"] == 30  # 10 + 20

    @patch('app.services.coding_execution_service.CodingExecutionService.execute_code')
    def test_execute_test_cases_with_hidden_tests(self, mock_execute):
        """Test execution with hidden test cases"""
        mock_execute.side_effect = [
            {"status": {"id": 3}, "stdout": "5", "time": 0.1},
            {"status": {"id": 3}, "stdout": "10", "time": 0.15}
        ]

        test_cases = [
            {"input": "2 3", "expected_output": "5", "points": 10, "is_hidden": False},
            {"input": "100 200", "expected_output": "10", "points": 20, "is_hidden": True}
        ]

        result = self.service.execute_test_cases(
            code="a, b = map(int, input().split())\nprint(a + b)",
            language="python",
            test_cases=test_cases
        )

        # Hidden test case results should be masked
        assert result["test_results"][0]["input"] == "2 3"
        assert result["test_results"][1]["input"] == "[Hidden]"
        assert result["test_results"][1]["expected_output"] == "[Hidden]"

    @patch('app.services.coding_execution_service.CodingExecutionService.execute_code')
    def test_execute_test_cases_runtime_error(self, mock_execute):
        """Test handling runtime errors during test execution"""
        mock_execute.side_effect = [
            {"status": {"id": 11}, "stdout": "", "stderr": "ZeroDivisionError"}
        ]

        test_cases = [
            {"input": "0", "expected_output": "5", "points": 10}
        ]

        result = self.service.execute_test_cases(
            code="x = 10 / int(input())",
            language="python",
            test_cases=test_cases
        )

        assert result["passed_tests"] == 0
        assert result["failed_tests"] == 1
        assert result["test_results"][0]["error"] is not None

    # ========================================================================
    # Syntax Validation Tests
    # ========================================================================

    @patch('app.services.coding_execution_service.CodingExecutionService.execute_code')
    def test_validate_syntax_valid_code(self, mock_execute):
        """Test syntax validation for valid code"""
        mock_execute.return_value = {"status": {"id": 3}}  # Accepted

        is_valid = self.service.validate_syntax(
            code="def foo():\n    return 42",
            language="python"
        )

        assert is_valid is True

    @patch('app.services.coding_execution_service.CodingExecutionService.execute_code')
    def test_validate_syntax_invalid_code(self, mock_execute):
        """Test syntax validation for invalid code"""
        mock_execute.return_value = {"status": {"id": 6}}  # Compilation Error

        is_valid = self.service.validate_syntax(
            code="def foo(\n    pass",  # Invalid syntax
            language="python"
        )

        assert is_valid is False

    # ========================================================================
    # Edge Cases
    # ========================================================================

    def test_execute_code_empty_code(self):
        """Test execution with empty code"""
        service_no_judge0 = CodingExecutionService()
        service_no_judge0.use_judge0 = False

        # Should handle gracefully (execution will fail but not crash)
        result = service_no_judge0.execute_code(
            code="",
            language="python"
        )

        assert "status" in result

    def test_execute_test_cases_empty_list(self):
        """Test execution with empty test case list"""
        result = self.service.execute_test_cases(
            code="print('test')",
            language="python",
            test_cases=[]
        )

        assert result["total_tests"] == 0
        assert result["passed_tests"] == 0
        assert result["total_points"] == 0

    @patch('app.services.coding_execution_service.CodingExecutionService.execute_code')
    def test_execute_test_cases_timeout(self, mock_execute):
        """Test handling execution timeout"""
        mock_execute.return_value = {
            "status": {"id": 5, "description": "Time Limit Exceeded"},
            "error": "Execution timeout"
        }

        test_cases = [
            {"input": "", "expected_output": "output", "points": 10, "timeout": 5}
        ]

        result = self.service.execute_test_cases(
            code="while True: pass",  # Infinite loop
            language="python",
            test_cases=test_cases
        )

        assert result["passed_tests"] == 0
        assert "Execution timeout" in result["test_results"][0]["error"]


# ============================================================================
# Integration Tests (requires actual API access)
# ============================================================================

@pytest.mark.integration
@pytest.mark.skipif(
    not hasattr(pytest, "config") or not pytest.config.getoption("--integration"),
    reason="Integration tests require --integration flag"
)
class TestCodingExecutionServiceIntegration:
    """Integration tests with actual Piston API"""

    def setup_method(self):
        """Set up integration tests"""
        self.service = CodingExecutionService()
        self.service.use_judge0 = False  # Use Piston for free tier

    def test_integration_python_hello_world(self):
        """Integration test: Execute Python Hello World"""
        result = self.service.execute_code(
            code="print('Hello, World!')",
            language="python"
        )

        assert result["status"]["id"] == 3
        assert "Hello, World!" in result["stdout"]

    def test_integration_javascript_sum(self):
        """Integration test: Execute JavaScript sum function"""
        result = self.service.execute_code(
            code="console.log(2 + 3);",
            language="javascript"
        )

        assert result["status"]["id"] == 3
        assert "5" in result["stdout"]

    def test_integration_runtime_error(self):
        """Integration test: Handle runtime error"""
        result = self.service.execute_code(
            code="x = 1 / 0",
            language="python"
        )

        assert result["status"]["id"] in [11, 12]  # Runtime error codes
        assert result["stderr"] is not None
