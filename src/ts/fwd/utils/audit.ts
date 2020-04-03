/**
 * Time-filtering high order function. The passed action will be executed after a timeout and any called made before
 * the timeout executes will be ignored. It can be used to filter fast-occurring events such as mouse drags.
 *
 * @param action the action to execute after the timeout
 * @param waitMs time delay before the action gets executed, in milliseconds.
 * @returns a memoized function
 */
export default function audit(action: Function, waitMs: number = 20): (...args: any) => any {
  let timeout: any;

	return () => {
    const context = this;
    const args = arguments;

		const doIt = () => {
      timeout = null;
      action.apply(context, args);
    };
    
    if (timeout == null) {
      timeout = setTimeout(doIt, waitMs);
    }
	};
}
