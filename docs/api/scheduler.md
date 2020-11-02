# Scheduler API

## Schedule an action

To schedule a single function, one can call the method ```schedule``` which takes as arguments a time position, and the function to be called.
The third and optional argument is a boolean indicating whether this action can be cancelled or not when the program gets stopped.

```javascript
fwd.scheduler.schedule(time, action, preventCancel)
```

When the program is ran, the action gets called just before the clock reaches the desired time position.

```javascript
fwd.scheduler.schedule(1.0, () => console.log(fwd.scheduler.clock()));
// > 0.9537750000017695
```

## Implicit timing

The scheduler uses the concept of implicit timing. That is, when we schedule an action, this action will 'remember'
the time it was scheduled at, and it will make it available through ```fwd.scheduler.now()```.

One can also use ```scheduleAhead(t, action)``` as a shortcut to ```schedule(scheduler.now() + t, action)```.

```javascript
console.log(fwd.scheduler.now());             // > 0

fwd.scheduler.schedule(1.0, () => {
  console.log(fwd.scheduler.now());           // > 1

  fwd.scheduler.scheduleAhead(1.0, () => {
    console.log(fwd.scheduler.now());         // > 2
  });

  console.log(fwd.scheduler.now());           // > 1
})

console.log(fwd.scheduler.now());             // > 0
```

## clock() vs. now()

There are two ways to ask about time when using the scheduler.
- The function ```clock``` returns the time elapsed since the program start in seconds.
- The function ```now``` allows to access the implicit time position.

Because there's no way to get precise timing in Javascript, Fwd uses a timing system where you target some time position.
The scheduler will trigger the call some time before the time position gets reached.

```javascript
fwd.scheduler.schedule(1.0, () => {
  console.log(fwd.scheduler.now());
  // > 1

  console.log(fwd.scheduler.clock());
  // > 0.9537750000017695
});
```

This allows benefiting from precise timing for time critical operations such as audio manipulation. The ```fwd.audio```
module makes indeed extensive use of ```scheduler.now``` to schedule actions with a precise timing in the audio domain.  

## Action chains

When we need to trigger subsequent actions, we can define event chains with ```scheduler.fire``` or ```scheduler.wait```.
Calling one of these methods returns a ```FwdChain``` object which in turn exposes ```fire``` and ```wait``` methods so that
these can be chained in a single statement.

```javascript
fwd.scheduler
  .fire(() => console.log("Hello!"))
  .wait(1.0)
  .fire(() => console.log("Goodbye!"));
```

This code creates a chain of three events. 
The first event fires a function call (which prints ```Hello!``` in the console).
The second event delays the next event by ```1.0``` second.
The third event fires another function call.

Let's take a closer look to these ```fire``` and ```wait``` functions.

### fire

The function ```fire``` can be called on the scheduler to create a new chain, or on an existing chain.
It takes at least one argument which is the function to be called or [an alias for it](#named-actions). The other arguments, which are optional,
are arguments to pass to the method call.

```javascript
fire(action, ...args)
```

When called on the ```scheduler``` instance, it returns a new event chain with a single event in it.
When called on an existing ```chain```, it appends the event to the chain and returns the chain.

### wait

The function ```wait``` accepts a duration in seconds, or a function returning a duration.
All events following a wait event in a chain will be delayed by the specified duration.

```javascript
wait(time)
// Or
wait(() => time)
```
### Trigger a chain

Defining a chain won't trigger any function call unless you call ```trigger``` on the chain object.

```javascript
const chain = fwd.scheduler
  .fire(() => console.log("Hello!"))
  .wait(1.0)
  .fire(() => console.log("Goodbye!"));

chain.trigger();
```

The method ```trigger``` accepts a time value (which defaults to ```0```) for the offset to the current implicit time position.
For example, these two lines will produce the same effect :

```javascript
fwd.scheduler.fire(() => console.log("Hello!")).trigger(1.0);

fwd.scheduler.schedule(fwd.scheduler.now() + 1.0, () => console.log("Hello!"));
```

## Named actions

You can define reusable actions with ```scheduler.defineAction``` and giving them aliases. These aliases can be used in
```fire``` calls.

```javascript
fwd.scheduler.set("greetings", (who) => console.log(`Hello, ${who}!`));
fwd.scheduler.fire("greetings", "World").trigger();
// > "Hello, World!"
```

This simple mechanism comes very handy in live-coding situations as it allows you to store actions and replace them on the fly.
