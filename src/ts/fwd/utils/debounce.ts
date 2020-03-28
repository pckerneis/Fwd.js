export default function debounce(action: Function, ms: number = 20): any {
  let timeout: any;

	return () => {
    const context = this;
    const args = arguments;

		const doIt = () => {
      timeout = null;
      action.apply(context, args);
    };
    
		clearTimeout(timeout);
		timeout = setTimeout(doIt, ms);
	};
}
