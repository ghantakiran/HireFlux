#!/usr/bin/env python3
"""
Export OpenAPI Specification to JSON file

Usage:
    python scripts/export_openapi.py

Output:
    docs/openapi.json - Full OpenAPI 3.0 specification
"""

import json
import sys
from pathlib import Path

# Add parent directory to path to import app
sys.path.insert(0, str(Path(__file__).parent.parent))

from app.main import app


def export_openapi_spec():
    """Export OpenAPI specification to JSON file"""

    # Get OpenAPI schema from FastAPI app
    openapi_schema = app.openapi()

    # Create docs directory if it doesn't exist
    docs_dir = Path(__file__).parent.parent / "docs"
    docs_dir.mkdir(exist_ok=True)

    # Write to JSON file
    output_file = docs_dir / "openapi.json"
    with open(output_file, "w") as f:
        json.dump(openapi_schema, f, indent=2)

    print(f"✅ OpenAPI specification exported to: {output_file}")
    print(f"📄 Total endpoints: {len([p for p in openapi_schema['paths']])}")

    # Count endpoints by tag
    tags_count = {}
    for path, methods in openapi_schema['paths'].items():
        for method, details in methods.items():
            if method in ['get', 'post', 'put', 'patch', 'delete']:
                tags = details.get('tags', ['Untagged'])
                for tag in tags:
                    tags_count[tag] = tags_count.get(tag, 0) + 1

    print("\n📊 Endpoints by category:")
    for tag, count in sorted(tags_count.items(), key=lambda x: x[1], reverse=True):
        print(f"   - {tag}: {count}")

    return output_file


def export_openapi_yaml():
    """Export OpenAPI specification to YAML file (optional)"""
    try:
        import yaml
    except ImportError:
        print("⚠️  PyYAML not installed. Skipping YAML export.")
        print("   Install with: pip install pyyaml")
        return None

    openapi_schema = app.openapi()

    docs_dir = Path(__file__).parent.parent / "docs"
    docs_dir.mkdir(exist_ok=True)

    output_file = docs_dir / "openapi.yaml"
    with open(output_file, "w") as f:
        yaml.dump(openapi_schema, f, default_flow_style=False, sort_keys=False)

    print(f"✅ OpenAPI specification exported to: {output_file}")
    return output_file


if __name__ == "__main__":
    print("🚀 Exporting OpenAPI specification...\n")

    # Export JSON (required)
    json_file = export_openapi_spec()

    # Export YAML (optional)
    print()
    yaml_file = export_openapi_yaml()

    print("\n✨ Export complete!")
    print("\n📖 View documentation:")
    print("   - Interactive: http://localhost:8000/api/v1/docs")
    print("   - ReDoc: http://localhost:8000/api/v1/redoc")
    print(f"   - JSON: {json_file}")
    if yaml_file:
        print(f"   - YAML: {yaml_file}")
