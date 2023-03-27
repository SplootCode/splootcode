import { initialize } from '@splootcode/runtime-python/worker'

import executorURL from '../python/executor.py'
import flaskPackageURL from '../python/packages/Flask-2.2.3-py3-none-any.whl'
import moduleLoaderURL from '../python/module_loader.py'
import requestsPackageURL from '../python/packages/requests-2.28.1-py3-none-any.whl'
import serverlessWSGIPackageURL from '../python/packages/serverless_wsgi-3.0.2-py2.py3-none-any.whl'
import textGeneratorURL from '../python/text_generator.py'

const staticURLs = {
  executorURL: executorURL,
  moduleLoaderURL: moduleLoaderURL,
  requestsPackageURL: requestsPackageURL,
  flaskPackageURL: flaskPackageURL,
  serverlessWSGIPackageURL: serverlessWSGIPackageURL,
  textGeneratorURL: textGeneratorURL,
}

initialize(staticURLs, import.meta.env.SPLOOT_TYPESHED_PATH)
