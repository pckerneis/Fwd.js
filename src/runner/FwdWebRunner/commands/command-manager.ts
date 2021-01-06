import { Observable, Subject } from 'rxjs';

export interface Command<T = any> {
  id: string,
  payload: T;
}

export type CommandFactory<T> = (payload: T) => Command<T>;

export interface CommandPerformer<T = any> {
  canPerform(command: Command<T>): boolean;

  perform(command: Command<T>): void;

  undo(command: Command<T>): void;

  redo(command: Command<T>): void;
}

export type CommandPerformerFactory<T = any> = () => CommandPerformer<T>;

export type CommandAndPerformer<T = any> = {
  command: Command<T>;
  performer: CommandPerformer<T>;
}

class CommandManager {
  public readonly historyChanged$: Observable<void>;

  private readonly _historyChanged$: Subject<void>;
  private _undoStack: CommandAndPerformer[] = [];
  private _redoStack: CommandAndPerformer[] = [];
  private _performerFactories: CommandPerformerFactory[] = [];

  constructor() {
    this._historyChanged$ = new Subject<void>();
    this.historyChanged$ = this._historyChanged$.asObservable();
  }

  public canUndo(): boolean {
    return this._undoStack.length > 0;
  }

  public canRedo(): boolean {
    return this._redoStack.length > 0;
  }

  public perform(command: Command): boolean {
    this._redoStack = [];

    for (let factory of this._performerFactories) {
      const performer = factory();
      if (performer.canPerform(command)) {
        performer.perform(command);
        this._undoStack.push({command, performer});
        this.clearRedoStack();
        this._historyChanged$.next();
        return true;
      }
    }

    throw new Error('No handler found for command ' + command.id);
  }

  public undo(): void {
    if (! this.canUndo()) {
      return;
    }

    const {command, performer} = this._undoStack.pop()!;
    performer.undo(command);
    this._redoStack.push({command, performer});
    this._historyChanged$.next();
  }

  public redo(): void {
    if (! this.canRedo()) {
      return;
    }

    const {command, performer} = this._redoStack.pop()!;
    performer.redo(command);
    this._undoStack.push({command, performer});
    this._historyChanged$.next();
  }

  public addPerformerFactory(performerFactory: CommandPerformerFactory): void {
    this._performerFactories.push(performerFactory);
  }

  public clearHistory(): void {
    this.clearRedoStack();
    this.clearUndoStack();
    this._historyChanged$.next();
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
