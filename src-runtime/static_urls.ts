import executorURL from '../python/executor.py'
import moduleLoaderURL from '../python/module_loader.py'
import pyarrowPackageURL from '../python/packages/stlite_pyarrow-0.1.0-py3-none-any.whl'
import requestsPackageURL from '../python/packages/requests-2.28.2-py3-none-any.whl'
import streamlitPackageURL from '../python/packages/streamlit-1.19.0-py2.py3-none-any.whl'

import textGeneratorURL from '../python/text_generator.py'
import { StaticURLs } from '@splootcode/runtime-python'

export const staticPythonURLs: StaticURLs = {
  executorURL: executorURL,
  moduleLoaderURL: moduleLoaderURL,

  textGeneratorURL: textGeneratorURL,
  requestsPackageURL: requestsPackageURL,
  streamlitPackageURL: streamlitPackageURL,
  pyarrowPackageURL: pyarrowPackageURL,
}
