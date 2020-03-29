
const injectedStyles: { [key: string]: string } =  {};

const preloadStyle: string[] = [];

let dynamicStyleContainer: HTMLStyleElement;

let documentLoaded = false;

export function injectStyle(id: string, css: string) {
  if (injectedStyles[id] == null) {
    if(documentLoaded) {
      doInject(css);
    } else {
      preloadStyle.push(css);
    }
    injectedStyles[id] = css;
  }
}

function doInject(css: string) {
  if (dynamicStyleContainer == null) {
    dynamicStyleContainer = document.createElement('style');
    document.body.append(dynamicStyleContainer);
  }

  dynamicStyleContainer.innerHTML += css;

  console.log('did inject')
}

document.addEventListener('DOMContentLoaded', () => {
  preloadStyle.forEach(doInject);
});