from npuzzle import Output, astar, bfs, dfs, ids, solveNPuzzle
from npuzzle.display import printBoardTrace
from npuzzle.heuristics import manhattan

__all__ = [
    "Output", "astar", "bfs", "dfs", "ids", "solveNPuzzle",
    "printBoardTrace", "manhattan",
]


if __name__ == "__main__":
    from main import main
    main()
