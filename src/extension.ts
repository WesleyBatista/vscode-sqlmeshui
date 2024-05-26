import type { ExtensionContext, Uri } from 'vscode'
import { commands, debug, window } from 'vscode'
import { join, sep } from 'path'

import { DebugProvider } from './DebugProvider'
import { PanelManager } from './PanelManager'
import { registerLogger, traceError, traceLog, traceVerbose } from './log/logging'
import { checkVersion, getInterpreterDetails, initializePython, resolveInterpreter, runPythonExtensionCommand } from './python'
import { getConfig, getConfigs } from './Config'
import Terminal from './terminal'

let restartInProgress = false;
let restartQueued = false;

const sleep = (ms: number) => new Promise((r) => setTimeout(r, ms));

function replacePathLastPart(path, newPart) {
  const parts = path.split('/');
  parts[parts.length - 1] = newPart;
  return parts.join('/');
}


export async function activate(ctx: ExtensionContext): Promise<void> {
  const manager = new PanelManager(ctx)
  const debugProvider = new DebugProvider(manager)
  registerLogger(window.createOutputChannel("SQLMesh UI", { log: true }))
  loadPythonExtension(ctx)
  let terminal: Terminal | null = null;

  ctx.subscriptions.push(

    debug.registerDebugConfigurationProvider(
      'sqlmeshui',
      debugProvider.getProvider(),
    ),

    commands.registerCommand('sqlmeshui.open', async (url?: string | Uri) => {
      const configs = getConfigs(ctx)
      const pythonInterpreter = (await getInterpreterDetails()).path?.at(0);
      if(!pythonInterpreter) throw "pythonInterpreter is not found!"
      const sqlmeshPath = replacePathLastPart(pythonInterpreter, 'sqlmesh')
      traceLog(sqlmeshPath)
    
      const cmd = [
        "ui",
        "--host",
        configs.localServerHost,
        "--port",
        configs.localServerPort.toString(),
        "--mode",
        configs.localServerMode,
      ]
      traceLog(cmd)
    
      // terminal = new Terminal("SQLMesh UI", sqlmeshPath)
      // await terminal?.runCommandInBackground(cmd)
      // await sleep(3)
      await manager.create()
    }),

    commands.registerCommand('sqlmeshui.controls.refresh', () => {
      manager.current?.reload()
    }),

    commands.registerCommand('sqlmeshui.controls.external', () => {
      manager.current?.openExternal(true)
    }),

    // commands.registerCommand('sqlmeshui.controls.debug', async () => {
    //   const panel = await manager.current?.createDebugPanel()
    //   panel?.show()
    // }),

  )

  // try {
  //   // https://code.visualstudio.com/updates/v1_53#_external-uri-opener
  //   // @ts-expect-error proposed API
  //   ctx.subscriptions.push(window.registerExternalUriOpener?.(
  //     'sqlmeshui.opener',
  //     {
  //       canOpenExternalUri: () => 2,
  //       openExternalUri(resolveUri: Uri) {
  //         manager.create(resolveUri)
  //       },
  //     },
  //     {
  //       schemes: ['http', 'https'],
  //       label: 'Open URL using Browse Lite',
  //     },
  //   ))
  // }
  // catch {}
}

async function runServer () {
  if (restartInProgress) {
    if (!restartQueued) {
      // Schedule a new restart after the current restart.
      traceLog(
        `Triggered restart while restart is in progress; queuing a restart.`,
      );
      restartQueued = true;
    }
    return;
  }

  restartInProgress = true;


    const interpreter = getConfig("sqlmeshui.pythonInterpreter", []);
    if (
      interpreter &&
      interpreter.length > 0 &&
      checkVersion(await resolveInterpreter(interpreter))
    ) {
      traceVerbose(
        `Using interpreter from {serverInfo.module}.interpreter: ${interpreter.join(" ")}`,
      );
      // Restart!!!
      // lsClient = await restartServer(serverId, serverName, outputChannel, lsClient);

      restartInProgress = false;
      if (restartQueued) {
        restartQueued = false;
        await runServer();
      }

      return;
    }

    const interpreterDetails = await getInterpreterDetails();
    if (interpreterDetails.path) {
      traceLog(
        `Using interpreter from Python extension: ${interpreterDetails.path.join(" ")}`,
      );
      // Restart!!!
      // lsClient = await restartServer(serverId, serverName, outputChannel, lsClient);

      restartInProgress = false;
      if (restartQueued) {
        restartQueued = false;
        await runServer();
      }

      return;
    }
  

    restartInProgress = false;

  // updateStatus(
  //   vscode.l10n.t("Please select a Python interpreter."),
  //   vscode.LanguageStatusSeverity.Error,
  // );
  traceError(
    "Python interpreter missing:\r\n" +
      "[Option 1] Select Python interpreter using the ms-python.python.\r\n" +
      `[Option 2] Set an interpreter using "sqlmeshui.pythonInterpreter" setting.\r\n` +
      "Please use Python 3.10 or greater.",
  );
};


async function loadPythonExtension(ctx: ExtensionContext){
  const interpreter = getConfig("sqlmeshui.pythonInterpreter", []);
  if (interpreter === undefined || interpreter.length === 0) {
    traceLog(`Python extension loading`);
    await initializePython(ctx.subscriptions);
    const details = await getInterpreterDetails();
    traceLog(details);
    traceLog(`Python extension loaded`);
  } else {
    await runServer();
  }
}