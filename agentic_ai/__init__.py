"""
upchaarinfo Agentic AI Pipeline
A sophisticated multi-agent system for health symptom analysis and recommendations.
"""

__version__ = "1.0.0"
__author__ = "upchaarinfo Team"

from .graphs.assembly_line import upchaarinfoGraph
from .mcp_server.server import MCPServer

__all__ = ["upchaarinfoGraph", "MCPServer"]