"""
Logging Configuration
Simple logger wrapper for application logging
"""

import logging
import sys

# Configure logging
logging.basicConfig(
    level=logging.INFO,
    format="%(asctime)s - %(name)s - %(levelname)s - %(message)s",
    handlers=[logging.StreamHandler(sys.stdout)],
)

# Create logger
logger = logging.getLogger("hireflux")
