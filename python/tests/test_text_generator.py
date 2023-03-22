import io
import contextlib
import unittest

from text_generator import convertSplootToText
from convert_ast import splootFromPython 



class TextGeneratorTest(unittest.TestCase):
  def testHelloWorld(self):
    original = "print('Hello, World!')"
    sploot = splootFromPython(original)
    result = convertSplootToText(sploot)
    self.assertEqual(result, original)

  def testFunctionWithDecorator(self):
    original = "@app.route('/hello')\ndef hello():\n    print('Hello, World!')"
    sploot = splootFromPython(original)
    result = convertSplootToText(sploot)
    self.assertEqual(result, original)

  def testComments(self):
    original = "# Something is going on here!\nprint('Hello, World!')"
    sploot = splootFromPython(original)
    result = convertSplootToText(sploot)
    self.assertEqual(result, original)

  def testLineGaps(self):
    original = "# Something is going on here!\n##SPLOOTCODEEMPTYLINE\nprint('Hello, World!')\n##SPLOOTCODEEMPTYLINE\n##SPLOOTCODEEMPTYLINE"
    expected = "# Something is going on here!\n\nprint('Hello, World!')\n\n"
    sploot = splootFromPython(original)
    result = convertSplootToText(sploot)
    self.assertEqual(result, expected)

