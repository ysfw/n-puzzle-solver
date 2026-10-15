import time
from math import isqrt
from ..puzzle import puzzle_for
from .dfs import dfs


def ids(init_state: tuple, max_depth=None, *, puzzle=None, budget=None):
    puzzle = puzzle or puzzle_for(isqrt(len(init_state)))
    if max_depth is None:
        max_depth = puzzle.board_size - 1
    started = time.perf_counter()
    trace = {"states": [], "depths": []}
    for limit in range(max_depth + 1):
        out = dfs(init_state, limit, puzzle=puzzle, budget=budget, _trace=trace)
        if out is not None:
            out.expanded_states = trace["states"] + out.expanded_states
            out.depths = trace["depths"] + out.depths
            out.time = time.perf_counter() - started
            return out
    return None
