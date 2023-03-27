import requestsPackageURL from '../python/packages/requests-2.28.1-py3-none-any.whl'
import { initialize } from '@splootcode/runtime-python/autocomplete_worker'

const staticURLs = {
  requestsPackageURL: requestsPackageURL,
}

initialize(staticURLs, import.meta.env.SPLOOT_TYPESHED_PATH)
