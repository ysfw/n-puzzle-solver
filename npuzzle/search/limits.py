import time

class SearchLimit(Exception):
    def __init__(self, reason, budget):
        super().__init__(reason)
        self.reason = reason
        self.expanded = budget.expanded
        self.depth = budget.depth
        self.elapsed = time.perf_counter() - budget.started


class SearchBudget:
    def __init__(self, seconds=3.0, max_nodes=100000):
        self.started = time.perf_counter()
        self.seconds = seconds
        self.max_nodes = max_nodes
        self.expanded = 0
        self.depth = 0
        self.tree_nodes = []
        self.tree_total = 0
        self.tree_pass = None

    def start_tree(self, state, pass_limit=None):
        self.tree_nodes = []
        self.tree_total = 0
        self.tree_pass = pass_limit
        return self.discover(state, None, None, 0)

    def discover(self, state, parent_id, move, cost):
        self.tree_total += 1
        if len(self.tree_nodes) >= 300:
            return None
        node_id = len(self.tree_nodes)
        self.tree_nodes.append(dict(id=node_id, parent=parent_id,
                                    state=list(state), move=move, g=cost,
                                    expanded=False, order=None))
        return node_id

    def mark_expanded(self, node_id):
        if node_id is not None:
            self.tree_nodes[node_id]["expanded"] = True
            self.tree_nodes[node_id]["order"] = self.expanded

    def visit(self, depth):
        if self.expanded >= self.max_nodes:
            raise SearchLimit("Node limit reached", self)
        if time.perf_counter() - self.started >= self.seconds:
            raise SearchLimit("Time limit reached", self)
        self.expanded += 1
        self.depth = max(self.depth, depth)
