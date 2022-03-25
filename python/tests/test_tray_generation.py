import unittest

from generate_tray import generate_sploot_node_docs


class TrayGenerationTests(unittest.TestCase):

    def testSplootNodeAbstracts(self):
        sploot_nodes = generate_sploot_node_docs()

        missing_abstract = []
    
        for key, node in sploot_nodes.items():
            if 'abstract' not in node or node['abstract'].strip() == '':
                missing_abstract.append(key)
        self.assertEqual(len(missing_abstract), 0, f'{len(missing_abstract)}/{len(sploot_nodes)} nodes missing abstracts: f{missing_abstract}')

    def testSplootNodeExamples(self):
        sploot_nodes = generate_sploot_node_docs()

        missing_examples = []
        for key, node in sploot_nodes.items():
            if 'examples' not in node or len(node['examples']) == 0:
                missing_examples.append(key)

        self.assertEqual(len(missing_examples), 0, f'{len(missing_examples)}/{len(sploot_nodes)} nodes missing examples: f{missing_examples}')
