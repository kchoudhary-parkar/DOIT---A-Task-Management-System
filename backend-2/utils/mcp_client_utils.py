from __future__ import annotations

import asyncio
import json
import os
import sys
from pathlib import Path
from typing import Any, Dict, List, Optional

try:
    from mcp import ClientSession, StdioServerParameters
    from mcp.client.stdio import stdio_client
except Exception:  # pragma: no cover - graceful degradation if MCP isn't installed
    ClientSession = None  # type: ignore[assignment]
    StdioServerParameters = None  # type: ignore[assignment]
    stdio_client = None  # type: ignore[assignment]


MCP_SERVER_SCRIPTS: Dict[str, Path] = {
    "task": Path(__file__).resolve().parents[1] / "mcp_servers" / "task_mcp_server.py",
    "sprint": Path(__file__).resolve().parents[1] / "mcp_servers" / "sprint_mcp_server.py",
    "project": Path(__file__).resolve().parents[1] / "mcp_servers" / "project_mcp_server.py",
    "member": Path(__file__).resolve().parents[1] / "mcp_servers" / "member_mcp_server.py",
}

BACKEND_ROOT = Path(__file__).resolve().parents[1]


def _mcp_available() -> bool:
    return (
        ClientSession is not None
        and StdioServerParameters is not None
        and stdio_client is not None
    )


def get_mcp_runtime_diagnostics() -> Dict[str, Any]:
    return {
        "mcp_sdk_available": _mcp_available(),
        "python_executable": sys.executable,
        "backend_root": str(BACKEND_ROOT),
        "mcp_python_executable_override": os.getenv("MCP_PYTHON_EXECUTABLE"),
    }


def _build_server_params(script_path: Path):
    python_executable = os.getenv("MCP_PYTHON_EXECUTABLE") or sys.executable
    env = {**os.environ}
    env["PYTHONUNBUFFERED"] = "1"

    existing_pythonpath = env.get("PYTHONPATH", "")
    backend_root_str = str(BACKEND_ROOT)
    if existing_pythonpath:
        if backend_root_str not in existing_pythonpath.split(os.pathsep):
            env["PYTHONPATH"] = existing_pythonpath + os.pathsep + backend_root_str
    else:
        env["PYTHONPATH"] = backend_root_str

    return StdioServerParameters(
        command=python_executable,
        args=[str(script_path)],
        env=env,
    )


def _extract_text_from_tool_result(result: Any) -> str:
    if result is None:
        return ""

    # Most MCP SDK responses expose `.content` with text segments.
    content = getattr(result, "content", None)
    if content:
        chunks: List[str] = []
        for item in content:
            text = getattr(item, "text", None)
            if text is not None:
                chunks.append(text)
            else:
                chunks.append(str(item))
        return "\n".join(chunks).strip()

    # Fallback for dict-like or plain-string responses.
    if isinstance(result, str):
        return result

    return str(result)


async def list_mcp_tools(server_name: str) -> Dict[str, Any]:
    """List tools exposed by a configured MCP server."""
    if not _mcp_available():
        return {
            "success": False,
            "error": (
                "MCP SDK is not available in the backend runtime. "
                "Install with: pip install 'mcp[cli]' and restart backend using the same Python environment."
            ),
            **get_mcp_runtime_diagnostics(),
        }

    script_path = MCP_SERVER_SCRIPTS.get(server_name)
    if not script_path or not script_path.exists():
        return {
            "success": False,
            "error": f"MCP server '{server_name}' is not configured.",
        }

    server_params = _build_server_params(script_path)

    try:
        async with stdio_client(server_params) as (read_stream, write_stream):
            async with ClientSession(read_stream, write_stream) as session:
                await session.initialize()
                tools_response = await session.list_tools()

                tools = getattr(tools_response, "tools", []) or []
                tool_names = [getattr(tool, "name", str(tool)) for tool in tools]

                return {
                    "success": True,
                    "server": server_name,
                    "tools": tool_names,
                }
    except Exception as exc:
        return {
            "success": False,
            "server": server_name,
            "error": str(exc),
        }


async def call_mcp_tool(
    server_name: str,
    tool_name: str,
    arguments: Optional[Dict[str, Any]] = None,
) -> Dict[str, Any]:
    """Call one MCP tool over stdio and normalize the response payload."""
    if not _mcp_available():
        return {
            "success": False,
            "server": server_name,
            "tool": tool_name,
            "error": (
                "MCP SDK is not available in the backend runtime. "
                "Install with: pip install 'mcp[cli]' and restart backend using the same Python environment."
            ),
            **get_mcp_runtime_diagnostics(),
        }

    script_path = MCP_SERVER_SCRIPTS.get(server_name)
    if not script_path or not script_path.exists():
        return {
            "success": False,
            "server": server_name,
            "tool": tool_name,
            "error": f"MCP server '{server_name}' is not configured.",
        }

    server_params = _build_server_params(script_path)

    try:
        async with stdio_client(server_params) as (read_stream, write_stream):
            async with ClientSession(read_stream, write_stream) as session:
                await session.initialize()
                raw_result = await session.call_tool(tool_name, arguments or {})

                text_output = _extract_text_from_tool_result(raw_result)
                parsed: Dict[str, Any]

                try:
                    maybe_json = json.loads(text_output) if text_output else {}
                    parsed = maybe_json if isinstance(maybe_json, dict) else {"data": maybe_json}
                except Exception:
                    parsed = {"output": text_output}

                if "success" not in parsed:
                    parsed["success"] = bool(text_output)

                return {
                    "success": bool(parsed.get("success", False)),
                    "server": server_name,
                    "tool": tool_name,
                    "result": parsed,
                    "raw_text": text_output,
                }
    except Exception as exc:
        return {
            "success": False,
            "server": server_name,
            "tool": tool_name,
            "error": str(exc),
        }


async def get_mcp_servers_health() -> Dict[str, Any]:
    """Check if all configured MCP servers are reachable and list their tools."""
    checks = await asyncio.gather(
        *(list_mcp_tools(name) for name in MCP_SERVER_SCRIPTS.keys())
    )

    healthy = all(check.get("success") for check in checks)
    return {
        "healthy": healthy,
        "servers": checks,
    }
