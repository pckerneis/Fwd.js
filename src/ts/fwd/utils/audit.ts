export default function audit(action: Function, waitTime: number = 20) {
  let timeout: any;

	return () => {
    const context = this;
    const args = arguments;

		const doIt = () => {
      timeout = null;
      action.apply(context, args);
    };
    
    if (timeout == null) {
      timeout = setTimeout(doIt, waitTime);
    }
	};
}
