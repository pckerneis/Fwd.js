# Writing your first program

We'll write a basic program where we'll show a button. When this button is clicked, a 440Hz sine tone will be played for 1 second.
Here is the code for that.

```javascript
// Create a GUI manager to help us create UI elements
const gui = fwd.gui.getGuiManager(fwd.editor.scene);

// Define a button with a callback that is triggered whenever the button is clicked
gui.addTextButton('Test', () => {    
    // Create an sine oscillator with a frequency of 440
    const osc = fwd.audio.osc(440);
    
    // Set its gain to a reasonable value
    osc.gain.value = 0.4;
    
    // Schedule a function to be called in 1.0 second
    fwd.scheduler.schedule(fwd.scheduler.clock() + 1.0, () => {
        // Stop the oscillator
        osc.tearDown();
    });
});
```

Type this code in the runner's editor and press play. A button should appear in the right-side of the screen.
Clicking it should trigger a beep.

A lot of things where involved in this tiny snippet so let's break it down.

The first thing to notice is that we use a variable called ```fwd``` that we haven't defined anywhere. This variable is in
fact provided by the runner as a global variable. It's the main entry point for the whole Fwd API in a browser environment.

This ```fwd``` variable points to an object that holds methods and modules. The first module we use is ```fwd.gui``` which allows
to easily create UI elements such as buttons, sliders and text boxes. 

We first need to create a GUI manager for a particular location on the web page. Here we choose the root of the scene.

```javascript
const gui = fwd.gui.getGuiManager(fwd.editor.scene);
```

We can call ```addTextButton``` on the newly created GUI manager. This method accepts a text to be rendered
inside the button and a callback that will be executed at each button click.

```javascript
gui.addTextButton('Test', () => { /* clicked */ });
```
Inside the callback, we use another Fwd module which is ```fwd.audio```. We use its method ```osc``` to create a sin oscillator
that we connect to the master output. We give this oscillator a gain value (otherwise it'd stay silent).

```javascript
const osc = fwd.audio.osc(440);
osc.connectToMaster();
osc.gain.value = 0.4;
```
The next instruction involves the ```fwd.scheduler``` module. This module is used when you need some function
to be called in the future. To get the current time position, we can call ```fwd.scheduler.clock```.

```javascript
fwd.scheduler.schedule(this.scheduler.clock() + 1.0, () => { /* action */ });
```

Here, we just call ```osc.tearDown``` to stop the oscillator one second in the future.
