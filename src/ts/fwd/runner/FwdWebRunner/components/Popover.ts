import { injectStyle } from '../StyleInjector';

function isInViewport(element: HTMLElement) {
  const rect = element.getBoundingClientRect();
  const html = document.documentElement;
  return rect.top >= 0 &&
    rect.left >= 0 &&
    rect.bottom <= (window.innerHeight || html.clientHeight) &&
    rect.right <= (window.innerWidth || html.clientWidth);
}

type PopoverPosition = 'top' | 'left' | 'right' | 'bottom';

export class Popover {

  public onclose: Function;

  private readonly popover: HTMLDivElement;

  private readonly className = 'popover';

  constructor(private _sourceElement?: HTMLElement, 
      public readonly position: PopoverPosition = 'top') {
    this.popover = document.createElement('div');
    this.popover.style.position = 'fixed';
    this.popover.classList.add(this.className);
  }

  get sourceElement(): HTMLElement { return this._sourceElement; }

  set sourceElement(source: HTMLElement) {
    this._sourceElement = source;

    if (this.isVisible) {
      this.show();
    }
  }

  get isVisible() {
    return !!document.body && document.body.contains(this.popover);
  }

  show() {
    if (this.sourceElement == null) {
      return;
    }

    this.popover.addEventListener('click', this.handleDocumentEvent);
    document.addEventListener('click', this.handleDocumentEvent);
    window.addEventListener('scroll', this.handleWindowEvent);
    window.addEventListener('resize', this.handleWindowEvent);

    document.body.appendChild(this.popover);

    const { top: triggerTop, left: triggerLeft } = this.sourceElement.getBoundingClientRect();
    const { offsetHeight: triggerHeight, offsetWidth: triggerWidth } = this.sourceElement;
    const { offsetHeight: popoverHeight, offsetWidth: popoverWidth } = this.popover;

    const orderedPositions = ['top', 'right', 'bottom', 'left'];
    const positionIndex = orderedPositions.indexOf(this.position);

    const positions = {
      top: {
        name: 'top',
        top: triggerTop - popoverHeight,
        left: triggerLeft - ((popoverWidth - triggerWidth) / 2)
      },
      right: {
        name: 'right',
        top: triggerTop - ((popoverHeight - triggerHeight) / 2),
        left: triggerLeft + triggerWidth
      },
      bottom: {
        name: 'bottom',
        top: triggerTop + triggerHeight,
        left: triggerLeft - ((popoverWidth - triggerWidth) / 2)
      },
      left: {
        name: 'left',
        top: triggerTop - ((popoverHeight - triggerHeight) / 2),
        left: triggerLeft - popoverWidth
      }
    };

    const position = orderedPositions
      .slice(positionIndex)
      .concat(orderedPositions.slice(0, positionIndex))
      .map(pos => positions[pos])
      .find(pos => {
        this.popover.style.top = `${pos.top}px`;
        this.popover.style.left = `${pos.left}px`;
        return isInViewport(this.popover);
      });

    if (! position) {
      this.popover.style.top = positions.bottom.top + 'px';
      this.popover.style.left = positions.bottom.left + 'px';
    }
  }

  hide() {
    this.popover.remove();

    this.popover.removeEventListener('click', this.handleDocumentEvent);
    document.removeEventListener('click', this.handleDocumentEvent);
    window.removeEventListener('scroll', this.handleWindowEvent);
    window.removeEventListener('resize', this.handleWindowEvent);

    if (this.onclose != null) {
      this.onclose();
    }
  }

  toggle() {
    if (this.isVisible) {
      this.hide();
    } else {
      this.show();
    }
  }

  setInnerHTML(html: string) {
    this.popover.innerHTML = html;

    if (this.isVisible) {
      this.show();
    }
  }

  private handleWindowEvent = (evt: MouseEvent) => {
    if (this.isVisible) {
      this.show();
    }
  };

  private handleDocumentEvent = (evt: MouseEvent) => {
    if (this.isVisible && evt.target !== this.sourceElement && evt.target !== this.popover) {
      this.hide();
    }

    if (evt.target === this.popover) {
      evt.preventDefault();
      evt.stopPropagation();
    }
  }
}

injectStyle('Popover', `
.popover-container {
  margin: 300px;
}

.popover {
  padding: 8px;
  border: 1px solid $border-color;
  border-radius: 4px;
  background: white;
  box-shadow: 0 1px 4px rgba(0,0,0,.2);
}
`);