import { initialize } from '@splootcode/runtime-python'

import RuntimeWorker from './webworker?worker'

initialize(import.meta.env.SPLOOT_EDITOR_DOMAIN, RuntimeWorker)
