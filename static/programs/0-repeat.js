fwd.scheduler
  .fire(() => console.log('hello'))
	.repeat(4,
		fwd.scheduler
      .fire(() => console.log('goodbye'))
      .wait(1))
  .fire(() => console.log('over and out'))
	.trigger();