export interface ExtensionConfiguration {
  chromeExecutable?: string
  extensionPath: string
  format: 'jpeg' | 'png'
  isVerboseMode: boolean
  startUrl: string
  pythonInterpreter: string[]
  localServerHost: string
  localServerPort: number
  localServerMode: 'ide' | 'default' | 'docs' | 'plan'
  columnNumber: number
  quality: number
  everyNthFrame: number
  isDebug?: boolean
  debugHost: string
  debugPort: number
  storeUserData: boolean
  proxy: string
  otherArgs: string
}
