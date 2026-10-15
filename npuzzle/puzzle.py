from functools import lru_cache
from math import isqrt
from random import Random


class Puzzle:
    def __init__(self, size=3):
        self.N = size
        self.board_size = size ** 2
        self.goal = tuple(range(self.board_size))
        rng = Random(42)
        self.Z = tuple(tuple(rng.getrandbits(64) for _ in self.goal) for _ in self.goal)
        self.goal_h = self.zobrist(self.goal)

    def zobrist(self, state):
        h = 0
        for pos, tile in enumerate(state):
            h ^= self.Z[pos][tile]
        return h

    def zobrist_move(self, h, blank_pos, tile_pos, tile):
        z = self.Z
        return h ^ z[blank_pos][0] ^ z[tile_pos][tile] ^ z[blank_pos][tile] ^ z[tile_pos][0]

    def get_candidates(self, x, y, blank_pos):
        candidates = []
        if x > 0:
            candidates.append((blank_pos - self.N, "up"))
        if x < self.N - 1:
            candidates.append((blank_pos + self.N, "down"))
        if y > 0:
            candidates.append((blank_pos - 1, "left"))
        if y < self.N - 1:
            candidates.append((blank_pos + 1, "right"))
        return candidates


@lru_cache(maxsize=8)
def puzzle_for(size):
    return Puzzle(size)


def validate_state(state):
    if not isinstance(state, (list, tuple)) or not all(type(t) is int for t in state):
        raise ValueError("Use whole numbers for every tile, with 0 for the blank.")
    size = isqrt(len(state))
    if not 2 <= size <= 5 or size * size != len(state):
        raise ValueError("Choose a square board from 2 × 2 to 5 × 5.")
    if sorted(state) != list(range(size * size)):
        raise ValueError(f"Use each number from 0 to {size * size - 1} exactly once.")
    return tuple(state), puzzle_for(size)


def is_solvable(state):
    """Parity against the assignment goal, whose blank is at TOP left."""
    size = isqrt(len(state))
    tiles = [t for t in state if t]
    inversions = sum(a > b for i, a in enumerate(tiles) for b in tiles[i + 1:])
    if size % 2:
        return inversions % 2 == 0
    blank_row_from_bottom = size - state.index(0) // size
    return (inversions + blank_row_from_bottom) % 2 == size % 2


