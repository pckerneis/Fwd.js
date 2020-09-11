// Schedule a single event
fwd.scheduler.schedule(1.0, () => console.log('a. ' + fwd.scheduler.clock()));
// > a. 0.9537750000017695

// Implicit timing
fwd.scheduler.schedule(1.0, () => {
  console.log('b. ' + fwd.scheduler.now());
  // > b. 1

  fwd.scheduler.scheduleAhead(1.0, () => {
    console.log('c. ' + fwd.scheduler.now());
    // > c. 2
  });
});

// clock() vs. now()
fwd.scheduler.schedule(1.0, () => {
  console.log('d. ' + fwd.scheduler.now());
  // > d. 1
  
	console.log('e. ' + fwd.scheduler.clock());
	// > e. 0.9537750000017695
});
