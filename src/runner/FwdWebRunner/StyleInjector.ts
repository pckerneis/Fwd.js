type StyleMap = { [key: string]: string };

// TODO make these static (double module inclusion because of webpack bundle vs. rollup lib
const injectedStyles: StyleMap =  {};
const preloadStyle: StyleMap = {};

let dynamicStyleContainer: HTMLStyleElement;

let documentLoaded = document.readyState === "complete"
    || document.readyState === "interactive"
    // @ts-ignore
    || document.readyState === "loaded";

export function injectStyle(id: string, css: string): void {
  if (injectedStyles[id] == null) {
    if(documentLoaded) {
      doInject(id, css);
    } else {
      preloadStyle[id] = css;
    }

    injectedStyles[id] = css;
  }
}

function doInject(id: string, css: string): void {
  if (dynamicStyleContainer == null) {
    dynamicStyleContainer = document.createElement('style');
    document.body.append(dynamicStyleContainer);
  }

  dynamicStyleContainer.innerHTML += (`/* ${id} */\n`);
  dynamicStyleContainer.innerHTML += css;
}

document.addEventListener('DOMContentLoaded', () => {
  Object.keys(preloadStyle).forEach((key) => doInject(key, preloadStyle[key]));
});
