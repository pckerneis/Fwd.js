import { clamp } from '../../../fwd/utils/numbers';
import { injectStyle } from '../StyleInjector';

export interface MenuInfo {
  readonly menu: ContextualMenu;
  readonly option: MenuOption;
  readonly eventThatFiredMenu: MouseEvent;
}

export interface MenuOption {
  label: string;
  action?: (infos: MenuInfo) => void;
  disabled?: boolean;
}

export class ContextualMenu {
  private readonly backdropElement: HTMLDivElement;
  private readonly menuElement: HTMLDivElement;

  private _options: MenuOption[];
  private _eventThatFiredMenu: MouseEvent;

  constructor(options: MenuOption[]) {
    this.backdropElement = document.createElement('div');
    this.backdropElement.classList.add('fwd-context-menu-backdrop');
    this.backdropElement.onmousedown = () => this.hide();

    this.menuElement = document.createElement('div');
    this.menuElement.classList.add('fwd-context-menu');

    this.backdropElement.append(this.menuElement);
    document.body.append(this.backdropElement);

    window.addEventListener('blur', () => this.hide());

    this.options = options;
  }

  public get options(): MenuOption[] {
    return this._options;
  }

  public set options(newOptions: MenuOption[]) {
    this.buildOptions(newOptions);
    this._options = newOptions;
  }

  public show(event: MouseEvent): void {
    this.backdropElement.style.display = 'block';

    const menuHeight = this.menuElement.getBoundingClientRect().height;
    const menuWidth = this.menuElement.getBoundingClientRect().width;

    const left = clamp(event.pageX, 0, document.body.clientWidth - menuWidth);
    const top = clamp(event.pageY, 0, document.body.clientHeight - menuHeight);
    this.menuElement.style.left = left + 'px';
    this.menuElement.style.top = top + 'px';
    event.preventDefault();

    this._eventThatFiredMenu = event;
  }

  public hide(): void {
    this.backdropElement.style.display = 'none';
  }

  private buildOptions(newOptions: MenuOption[]): void {
    this.menuElement.innerHTML = '';

    newOptions.forEach((option) => {
      const e = document.createElement('div');
      e.classList.add('fwd-context-menu-option');
      e.innerText = option.label;
      e.onmousedown = (evt) => evt.stopPropagation();
      e.onclick = () => this.optionSelected(option, {
        menu: this,
        option: option,
        eventThatFiredMenu: this._eventThatFiredMenu,
      });
      this.menuElement.append(e);
    });
  }

  private optionSelected(option: MenuOption, infos: MenuInfo): void {
    if (typeof option.action === 'function') {
      option.action(infos);
    }
    this.hide();
  }
}

injectStyle('ContextualMenu', `
.fwd-context-menu-backdrop {
  position: absolute;
  display: none;
  top: 0;
  bottom: 0;
  left: 0;
  right: 0;
  overflow: hidden;
}

.fwd-context-menu {
  position: absolute;
  min-width: 200px;
  max-width: 300px;
  max-height: 60%;
  flex-direction: column;
  background: white;
  border: 1px solid lightgray;
  padding: 3px 0;
  box-shadow: 3px 3px 3px 0 #00000055;
  user-select: none;
  font-size: 13px;
}

.fwd-context-menu-option {
  padding: 2px 12px;
}

.fwd-context-menu-option:hover {
  background-color: lightgray;
}
`);
