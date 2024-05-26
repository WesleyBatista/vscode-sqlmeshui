import type { ChildProcess, SpawnOptions } from 'child_process'
import { spawn } from 'child_process'
// import * as vscode from 'vscode';
import type { OutputChannel, ProgressOptions, Terminal as VSTerminal } from 'vscode'
import { ProgressLocation, window } from 'vscode'
// import { GlobalState } from './constants';
// import { ExtensionContainer } from './container';

interface CommandResponse {
  stdout: string
  stderr: string
}

export default class Terminal {
  private name: string
  private terminal: VSTerminal | undefined
  private command: string
  private proc: ChildProcess | undefined
  private channel: OutputChannel | undefined

  constructor(name: string, command: string) {
    this.name = name
    this.terminal = window.createTerminal({ name })
    window.onDidCloseTerminal((e) => {
      if (e.name === this.name)
        this.terminal = undefined
    })
    this.command = command
  }

  public setCommandPath(commandPath: string): void {
    this.command = commandPath
  }

  public runCommand(args: string[], { forceTerminal = false } = {}): void {
    if (forceTerminal) {
      // if (ExtensionContainer.config.general.useTerminalForBuild || forceTerminal) {
      if (!this.terminal)
        this.terminal = window.createTerminal({ name: this.name })

      const activeTerminal = window.activeTerminal
      // Only call show if we arent the active terminal
      if (!activeTerminal || activeTerminal.name !== this.terminal.name)
        this.terminal.show()

      this.clear()
      this.terminal.sendText(`${this.command} ${args.join(' ')}`)
    }
    else {
      this.runCommandInOutput(args)
    }
  }

  public executeCommand(command: string): void {
    if (!this.terminal)
      this.terminal = window.createTerminal({ name: this.name })

    const activeTerminal = window.activeTerminal
    // Only call show if we arent the active terminal
    if (!activeTerminal || activeTerminal.name !== this.terminal.name)
      this.terminal.show()

    this.clear()
    this.terminal.sendText(command)
  }

  public async runCommandInBackground(args: string[], progressOptions: ProgressOptions = { location: ProgressLocation.Window }, spawnOptions: SpawnOptions = { shell: true }): Promise<unknown> {
    return window.withProgress(progressOptions, () => {
      return new Promise<void>((resolve, reject) => {
        if (!this.channel)
          this.channel = window.createOutputChannel(this.name)

        this.channel.clear()
        this.channel.append(`${this.command} ${args.join(' ')}\n\n`)
        const proc = spawn(this.command, args, spawnOptions)

        proc.stdout?.on('data', (data) => {
          const message = data.toString()
          this.channel?.append(message)
        })
        proc.stderr?.on('data', (data) => {
          const message = data.toString()
          this.channel?.append(message)
        })

        proc.on('close', (code) => {
          if (code) {
            const msg = 'Failed to create the application, please check the output.'
            window.showErrorMessage(msg)
            this.channel?.show()
            return reject(new Error(msg))
          }
          return resolve()
        })
      })
    })
  }

  // TODO: refactor this and the above command
  public runInBackground(command: string, args: string[], spawnOptions: SpawnOptions = { shell: true }): Promise<CommandResponse> {
    return new Promise((resolve, reject) => {
      const proc = spawn(command, args, spawnOptions)
      let stdout = ''
      let stderr = ''

      proc.stdout?.on('data', (data) => {
        stdout += data.toString()
      })

      proc.stderr?.on('data', (data) => {
        stderr += data.toString()
      })

      proc.on('close', (code) => {
        if (code)
          return reject(new Error(code.toString()))

        return resolve({
          stdout,
          stderr,
        })
      })
    })
  }

  public runCommandInOutput(args: string[], cwd?: string): ChildProcess | undefined {
    if (this.proc) {
      window.showInformationMessage('A build is already in progress')
      return
    }
    if (!this.channel)
      this.channel = window.createOutputChannel(this.name)

    args.push('--no-prompt')
    this.channel.clear()
    this.channel.append(`${this.command} ${args.join(' ')}\n\n`)
    this.proc = spawn(this.command, args, { shell: true, cwd })
    this.proc.stdout?.on('data', (data) => {
      console.log('data')
      // ExtensionContainer.context.globalState.update(GlobalState.Running, true);
      // commands.executeCommand('setContext', GlobalState.Running, true);
      // const message = data.toString();
      // this.channel?.append(message);
    })
    this.proc.stderr?.on('data', (data) => {
      const message = data.toString()
      this.channel?.append(message)
    })
    this.proc.on('close', () => {
      this.proc = undefined
    })
    this.proc.on('exit', () => {
      console.log('exit')
      // ExtensionContainer.context.globalState.update(GlobalState.Running, false);
      // commands.executeCommand('setContext', GlobalState.Running, false);
      // this.proc = undefined;
    })

    this.channel.show()
    return this.proc
  }

  public clear(): void {
    if (this.terminal)
      this.terminal.sendText('clear')
  }

  public stop(): void {
    if (this.proc) {
      this.proc.kill()
      this.proc = undefined
    }
  }

  public showOutput(): void {
    if (this.channel)
      this.channel.show()
  }
}
