/**
 * Time-filtering high order function. The passed action will be executed after a timeout and any called made before
 * the timeout executes will delay the execution further.
 *
 * @param action the action to execute after the timeout
 * @param waitMs time delay before the action gets executed, in milliseconds.
 * @returns a memoized function
 */
export default function debounce(action: Function, waitMs: number = 20): (...args: any) => any {
  let timeout: any;

	return () => {
    const context = this;
    const args = arguments;

		const doIt = () => {
      timeout = null;
      action.apply(context, args);
    };
    
		clearTimeout(timeout);
		timeout = setTimeout(doIt, waitMs);
	};
}
