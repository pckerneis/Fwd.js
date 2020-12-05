fwd.scheduler.chain(
	() => console.log('1 this is a test with nest chains'),
  () => console.log('2 we expect all lines to be logged'),
  [
    0.1,
    () => console.log('3 it shouldn\'t take took long'),
    0.1,
  ],
  0.1,
  () => console.log('4 and it\'s done. Thank you for your cooperation')
).trigger();