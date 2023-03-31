import { initialize } from '@splootcode/runtime-python/worker'
import { staticPythonURLs } from './static_urls'

initialize(staticPythonURLs, import.meta.env.SPLOOT_TYPESHED_PATH)
