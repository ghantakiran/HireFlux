# HireFlux MCP Servers

Custom Model Context Protocol (MCP) servers for HireFlux integration.

## Directory Structure

```
mcp-servers/
├── redis/              # Redis cache and queue management
├── openai/             # OpenAI API with cost tracking
├── pinecone/           # Vector database for job matching
├── stripe/             # Payment and subscription management
├── job-boards/         # Unified job board API interface
├── audit-log/          # Immutable compliance logging
├── s3/                 # AWS S3 artifact storage
├── email/              # Email notifications (Resend)
├── otel/               # OpenTelemetry tracing
├── secrets/            # AWS Secrets Manager integration
├── embeddings/         # Centralized embedding generation
├── db-schema/          # Database migration management
├── python-linting/     # Code quality tools
├── pytest/             # Test execution and coverage
└── sentry/             # Error tracking
```

## Development Setup

### Prerequisites

```bash
pip install -r requirements-mcp.txt
```

### Running a Server

```bash
# Development mode
python mcp-servers/openai/server.py

# Production mode (systemd/supervisor)
python mcp-servers/openai/server.py --env production
```

### Testing

```bash
# Test all servers
pytest mcp-servers/tests/

# Test specific server
pytest mcp-servers/tests/test_openai.py
```

## Configuration

MCP servers are configured via `~/.config/claude-code/mcp-config.json` (see `MCP_INTEGRATION_ARCHITECTURE.md`).

Environment variables are loaded from `.env` in project root.

## Building Custom Servers

Use the template in `mcp-servers/template/server.py` as a starting point.

### Required Structure

```python
from mcp import Server, Tool

class CustomMCPServer:
    def __init__(self):
        self.server = Server("custom-name")
        self.register_tools()

    def register_tools(self):
        @self.server.tool()
        async def tool_name(params: dict) -> dict:
            # Implementation
            pass

    async def run(self):
        await self.server.run()
```

## Deployment

See `DEPLOYMENT.md` for production deployment instructions.

## Documentation

- [MCP Integration Architecture](../MCP_INTEGRATION_ARCHITECTURE.md)
- [Implementation Roadmap](../MCP_INTEGRATION_ARCHITECTURE.md#implementation-roadmap)
- [Integration Patterns](../MCP_INTEGRATION_ARCHITECTURE.md#integration-patterns)

