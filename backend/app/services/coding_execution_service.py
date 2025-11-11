"""
CodingExecutionService - Code Execution & Testing

Sprint 17-18 Phase 4

Service for executing candidate code submissions using Judge0 API.
Supports multiple programming languages with sandboxed execution.
"""

import time
import requests
from typing import Dict, List, Optional, Any
from enum import Enum

from app.core.config import settings


class ExecutionStatus(Enum):
    """Judge0 execution status codes"""
    IN_QUEUE = 1
    PROCESSING = 2
    ACCEPTED = 3
    WRONG_ANSWER = 4
    TIME_LIMIT_EXCEEDED = 5
    COMPILATION_ERROR = 6
    RUNTIME_ERROR_SIGSEGV = 7
    RUNTIME_ERROR_SIGXFSZ = 8
    RUNTIME_ERROR_SIGFPE = 9
    RUNTIME_ERROR_SIGABRT = 10
    RUNTIME_ERROR_NZEC = 11
    RUNTIME_ERROR_OTHER = 12
    INTERNAL_ERROR = 13
    EXEC_FORMAT_ERROR = 14


# Judge0 Language IDs mapping
LANGUAGE_IDS = {
    "python": 71,      # Python 3.8.1
    "javascript": 63,  # JavaScript (Node.js 12.14.0)
    "typescript": 74,  # TypeScript (3.7.4)
    "java": 62,        # Java (OpenJDK 13.0.1)
    "cpp": 54,         # C++ (GCC 9.2.0)
    "c": 50,           # C (GCC 9.2.0)
    "go": 60,          # Go (1.13.5)
    "rust": 73,        # Rust (1.40.0)
    "csharp": 51,      # C# (Mono 6.6.0.161)
    "ruby": 72,        # Ruby (2.7.0)
    "php": 68,         # PHP (7.4.1)
}


class CodingExecutionService:
    """
    Service for executing code submissions.

    Integrates with Judge0 API for sandboxed code execution.
    Supports multiple languages and test case validation.

    Free Tier: 50 requests/day
    Alternative: Piston API (unlimited, self-hosted)
    """

    def __init__(self):
        # Judge0 API configuration
        self.judge0_url = getattr(settings, 'JUDGE0_API_URL', 'https://judge0-ce.p.rapidapi.com')
        self.judge0_api_key = getattr(settings, 'JUDGE0_API_KEY', None)
        self.use_judge0 = self.judge0_api_key is not None

        # Piston API as fallback (no auth required)
        self.piston_url = getattr(settings, 'PISTON_API_URL', 'https://emkc.org/api/v2/piston')

    def execute_code(
        self,
        code: str,
        language: str,
        test_input: str = "",
        timeout_seconds: int = 10
    ) -> Dict[str, Any]:
        """
        Execute code with given input.

        Args:
            code: Source code to execute
            language: Programming language
            test_input: Input for stdin
            timeout_seconds: Execution timeout

        Returns:
            Execution result dictionary with status, stdout, stderr
        """
        if self.use_judge0:
            return self._execute_with_judge0(code, language, test_input, timeout_seconds)
        else:
            return self._execute_with_piston(code, language, test_input)

    def _execute_with_judge0(
        self,
        code: str,
        language: str,
        test_input: str,
        timeout_seconds: int
    ) -> Dict[str, Any]:
        """
        Execute code using Judge0 API.

        Args:
            code: Source code
            language: Language name
            test_input: Stdin input
            timeout_seconds: Timeout

        Returns:
            Execution result
        """
        language_id = LANGUAGE_IDS.get(language.lower())
        if not language_id:
            return {
                "status": {"id": 13, "description": "Internal Error"},
                "error": f"Unsupported language: {language}",
                "stdout": None,
                "stderr": f"Language {language} not supported",
            }

        # Submit code for execution
        submission_url = f"{self.judge0_url}/submissions"
        headers = {
            "X-RapidAPI-Key": self.judge0_api_key,
            "X-RapidAPI-Host": "judge0-ce.p.rapidapi.com",
            "Content-Type": "application/json"
        }

        payload = {
            "language_id": language_id,
            "source_code": code,
            "stdin": test_input,
            "cpu_time_limit": timeout_seconds,
        }

        try:
            # Submit code
            response = requests.post(
                f"{submission_url}?base64_encoded=false&wait=false",
                json=payload,
                headers=headers,
                timeout=5
            )
            response.raise_for_status()

            submission_data = response.json()
            token = submission_data.get("token")

            if not token:
                return {
                    "status": {"id": 13, "description": "Internal Error"},
                    "error": "No submission token received",
                }

            # Poll for result (max 30 seconds)
            max_polls = 30
            poll_interval = 1

            for _ in range(max_polls):
                time.sleep(poll_interval)

                result_response = requests.get(
                    f"{submission_url}/{token}?base64_encoded=false",
                    headers=headers,
                    timeout=5
                )
                result_response.raise_for_status()

                result = result_response.json()
                status_id = result.get("status", {}).get("id")

                # Status 1 = In Queue, 2 = Processing
                if status_id not in [1, 2]:
                    return {
                        "status": result.get("status", {}),
                        "stdout": result.get("stdout", ""),
                        "stderr": result.get("stderr", ""),
                        "compile_output": result.get("compile_output", ""),
                        "time": result.get("time"),
                        "memory": result.get("memory"),
                    }

            # Timeout waiting for result
            return {
                "status": {"id": 5, "description": "Time Limit Exceeded"},
                "error": "Execution timeout",
            }

        except requests.exceptions.RequestException as e:
            return {
                "status": {"id": 13, "description": "Internal Error"},
                "error": f"Judge0 API error: {str(e)}",
                "stdout": None,
                "stderr": str(e),
            }

    def _execute_with_piston(
        self,
        code: str,
        language: str,
        test_input: str
    ) -> Dict[str, Any]:
        """
        Execute code using Piston API (fallback).

        Args:
            code: Source code
            language: Language name
            test_input: Stdin input

        Returns:
            Execution result
        """
        # Piston language mapping
        piston_languages = {
            "python": "python",
            "javascript": "javascript",
            "typescript": "typescript",
            "java": "java",
            "cpp": "c++",
            "c": "c",
            "go": "go",
            "rust": "rust",
            "csharp": "csharp",
        }

        piston_lang = piston_languages.get(language.lower())
        if not piston_lang:
            return {
                "status": {"id": 13, "description": "Internal Error"},
                "error": f"Language {language} not supported by Piston",
            }

        try:
            payload = {
                "language": piston_lang,
                "version": "*",  # Use latest version
                "files": [
                    {
                        "content": code
                    }
                ],
                "stdin": test_input,
            }

            response = requests.post(
                f"{self.piston_url}/execute",
                json=payload,
                timeout=15
            )
            response.raise_for_status()

            result = response.json()

            # Map Piston response to Judge0 format
            if result.get("compile"):
                compile_output = result["compile"].get("output", "")
                if compile_output:
                    return {
                        "status": {"id": 6, "description": "Compilation Error"},
                        "compile_output": compile_output,
                        "stdout": None,
                        "stderr": None,
                    }

            run_output = result.get("run", {})
            stdout = run_output.get("stdout", "")
            stderr = run_output.get("stderr", "")
            exit_code = run_output.get("code", 0)

            status_id = 3 if exit_code == 0 else 11  # Accepted or Runtime Error
            status_desc = "Accepted" if exit_code == 0 else "Runtime Error"

            return {
                "status": {"id": status_id, "description": status_desc},
                "stdout": stdout,
                "stderr": stderr,
            }

        except requests.exceptions.RequestException as e:
            return {
                "status": {"id": 13, "description": "Internal Error"},
                "error": f"Piston API error: {str(e)}",
            }

    def validate_syntax(
        self,
        code: str,
        language: str
    ) -> bool:
        """
        Validate code syntax without executing.

        Args:
            code: Source code
            language: Language name

        Returns:
            True if syntax is valid
        """
        result = self.execute_code(code, language, "", timeout_seconds=5)
        status_id = result.get("status", {}).get("id")

        # Status 6 = Compilation Error
        return status_id != 6

    def execute_test_cases(
        self,
        code: str,
        language: str,
        test_cases: List[Dict[str, Any]]
    ) -> Dict[str, Any]:
        """
        Execute code against multiple test cases.

        Args:
            code: Source code
            language: Language name
            test_cases: List of test case dictionaries

        Returns:
            Aggregated results with per-test-case outcomes
        """
        results = {
            "total_tests": len(test_cases),
            "passed_tests": 0,
            "failed_tests": 0,
            "total_points": 0,
            "earned_points": 0,
            "test_results": [],
        }

        for test_case in test_cases:
            test_input = test_case.get("input", "")
            expected_output = test_case.get("expected_output", "")
            points = test_case.get("points", 0)
            is_hidden = test_case.get("is_hidden", False)

            # Execute code
            execution_result = self.execute_code(
                code,
                language,
                test_input,
                timeout_seconds=test_case.get("timeout", 10)
            )

            status_id = execution_result.get("status", {}).get("id")
            stdout = execution_result.get("stdout", "").strip()

            # Check if passed
            passed = (status_id == 3 and stdout == expected_output.strip())

            test_result = {
                "test_case_number": len(results["test_results"]) + 1,
                "input": test_input if not is_hidden else "[Hidden]",
                "expected_output": expected_output if not is_hidden else "[Hidden]",
                "actual_output": stdout if not is_hidden else "[Hidden]",
                "passed": passed,
                "points": points,
                "earned_points": points if passed else 0,
                "execution_time": execution_result.get("time"),
                "error": execution_result.get("stderr") or execution_result.get("error"),
            }

            results["test_results"].append(test_result)
            results["total_points"] += points

            if passed:
                results["passed_tests"] += 1
                results["earned_points"] += points
            else:
                results["failed_tests"] += 1

        return results

    def is_supported_language(
        self,
        language: str
    ) -> bool:
        """
        Check if language is supported.

        Args:
            language: Language name

        Returns:
            True if supported
        """
        return language.lower() in LANGUAGE_IDS

    def get_supported_languages(self) -> List[str]:
        """
        Get list of supported languages.

        Returns:
            List of language names
        """
        return list(LANGUAGE_IDS.keys())

    def get_language_template(
        self,
        language: str,
        function_name: str = "solution"
    ) -> str:
        """
        Get starter code template for language.

        Args:
            language: Language name
            function_name: Function name to generate

        Returns:
            Starter code template
        """
        templates = {
            "python": f"def {function_name}():\n    # Your code here\n    pass\n\nif __name__ == '__main__':\n    result = {function_name}()\n    print(result)",
            "javascript": f"function {function_name}() {{\n    // Your code here\n}}\n\nconsole.log({function_name}());",
            "java": f"public class Solution {{\n    public static void main(String[] args) {{\n        // Your code here\n    }}\n}}",
            "cpp": f"#include <iostream>\nusing namespace std;\n\nint main() {{\n    // Your code here\n    return 0;\n}}",
            "go": f"package main\n\nimport \"fmt\"\n\nfunc main() {{\n    // Your code here\n}}",
        }

        return templates.get(language.lower(), f"// Write your {language} code here")
