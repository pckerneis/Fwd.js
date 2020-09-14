interface CreateElementOptions {
  style?: Partial<CSSStyleDeclaration>;
}

export function createDomElement<K extends keyof HTMLElementTagNameMap>(
  type: K,
  options?: CreateElementOptions & Partial<{ [O in keyof HTMLElementTagNameMap[K]]: any } & { classList?: [] }>)
  : HTMLElementTagNameMap[K] {
  const element = document.createElement(type);

  if (! options) {
    return element;
  }

  Object.keys(options)
    .forEach((key) => {
      if (key === 'style') {
        Object.keys(options.style).forEach((key) => {
          element.style[key] = options.style[key];
        });
      } else if (key === 'classList') {
        options.classList.forEach((cssClass: string) => element.classList.add(cssClass));
      } else {
        element[key] = options[key];
      }
    });

  return element;
}
