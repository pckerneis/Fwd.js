fwd.onStart = () => {
};

const htmlElement = document.createElement('div');
htmlElement.style.width = '100px';
htmlElement.style.height = '100px';
htmlElement.style.background = 'blue';

const gridElement = fwd.editor.root.get('grid') || fwd.editor.root.add('grid', {
  htmlElement
});

gridElement.htmlElement.style.background = 'yellow';

