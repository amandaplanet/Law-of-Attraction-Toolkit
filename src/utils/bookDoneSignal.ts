let _book = false;
export const signalBookDone = () => { _book = true; };
export const consumeBookDone = () => { const v = _book; _book = false; return v; };

let _wheel = false;
export const signalFocusWheelDone = () => { _wheel = true; };
export const consumeFocusWheelDone = () => { const v = _wheel; _wheel = false; return v; };
