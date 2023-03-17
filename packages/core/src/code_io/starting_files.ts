import { SerializedNode } from '../language/type_registry'

export const startingPythonFile: SerializedNode = {
  type: 'PYTHON_FILE',
  properties: {},
  childSets: { body: [] },
}

export const startingPythonFileHTTP: SerializedNode = {
  type: 'PYTHON_FILE',
  properties: {},
  childSets: {
    body: [
      {
        type: 'PYTHON_STATEMENT',
        properties: {},
        childSets: {
          statement: [
            {
              type: 'PYTHON_IMPORT',
              properties: {},
              childSets: {
                modules: [
                  {
                    type: 'PYTHON_MODULE_IDENTIFIER',
                    properties: {
                      identifier: 'flask',
                    },
                    childSets: {},
                  },
                ],
              },
            },
          ],
        },
      },
      {
        type: 'PYTHON_STATEMENT',
        properties: {},
        childSets: {
          statement: [],
        },
      },
      {
        type: 'PYTHON_STATEMENT',
        properties: {},
        childSets: {
          statement: [
            {
              type: 'PYTHON_ASSIGNMENT',
              properties: {},
              childSets: {
                left: [
                  {
                    type: 'PY_IDENTIFIER',
                    properties: {
                      identifier: 'app',
                    },
                    childSets: {},
                  },
                ],
                right: [
                  {
                    type: 'PYTHON_EXPRESSION',
                    properties: {},
                    childSets: {
                      tokens: [
                        {
                          type: 'PYTHON_CALL_MEMBER',
                          properties: {
                            member: 'Flask',
                          },
                          childSets: {
                            object: [
                              {
                                type: 'PY_IDENTIFIER',
                                properties: {
                                  identifier: 'flask',
                                },
                                childSets: {},
                              },
                            ],
                            arguments: [
                              {
                                type: 'PY_ARG',
                                properties: {},
                                childSets: {
                                  argument: [
                                    {
                                      type: 'PYTHON_EXPRESSION',
                                      properties: {},
                                      childSets: {
                                        tokens: [
                                          {
                                            type: 'PY_IDENTIFIER',
                                            properties: {
                                              identifier: '__name__',
                                            },
                                            childSets: {},
                                          },
                                        ],
                                      },
                                    },
                                  ],
                                },
                              },
                            ],
                          },
                          meta: {
                            params: [''],
                          },
                        },
                      ],
                    },
                  },
                ],
              },
            },
          ],
        },
      },
      {
        type: 'PYTHON_STATEMENT',
        properties: {},
        childSets: {
          statement: [],
        },
      },
      {
        type: 'PYTHON_STATEMENT',
        properties: {},
        childSets: {
          statement: [
            {
              type: 'PYTHON_FUNCTION_DECLARATION',
              properties: {
                id: '4d5ej',
              },
              childSets: {
                decorators: [
                  {
                    type: 'PY_DECORATOR',
                    properties: {},
                    childSets: {
                      expression: [
                        {
                          type: 'PYTHON_EXPRESSION',
                          properties: {},
                          childSets: {
                            tokens: [
                              {
                                type: 'PYTHON_CALL_MEMBER',
                                properties: {
                                  member: 'get',
                                },
                                childSets: {
                                  object: [
                                    {
                                      type: 'PY_IDENTIFIER',
                                      properties: {
                                        identifier: 'app',
                                      },
                                      childSets: {},
                                    },
                                  ],
                                  arguments: [
                                    {
                                      type: 'PY_ARG',
                                      properties: {},
                                      childSets: {
                                        argument: [
                                          {
                                            type: 'PYTHON_EXPRESSION',
                                            properties: {},
                                            childSets: {
                                              tokens: [
                                                {
                                                  type: 'STRING_LITERAL',
                                                  properties: {
                                                    value: '/',
                                                  },
                                                  childSets: {},
                                                },
                                              ],
                                            },
                                          },
                                        ],
                                      },
                                    },
                                  ],
                                },
                                meta: {
                                  params: [''],
                                },
                              },
                            ],
                          },
                        },
                      ],
                    },
                  },
                ],
                identifier: [
                  {
                    type: 'PY_IDENTIFIER',
                    properties: {
                      identifier: 'home',
                    },
                    childSets: {},
                  },
                ],
                params: [],
                body: [
                  {
                    type: 'PYTHON_STATEMENT',
                    properties: {},
                    childSets: {
                      statement: [
                        {
                          type: 'PYTHON_RETURN',
                          properties: {},
                          childSets: {
                            value: [
                              {
                                type: 'PYTHON_EXPRESSION',
                                properties: {},
                                childSets: {
                                  tokens: [
                                    {
                                      type: 'PYTHON_CALL_MEMBER',
                                      properties: {
                                        member: 'jsonify',
                                      },
                                      childSets: {
                                        object: [
                                          {
                                            type: 'PY_IDENTIFIER',
                                            properties: {
                                              identifier: 'flask',
                                            },
                                            childSets: {},
                                          },
                                        ],
                                        arguments: [
                                          {
                                            type: 'PY_ARG',
                                            properties: {},
                                            childSets: {
                                              argument: [
                                                {
                                                  type: 'PYTHON_EXPRESSION',
                                                  properties: {},
                                                  childSets: {
                                                    tokens: [
                                                      {
                                                        type: 'PY_DICT',
                                                        properties: {},
                                                        childSets: {
                                                          elements: [
                                                            {
                                                              type: 'PY_KEYVALUE',
                                                              properties: {},
                                                              childSets: {
                                                                key: [
                                                                  {
                                                                    type: 'PYTHON_EXPRESSION',
                                                                    properties: {},
                                                                    childSets: {
                                                                      tokens: [
                                                                        {
                                                                          type: 'STRING_LITERAL',
                                                                          properties: {
                                                                            value: 'success',
                                                                          },
                                                                          childSets: {},
                                                                        },
                                                                      ],
                                                                    },
                                                                  },
                                                                ],
                                                                value: [
                                                                  {
                                                                    type: 'PYTHON_EXPRESSION',
                                                                    properties: {},
                                                                    childSets: {
                                                                      tokens: [
                                                                        {
                                                                          type: 'PYTHON_BOOL',
                                                                          properties: {
                                                                            value: 'True',
                                                                          },
                                                                          childSets: {},
                                                                        },
                                                                      ],
                                                                    },
                                                                  },
                                                                ],
                                                              },
                                                            },
                                                          ],
                                                        },
                                                      },
                                                    ],
                                                  },
                                                },
                                              ],
                                            },
                                          },
                                        ],
                                      },
                                      meta: {
                                        params: [''],
                                      },
                                    },
                                  ],
                                },
                              },
                            ],
                          },
                        },
                      ],
                    },
                  },
                ],
              },
            },
          ],
        },
      },
    ],
  },
}
