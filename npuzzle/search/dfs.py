import time

from ..output import Output
from ..puzzle import puzzle_for
from math import isqrt


def dfs(init_state: tuple, depth_limit=None, *, puzzle=None, budget=None, _trace=None) -> Output:
    puzzle = puzzle or puzzle_for(isqrt(len(init_state)))
    if depth_limit is None:
        depth_limit = puzzle.board_size
    start_time = time.perf_counter()
    start_h = puzzle.zobrist(init_state)
    # ("do"/"undo", cost, h, depth, blank_bos, tile_pos, parent_h, move_name)
    # root: blank_pos == tile_pos, so its "swap" does nothing
    blank_pos = init_state.index(0)
    root_id = budget.start_tree(init_state, depth_limit) if budget is not None else None
    stack = [("do", 0, start_h, 0, blank_pos, blank_pos, None, None, root_id)]
    explored = {}
    expanded_nodes = []
    
    parent = {}
    depths = []
    
    state = list(init_state)
    while stack:
        entry = stack.pop()
        if entry[0] == "undo":
            _, blank_pos, tile_pos = entry
            state[blank_pos], state[tile_pos] = state[tile_pos], state[blank_pos]

        elif entry[0] == "do":
            _, cost, cur_h, depth, blank_pos, tile_pos, par_h, move, node_id = entry
            
            if explored.get(cur_h, float("inf")) <= depth:
                continue
            
            stack.append(("undo", blank_pos, tile_pos))
            state[blank_pos], state[tile_pos] = state[tile_pos], state[blank_pos]
            blank_pos = tile_pos
            
            if par_h:
                parent[cur_h] = (par_h, move)
                
            if budget is not None:
                budget.visit(depth)
                budget.mark_expanded(node_id)
            depths.append(depth)
            explored[cur_h] = depth
            expanded_nodes.append(tuple(state))
            if cur_h == puzzle.goal_h:
                elapsed_time = time.perf_counter() - start_time
                return Output(cost, depths, expanded_nodes, parent, elapsed_time, init_state, puzzle.goal_h)
            
            if depth >= depth_limit:
                continue
            
            x, y = divmod(blank_pos, puzzle.N)
            candidates = puzzle.get_candidates(x,y,blank_pos)

            for tile_pos, name in candidates:
                new_h = puzzle.zobrist_move(cur_h, blank_pos, tile_pos, state[tile_pos])
                if new_h not in explored:
                    child_id = None
                    if budget is not None:
                        child = list(state)
                        child[blank_pos], child[tile_pos] = child[tile_pos], child[blank_pos]
                        child_id = budget.discover(child, node_id, name, cost + 1)
                    stack.append(("do", cost + 1, new_h, depth + 1,
                                blank_pos, tile_pos, cur_h, name, child_id))
    if _trace is not None:
        _trace["states"].extend(expanded_nodes)
        _trace["depths"].extend(depths)
    return None
