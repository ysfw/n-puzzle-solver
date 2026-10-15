from .output import Output
from .search import astar, bfs, dfs, ids


def solveNPuzzle(init_state: tuple, algorithm = "A*") -> Output:
    algorithm = algorithm.lower().strip()
    if algorithm == "dfs":
        return dfs(init_state)
    
    elif algorithm == "bfs":
        return bfs(init_state)
    
    elif algorithm == "ids":
        return ids(init_state)
    
    elif algorithm == "a*":
        return astar(init_state)
    
    else:
        print("Error: Choose a valid algorithm")
        return None
