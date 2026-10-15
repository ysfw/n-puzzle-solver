from heapq import heappush, heappop
import time

from ..output import Output
from ..puzzle import puzzle_for
from math import isqrt
from ..heuristics import manhattan


def astar(init_state: tuple, heuristic=manhattan, *, puzzle=None, budget=None) -> Output:
    puzzle = puzzle or puzzle_for(isqrt(len(init_state)))
    start_time = time.perf_counter()
    start_h = puzzle.zobrist(init_state)
    blank_pos = init_state.index(0)

    root_id = budget.start_tree(init_state) if budget is not None else None

    parent = {}
    depths = []
    expanded_nodes = []
    queue = []

    # the lowest cost discovered so far for this node
    g_score = {start_h: 0}

    # (f, state, cur_h, blank_pos, cost, depth, tree_node_id).
    heappush(queue, (heuristic(init_state), init_state, start_h, blank_pos, 0, 0, root_id))

    while queue:
        curr = heappop(queue)
        f, curr_state, curr_h, curr_blank_pos, curr_cost, curr_depth, node_id = curr

        if curr_cost > g_score[curr_h]:
            continue

        if budget is not None:
            budget.visit(curr_depth)
            budget.mark_expanded(node_id)
        depths.append(curr_depth)
        expanded_nodes.append(curr_state)

        if curr_h == puzzle.goal_h:
            elapsed_time = time.perf_counter() - start_time
            return Output(curr_cost, depths, expanded_nodes, parent,
                          elapsed_time, init_state, puzzle.goal_h)

        x, y = divmod(curr_blank_pos, puzzle.N)
        candidates = puzzle.get_candidates(x, y, curr_blank_pos)

        for tile_pos, move in candidates:
            new_h = puzzle.zobrist_move(curr_h, curr_blank_pos, tile_pos, curr_state[tile_pos])
            new_cost = curr_cost + 1

            if new_cost < g_score.get(new_h, float("inf")):
                g_score[new_h] = new_cost

                child = list(curr_state)
                child[curr_blank_pos], child[tile_pos] = (child[tile_pos], child[curr_blank_pos])
                child = tuple(child)

                parent[new_h] = (curr_h, move)

                f = new_cost + heuristic(child)
                child_id = budget.discover(child, node_id, move, new_cost) if budget is not None else None
                heappush(queue, (f, child, new_h, tile_pos, new_cost, curr_depth + 1, child_id))

    return None
