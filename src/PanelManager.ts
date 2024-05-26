import type { ExtensionContext, TaskExecution, Uri } from "vscode";
import { commands, workspace } from "vscode";
import * as EventEmitter from "eventemitter2";

import { BrowserClient } from "./BrowserClient";
import { getConfig, getConfigs } from "./Config";
import { Panel } from "./Panel";
import Terminal from "./terminal";
import type { ExtensionConfiguration } from "./ExtensionConfiguration";
import { traceError, traceLog, traceVerbose } from "./log/logging";
import { checkVersion, getInterpreterDetails, initializePython, resolveInterpreter, runPythonExtensionCommand } from "./python";
import { sep } from "path";

export class PanelManager extends EventEmitter.EventEmitter2 {
  public panels: Set<Panel>;
  public current: Panel | undefined;
  public browser: BrowserClient;
  public config: ExtensionConfiguration;
  private _terminal: Terminal;
  private _runningTask: TaskExecution | undefined;
  private restartInProgress = false;
  private restartQueued = false;

  constructor(public readonly ctx: ExtensionContext) {
    super();
    this.panels = new Set();
    this.config = getConfigs(this.ctx);

    this.on("windowOpenRequested", (params) => {
      this.create(params.url);
    });
  }

  private async refreshSettings() {
    const prev = this.config;

    this.config = {
      ...getConfigs(this.ctx),
      debugPort: prev.debugPort,
    };
  }

  async terminal(): Promise<Terminal> {
    if (this._terminal === undefined) {
      const pythonInterpreter = (await getInterpreterDetails()).path?.at(0);
      if(!pythonInterpreter) throw "pythonInterpreter is not found!"
    
      const sqlmeshPath = pythonInterpreter.split(sep).slice(0, -1).concat(['sqlmesh']).join(sep)
    
      this._terminal = new Terminal("SQLMeshUI", "sqlmesh ui");
    }
    return this._terminal;
  }
  set runningTask(task: TaskExecution | undefined) {
    this._runningTask = task;
  }

  get runningTask(): TaskExecution | undefined {
    return this._runningTask;
  }

  public async create() {
    this.refreshSettings();
    // runPythonExtensionCommand('sqlmeshui.uiserver')
    const startUrl = 'http://'.concat(this.config.localServerHost, ':', this.config.localServerPort.toString())

    if (!this.browser) this.browser = new BrowserClient(this.config, this.ctx);

    const panel = new Panel(this.config, this.browser);

    panel.once("disposed", () => {
      if (this.current === panel) {
        this.current = undefined;
        commands.executeCommand("setContext", "sqlmeshui-active", false);
      }
      this.panels.delete(panel);
      if (this.panels.size === 0) {
        this.browser.dispose();
        this.browser = null;
      }

      this.emit("windowDisposed", panel);
    });

    panel.on("windowOpenRequested", (params) => {
      this.emit("windowOpenRequested", params);
    });

    panel.on("focus", () => {
      this.current = panel;
      commands.executeCommand("setContext", "sqlmeshui-active", true);
    });

    panel.on("blur", () => {
      if (this.current === panel) {
        this.current = undefined;
        commands.executeCommand("setContext", "sqlmeshui-active", false);
      }
    });

    this.panels.add(panel);

    await panel.launch(startUrl.toString());

    this.emit("windowCreated", panel);

    this.ctx.subscriptions.push({
      dispose: () => panel.dispose(),
    });

    return panel;
  }

  public async createFile(filepath: string) {
    if (!filepath) return;

    const panel = await this.create(`file://${filepath}`);
    if (getConfig("sqlmeshui.localFileAutoReload")) {
      panel.disposables.push(
        workspace
          .createFileSystemWatcher(filepath, true, false, false)
          .onDidChange(() => {
            // TODO: check filename
            panel.reload();
          })
      );
    }
    return panel;
  }

  public disposeByUrl(url: string) {
    this.panels.forEach((b: Panel) => {
      if (b.config.startUrl === url) b.dispose();
    });
  }
}
