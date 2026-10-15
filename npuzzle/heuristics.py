from math import hypot, isqrt


def manhattan(state: tuple) -> int:
    size = isqrt(len(state))
    distance = 0
    for i, tile in enumerate(state):
        if tile == 0:
            continue
        x, y = divmod(i, size)
        gx, gy = divmod(tile, size)
        distance += abs(x - gx) + abs(y - gy)
    return distance


def euclidean(state: tuple) -> float:
    size = isqrt(len(state))
    distance = 0.0
    for i, tile in enumerate(state):
        if tile == 0:
            continue
        x, y = divmod(i, size)
        gx, gy = divmod(tile, size)
        distance += hypot(x - gx, y - gy)
    return distance
