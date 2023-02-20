import ast
import sys
import json
import traceback

from splootlib import generateExecutableCode

SPLOOT_KEY = "__spt__"
iterationLimit = None


class CaptureContext:
    def __init__(self, type, childset):
        self.type = type
        self.blocks = {childset: []}
        self.childset = childset

    def startChildSet(self, childset):
        self.childset = childset
        if childset not in self.blocks:
            self.blocks[childset] = []

    def addStatementResult(self, type, data, sideEffects):
        res = {"data": data}
        if type:
            res["type"] = type
        if sideEffects:
            res["sideEffects"] = sideEffects
        self.blocks[self.childset].append(res)

    def addExceptionResult(self, exceptionType, message):
        self.blocks[self.childset].append(
            {
                "type": "EXCEPTION",
                "exceptionType": exceptionType,
                "exceptionMessage": message,
            }
        )

    def checkFrameLimit(self):
        if iterationLimit and len(self.blocks[self.childset]) > iterationLimit:
            raise Exception('Too many iterations.')

    def toDict(self):
        return {
            "type": self.type,
            "data": self.blocks,
        }


class SplootCapture:
    def __init__(self):
        self.root = CaptureContext("PYTHON_FILE", "body")
        self.stack = [self.root]
        self.detachedFrames = {}
        self.sideEffects = []

    def logExpressionResultAndStartFrame(self, nodetype, childset, result):
        self.startFrame(nodetype, childset)
        self.logExpressionResult(None, {}, result)
        return result

    def logExpressionResultAndEndFrames(self, nodetype, frameType, result):
        self.logExpressionResult(nodetype, {}, result)
        while frameType != self.stack[-1].type:
            self.endFrame()
        self.endFrame()
        return result

    def startDetachedFrame(self, type, childset, id):
        frame = CaptureContext(type, childset)
        self.detachedFrames.setdefault(id, [])
        self.detachedFrames[id].append(frame)
        self.stack.append(frame)

    def startFrame(self, type, childset):
        frame = CaptureContext(type, childset)
        self.stack[-1].checkFrameLimit()
        self.stack[-1].addStatementResult(frame.type, frame.blocks, [])
        self.stack.append(frame)

    def startChildSet(self, childset):
        self.stack[-1].startChildSet(childset)

    def endFrame(self):
        frame = self.stack.pop()

    def endLoop(self):
        while len(self.stack) != 0:
            frame = self.stack[-1]
            if frame.type == 'PYTHON_FOR_LOOP' or frame.type == 'PYTHON_WHILE_LOOP':
                break
            self.stack.pop()

    def logSideEffect(self, data):
        self.sideEffects.append(data)

    def logExpressionResult(self, nodetype, data, result):
        data["result"] = str(result)
        data["resultType"] = type(result).__name__
        self.stack[-1].addStatementResult(nodetype, data, self.sideEffects)
        self.sideEffects = []
        return result

    def logException(self, exceptionType, message):
        self.stack[-1].addExceptionResult(exceptionType, message)

    def toDict(self):
        cap = {"root": self.root.toDict(), "detached": {}}
        for id in self.detachedFrames:
            cap['detached'][id] = [context.toDict() for context in self.detachedFrames[id]]
        return cap


capture = None


def executePythonFile(tree):
    global capture
    if tree["type"] == "PYTHON_FILE":
        code = generateExecutableCode(tree, 'main.py')
        # Uncomment to print generated Python code
        # print(ast.unparse(ast.fix_missing_locations(mods)))
        # print()
        capture = SplootCapture()
        try:
            exec(code, {SPLOOT_KEY: capture, '__name__': '__main__'})
        except EOFError as e:
            # This is because we don't have inputs in a rerun.
            capture.logException(type(e).__name__, str(e))
        except BaseException as e:
            capture.logException(type(e).__name__, str(e))
            traceback.print_exc()

        return capture.toDict()


def wrapStdout(write):
    def f(s):
        if capture:
            capture.logSideEffect({"type": "stdout", "value": str(s)})
        write(s)
    return f

if __name__ == "__main__":
    import fakeprint  # pylint: disable=import-error
    import nodetree  # pylint: disable=import-error
    import runtime_capture # pylint: disable=import-error

    # Only wrap stdin/stdout once.
    # Horrifying hack.
    try:
        wrapStdin
    except NameError:
        def wrapStdin(readline):
            def f():
                runtime_capture.report(json.dumps(capture.toDict()))
                return readline()
            return f

        fakeprint.stdout.write = wrapStdout(fakeprint.stdout.write)
        fakeprint.stdin.readline = wrapStdin(fakeprint.stdin.readline)

    sys.stdout = fakeprint.stdout
    sys.stderr = fakeprint.stdout
    sys.stdin = fakeprint.stdin

    tree = nodetree.getNodeTree()  # pylint: disable=undefined-variable
    iterationLimit = nodetree.getIterationLimit()
    cap = executePythonFile(tree)
    if cap:
        runtime_capture.report(json.dumps(cap))
