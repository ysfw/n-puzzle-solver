def printBoardTrace(board_trace: list):
    for board in board_trace:
        for row in board:
            print(" ".join(list(map(str, row))))
        print("==================")
