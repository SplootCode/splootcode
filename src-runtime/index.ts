import { initialize } from '@splootcode/runtime-python'

// @ts-ignore
import WorkerURL from './webworker?worker&url'

initialize(import.meta.env.SPLOOT_EDITOR_DOMAIN, WorkerURL)
