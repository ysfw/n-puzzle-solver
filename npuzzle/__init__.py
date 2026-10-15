"""Sliding-puzzle search algorithms."""

from .output import Output
from .search import astar, bfs, dfs, ids
from .solver import solveNPuzzle

__all__ = ["Output", "astar", "bfs", "dfs", "ids", "solveNPuzzle"]
