export default function debounce(action: Function, waitTime: number = 20) {
  let timeout: any;

	return () => {
    const context = this;
    const args = arguments;

		const doIt = () => {
      timeout = null;
      action.apply(context, args);
    };
    
		clearTimeout(timeout);
		timeout = setTimeout(doIt, waitTime);
	};
}
