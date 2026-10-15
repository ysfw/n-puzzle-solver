from collections import deque
import time

from ..output import Output
from ..puzzle import puzzle_for
from math import isqrt


def bfs(init_state: tuple, *, puzzle=None, budget=None) -> Output:
    puzzle = puzzle or puzzle_for(isqrt(len(init_state)))
    start_time = time.perf_counter()
    start_h = puzzle.zobrist(init_state)
    blank_pos = init_state.index(0)

    root_id = budget.start_tree(init_state) if budget is not None else None

    parent = {}
    depths = []
    expanded_nodes = []

    queue = deque()
    # (state, cur_h, blank_pos, cost, depth, tree_node_id).
    queue.append((init_state, start_h, blank_pos, 0, 0, root_id))

    visited = {start_h}

    while queue:
        curr = queue.popleft()
        curr_state, curr_h, curr_blank_pos, curr_cost, curr_depth, node_id = curr

        if budget is not None:
            budget.visit(curr_depth)
            budget.mark_expanded(node_id)
        depths.append(curr_depth)
        expanded_nodes.append(curr_state)

        if(curr_h == puzzle.goal_h):
            elapsed_time = time.perf_counter() - start_time
            return Output(curr_cost, depths, expanded_nodes, parent, elapsed_time, init_state, puzzle.goal_h)

        x, y = divmod(curr_blank_pos, puzzle.N)
        candidates = puzzle.get_candidates(x,y,curr_blank_pos)

        for tile_pos, move in candidates:
            new_h = puzzle.zobrist_move(curr_h, curr_blank_pos, tile_pos, curr_state[tile_pos])

            if new_h not in visited:
                child = list(curr_state)
                child[curr_blank_pos], child[tile_pos] = child[tile_pos], child[curr_blank_pos]
                child = tuple(child)

                visited.add(new_h)
                parent[new_h] = (curr_h, move)

                child_id = budget.discover(child, node_id, move, curr_cost + 1) if budget is not None else None
                queue.append((child,new_h,tile_pos,curr_cost+1,curr_depth+1,child_id))

    return None
