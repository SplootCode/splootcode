import { initialize } from '@splootcode/runtime-python'

import AutocompleteWorker from './autocomplete_webworker?worker'
import RuntimeWorker from './runtime_webworker?worker'

initialize(import.meta.env.SPLOOT_EDITOR_DOMAIN, RuntimeWorker, AutocompleteWorker)
