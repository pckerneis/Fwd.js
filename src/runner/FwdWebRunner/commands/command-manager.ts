export interface Command<T = any> {
  id: string,
  payload: T;
}

export type CommandFactory<T> = (payload: T) => Command<T>;

export interface CommandPerformer<T = any> {
  perform(command: Command<T>): void;

  undo(command: Command<T>): void;

  canPerform(command: Command<T>): boolean;
}

class CommandManager {
  private _undoStack: Command[] = [];
  private _redoStack: Command[] = [];
  private _performers: CommandPerformer[] = [];

  constructor() {
  }

  public canUndo(): boolean {
    return this._undoStack.length > 0;
  }

  public canRedo(): boolean {
    return this._redoStack.length > 0;
  }

  public perform(command: Command): boolean {
    this._redoStack = [];

    for (let performer of this._performers) {
      if (performer.canPerform(command)) {
        performer.perform(command);
        this._undoStack.push(command);
        return true;
      }
    }

    throw new Error('No handler for command ' + command.id);
  }

  public undo(): boolean {
    if (! this.canUndo()) {
      return;
    }

    const commandToUndo = this._undoStack.pop();

    for (let performer of this._performers) {
      if (performer.canPerform(commandToUndo)) {
        performer.undo(commandToUndo);
        this._redoStack.push(commandToUndo);
        return true;
      }
    }

    throw new Error('No handler for command ' + commandToUndo.id);
  }

  public redo(): boolean {
    if (! this.canRedo()) {
      return;
    }

    const commandToRedo = this._redoStack.pop();

    for (let performer of this._performers) {
      if (performer.canPerform(commandToRedo)) {
        performer.perform(commandToRedo);
        this._undoStack.push(commandToRedo);
        return true;
      }
    }

    throw new Error('No handler for command ' + commandToRedo.id);

  }

  public addPerformer(performer: CommandPerformer): void {
    this._performers.push(performer);
  }

  public clearHistory(): void {
    this.clearRedoStack();
    this.clearUndoStack();
  }

  private clearUndoStack(): void {
    this._undoStack = [];
  }

  private clearRedoStack(): void {
    this._redoStack = [];
  }
}

export const commandManager = new CommandManager();
window['commandManager'] = commandManager;
