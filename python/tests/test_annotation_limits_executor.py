import io
import contextlib
import unittest
import ast

from executor import executePythonFile, wrapStdout, getStatementsFromBlock
from convert_ast import splootFromPython

TIC_TAC_TOE_CODE = """
winning_combos = [[0, 1, 2], [3, 4, 5], [6, 7, 8], [0, 3, 6], [1, 4, 7], [2, 5, 8], [0, 4, 8], [2, 4, 6]]


def get_opposite_symbol(symbol):
    if symbol == 'X':
        return 'O'
    return 'X'

def check_winner(board):
    for combo in winning_combos:
        symbol0 = board[combo[0]]
        symbol1 = board[combo[1]]
        symbol2 = board[combo[2]]
        if (symbol0 == symbol1 and symbol0 == symbol2) and symbol0 != ' ':
            return True
    return False

def get_free_squares(board):
    free_squares = []
    for (index, current_square) in enumerate(board):
        if current_square == ' ':
            free_squares.append(index)
    return free_squares

def best_outcome_for_symbol(symbol, possible_outcomes):
    if symbol in possible_outcomes:
        return symbol
    if 'T' in possible_outcomes:
        return 'T'
    return get_opposite_symbol(symbol)

def get_move_outcomes(symbol, board):
    free_squares = get_free_squares(board)
    if len(free_squares) == 0:
        return 'T'
    results = []
    for square in free_squares:
        board[square] = symbol
        if check_winner(board):
            results.append(symbol)
        else:
            results.append(get_move_outcomes(get_opposite_symbol(symbol), board))
        board[square] = ' '
    return best_outcome_for_symbol(symbol, results)

board = [' ', ' ', ' ', ' ', ' ', ' ', ' ', ' ', ' ']
print(board)
print(get_move_outcomes('X', board))
"""


SIMPLE_TEST_FUNCTION = """
def get_opposite_symbol(symbol):
    if symbol == 'X':
        return 'O'
    return 'X'
"""

SIMPLE_TEST_FUNCTION_GENERATED_CODE  = """def get_opposite_symbol(symbol):
    t = __spt__.func(None)
    with t:
        if t.cap:
            if __spt__.logExpressionResultAndStartFrame('PYTHON_IF_STATEMENT', 'condition', symbol == 'X'):
                __spt__.startChildSet('trueblock')
                return __spt__.logExpressionResult('PYTHON_RETURN', {}, 'O')
            __spt__.endFrame()
            return __spt__.logExpressionResult('PYTHON_RETURN', {}, 'X')
        else:
            if symbol == 'X':
                return 'O'
            return 'X'"""

RECURSIVE_FUNCTION_WITH_ERROR = """
def recurse(num):
    if num == 200:
        print(200)
        print('Hello' + 4)
    recurse(num + 1)

recurse(0)
"""

class ExecuteTest(unittest.TestCase):
    def testTicTacToeRecursion(self):
        splootFile = splootFromPython(TIC_TAC_TOE_CODE)

        f = io.StringIO()
        f.write = wrapStdout(f.write)
        with contextlib.redirect_stdout(f):
            cap, _ = executePythonFile(splootFile)

        whole_capture = str(cap)
        self.assertTrue(len(whole_capture) > 0) # Make sure there's something captured.
        self.assertTrue(len(whole_capture) < 500_000) # Keep the capture below 500kb

        self.assertEqual(f.getvalue(), """[' ', ' ', ' ', ' ', ' ', ' ', ' ', ' ', ' ']\nT\n""")

    def testGeneratedCode(self):
        splootFile = splootFromPython(SIMPLE_TEST_FUNCTION)

        statements = getStatementsFromBlock(splootFile["childSets"]["body"], True)
        mods = ast.Module(body=statements, type_ignores=[])
        text_code = ast.unparse(ast.fix_missing_locations(mods))

        self.assertEqual(text_code, SIMPLE_TEST_FUNCTION_GENERATED_CODE)
    
    def testRrrorDuringRecursion(self):
        splootFile = splootFromPython(RECURSIVE_FUNCTION_WITH_ERROR)
       
        f = io.StringIO()
        f.write = wrapStdout(f.write)
        with contextlib.redirect_stdout(f):
            cap, _ = executePythonFile(splootFile)

        whole_capture = str(cap)
        self.assertEqual(list(cap.keys()), ['root', 'detached', 'lastException'])
        self.assertEqual(cap['lastException']['type'], 'TypeError')
        self.assertEqual(cap['lastException']['message'], 'can only concatenate str (not "int") to str')
        self.assertEqual(cap['lastException']['frameno'], 200)
        self.assertEqual(cap['lastException']['lineno'], 4)

        self.assertEqual(f.getvalue(), """200\n""")
