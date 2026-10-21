import time

from .heuristics import manhattan, euclidean
from .puzzle import validate_state, is_solvable
from .search import astar, bfs, dfs, ids
from .search.limits import SearchBudget, SearchLimit

ALGORITHMS = {"bfs": bfs, "dfs": dfs, "ids": ids, "astar": astar}


def run_search(data):
    state, puzzle = validate_state(data.get("state"))
    algorithm = data.get("algorithm", "astar")
    heuristic_name = data.get("heuristic", "manhattan")
    if not isinstance(algorithm, str) or algorithm not in ALGORITHMS:
        raise ValueError("Choose BFS, DFS, iterative deepening, or A*.")
    if heuristic_name not in ("manhattan", "euclidean"):
        raise ValueError("Choose Manhattan or Euclidean distance.")
    depth_limit = data.get("depth_limit")
    if depth_limit is not None and (type(depth_limit) is not int or depth_limit < 0):
        raise ValueError("Depth limit must be a whole number.")
    base = dict(algorithm=algorithm, heuristic=heuristic_name, size=puzzle.N,
                initial=list(state), goal=list(puzzle.goal), depth_limit=depth_limit)
    if not is_solvable(state):
        return dict(base, status="unsolvable", message="This arrangement cannot reach the goal. Swap two numbered tiles or shuffle again.")
    budget = SearchBudget()
    heuristic = manhattan if heuristic_name == "manhattan" else euclidean

    def tree_data(solution_states=()):
        # Match prefixes, not merely equal boards, to identify solution edges.
        by_id = {node["id"]: node for node in budget.tree_nodes}
        path_ids = set()
        for node in budget.tree_nodes:
            if solution_states and node["state"] == solution_states[-1]:
                branch, current = [], node
                while current is not None:
                    branch.append(current)
                    current = by_id.get(current["parent"])
                branch.reverse()
                if [n["state"] for n in branch] == list(solution_states):
                    path_ids.update(n["id"] for n in branch)
                    break
        nodes = [dict(node, h=round(heuristic(node["state"]), 3),
                      on_path=node["id"] in path_ids,
                      goal=node["state"] == list(puzzle.goal))
                 for node in budget.tree_nodes]
        return dict(nodes=nodes, total_generated=budget.tree_total,
                    truncated=budget.tree_total > len(nodes), limit=300,
                    pass_limit=budget.tree_pass if algorithm == "ids" else None)

    options = dict(puzzle=puzzle, budget=budget)
    if algorithm == "astar":
        options["heuristic"] = manhattan if heuristic_name == "manhattan" else euclidean
    elif algorithm == "dfs":
        options["depth_limit"] = depth_limit
    elif algorithm == "ids":
        options["max_depth"] = depth_limit
    try:
        out = ALGORITHMS[algorithm](state, **options)
    except SearchLimit as exc:
        return dict(base, status="limited", message=f"{exc.reason}. Try A*, a shallower shuffle, or a smaller board.",
                    nodes_expanded=exc.expanded, search_depth=exc.depth, running_time=exc.elapsed, tree=tree_data())
    if out is None:
        message = "No solution found." if depth_limit is None else "No solution within the depth limit. Increase it or try A*."
        return dict(base, status="not_found", message=message,
                    nodes_expanded=budget.expanded, search_depth=budget.depth,
                    running_time=time.perf_counter() - budget.started, tree=tree_data())
    path = out.getPath()
    states = [[tile for row in board for tile in row] for board in out.getPathTrace()]
    heuristic = manhattan if heuristic_name == "manhattan" else euclidean
    trace = [dict(state=list(board), h=round(heuristic(board), 3))
             for board in out.expanded_states]
    return dict(base, status="solved", tree=tree_data(states), path=path, states=states, cost=out.getCost(),
                nodes_expanded=budget.expanded, search_depth=budget.depth,
                running_time=out.getTime(), expansions=trace,
                trace_truncated=False,
                trace_scope="Search order across all depth passes" if algorithm == "ids" else "Search order",
                path_heuristics=[round(heuristic(s), 3) for s in states])
