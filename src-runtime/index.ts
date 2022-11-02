import { initialize } from '@splootcode/runtime-python'

import '@splootcode/runtime-python/styles.css'

// @ts-ignore
import WorkerURL from './webworker?worker&url'

initialize(import.meta.env.SPLOOT_EDITOR_DOMAIN, WorkerURL)
