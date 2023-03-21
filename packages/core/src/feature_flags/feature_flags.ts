export const ENABLE_DEPLOYMENTS_FLAG = 'ENABLE_DEPLOYMENTS'
export const ENABLE_HTTP_APPS_FLAG = 'ENABLE_HTTP_APPS_FLAG'
export const ENABLE_STREAMLIT_APPS_FLAG = 'ENABLE_STREAMLIT_APPS_FLAG'

const supportedFlags = new Map<string, boolean>([
  [ENABLE_DEPLOYMENTS_FLAG, true],
  [ENABLE_HTTP_APPS_FLAG, false],
  [ENABLE_STREAMLIT_APPS_FLAG, false],
])

/*
To enable:

localStorage.setItem('SPLOOT_FEATURE_FLAGS', JSON.stringify({'ENABLE_HTTP_APPS_FLAG': true, 'ENABLE_STREAMLIT_APPS_FLAG': true}))
*/

export function loadFeatureFlags(): Map<string, boolean> {
  const flags = new Map(supportedFlags.entries())
  const serializedFlags = localStorage.getItem('SPLOOT_FEATURE_FLAGS')
  if (serializedFlags) {
    const obj = JSON.parse(serializedFlags) as Record<string, boolean>
    for (const key of Object.keys(obj)) {
      // Skip any flags that we don't use anymore.
      if (flags.has(key)) {
        flags.set(key, obj[key])
      }
    }
  }
  return flags
}
