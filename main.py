from npuzzle import solveNPuzzle
from npuzzle.display import printBoardTrace

def main():
    start = (1, 2, 5, 3, 4, 0, 6, 7, 8)
    traceBFS = solveNPuzzle(start, "bfs")
    trace = solveNPuzzle(start, "dfs")
    traceAs = solveNPuzzle(start, "a*")

    if trace and traceBFS and traceAs:
        print(f"cost = {trace.getCost()}")
        print(f"max depth = {trace.getDepth()}")
        print(f"path = {trace.getPath()}")
        
        print("trace of path:")
        printBoardTrace(trace.getPathTrace())
        
        print(f"time = {trace.getTime()}")

        #traceBFS
        print(f"cost = {traceBFS.getCost()}")
        print(f"max depth = {traceBFS.getDepth()}")
        print(f"path = {traceBFS.getPath()}")

        print("trace of path:")
        printBoardTrace(traceBFS.getPathTrace())

        print(f"time = {traceBFS.getTime()}")

        #traceA*
        print(f"cost = {traceAs.getCost()}")
        print(f"max depth = {traceAs.getDepth()}")
        print(f"path = {traceAs.getPath()}")

        print("trace of path:")
        printBoardTrace(traceAs.getPathTrace())

        print(f"time = {traceAs.getTime()}")


        # print("expanded nodes:")
        # printBoardTrace(trace.getExpansionTrace())

    else:
        print("trace is None")


if __name__ == "__main__":
    main()
