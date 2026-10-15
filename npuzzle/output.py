from math import sqrt


class Output:
    def __init__(self, cost: int, depths: list, expanded_states: list, parent: dict, time : float, init_state: tuple, goal: int):
        self.cost = cost
        self.depths = depths
        self.expanded_states = expanded_states
        self.time = time
        self.parent = parent
        self.init_state = init_state
        self.board_size = len(init_state)
        self.N = round(sqrt(self.board_size))
        self.goal = goal
        
    def getPath(self) -> list:
        path = []
        cur = self.goal
        while cur in self.parent:
            cur, move = self.parent[cur]
            path.append(move)
        path.reverse()
        return path
    
    def getCost(self) -> int:
        return self.cost
    
    def __copy(self, state: list):
        mat = []
        for i in range(0, self.board_size, self.N):
            row = []
            for j in range(self.N):
                row.append(state[i + j])
            mat.append(row)
        return mat
    
    def getExpansionTrace(self) -> list:
            boards = []
            for state in self.expanded_states:
                boards.append(self.__copy(state))
            return boards
    
    def getPathTrace(self) -> list:
        states = [self.__copy(self.init_state)]
        blank_pos = self.init_state.index(0)
        state = list(self.init_state)
        for move in self.getPath():
            tile_pos = blank_pos
            if move == "up":
                tile_pos = blank_pos - self.N
            elif move == "down":
                tile_pos = blank_pos + self.N
            elif move == "left":
                tile_pos = blank_pos - 1
            elif move == "right":
                tile_pos = blank_pos + 1
            state[blank_pos], state[tile_pos] = state[tile_pos], state[blank_pos]
            states.append(self.__copy(state))
            blank_pos = tile_pos
        return states
    
    def getDepth(self) -> int:
        return max(self.depths)
    
    def getTime(self) -> float:
        return self.time
