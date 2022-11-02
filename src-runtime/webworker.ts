import { initialize } from '@splootcode/runtime-python/worker'

import executorURL from '../python/executor.py'
import moduleLoaderURL from '../python/module_loader.py'
import requestsPackageURL from '../python/packages/requests-2.28.1-py3-none-any.whl'

const staticURLs = {
  executorURL: executorURL,
  moduleLoaderURL: moduleLoaderURL,
  requestsPackageURL: requestsPackageURL,
}

initialize(staticURLs)
