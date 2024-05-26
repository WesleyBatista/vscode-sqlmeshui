import { createServer } from 'http'
import type { ExtensionContext } from 'vscode'
import { workspace } from 'vscode'
import type { ExtensionConfiguration } from './ExtensionConfiguration'

export function getConfig<T>(key: string, v?: T) {
  return workspace.getConfiguration().get(key, v)
}

export function isDarkTheme() {
  const theme = getConfig('workbench.colorTheme', '').toLowerCase()

  // must be dark
  if (theme.match(/dark|black/i) != null)
    return true

  // must be light
  if (theme.match(/light/i) != null)
    return false

  // IDK, maybe dark
  return true
}

function isPortFree(port: number) {
  return new Promise((resolve) => {
    const server = createServer()
      .listen(port, () => {
        server.close()
        resolve(true)
      })
      .on('error', () => {
        resolve(false)
      })
  })
}
export function timeout(ms: number) {
  return new Promise(resolve => setTimeout(resolve, ms))
}

export async function tryPort(start = 4000): Promise<number> {
  if (await isPortFree(start))
    return start
  return tryPort(start + 1)
}

export function getConfigs(ctx: ExtensionContext): ExtensionConfiguration {
  return {
    extensionPath: ctx.extensionPath,
    columnNumber: 2,
    isDebug: false,
    quality: getConfig('sqlmeshui.quality', 100),
    everyNthFrame: getConfig('sqlmeshui.everyNthFrame', 1),
    format: getConfig('sqlmeshui.format', 'png'),
    isVerboseMode: getConfig('sqlmeshui.verbose', false),
    chromeExecutable: getConfig('sqlmeshui.chromeExecutable'),
    startUrl: getConfig('sqlmeshui.startUrl', 'https://github.com/wesleybatista/vscode-sqlmeshui'),
    localServerHost: getConfig('sqlmeshui.localServerHost'),
    localServerPort: getConfig('sqlmeshui.localServerPort'),
    localServerMode: getConfig('sqlmeshui.localServerMode'),
    debugHost: getConfig('sqlmeshui.debugHost', 'localhost'),
    debugPort: getConfig('sqlmeshui.debugPort', 9222),
    storeUserData: getConfig('sqlmeshui.storeUserData', true),
    proxy: getConfig('sqlmeshui.proxy', ''),
    otherArgs: getConfig('sqlmeshui.otherArgs', ''),
  }
}
