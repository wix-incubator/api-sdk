export function addListener(eventTarget: any, name: string, fn: Function) {
  if (eventTarget.addEventListener) {
    eventTarget.addEventListener(name, fn);
  } else {
    eventTarget.attachEvent('on' + name, fn);
  }
}

export function removeListener(eventTarget: any, name: string, fn: Function) {
  if (eventTarget.removeEventListener) {
    eventTarget.removeEventListener(name, fn);
  } else {
    eventTarget.detachEvent('on' + name, fn);
  }
}

export function loadFrame(src: string) {
  const iframe = document.createElement('iframe');
  iframe.style.display = 'none';
  iframe.src = src;

  return document.body.appendChild(iframe);
}

export function addPostMessageListener(state: string) {
  let responseHandler: any;
  let timeoutId: any;
  const msgReceivedOrTimeout = new Promise((resolve, reject) => {
    responseHandler = (e: any) => {
      if (!e.data || e.data.state !== state) {
        // A message not meant for us
        return;
      }
      resolve(e.data);
    };

    addListener(window, 'message', responseHandler);

    timeoutId = setTimeout(() => {
      reject(new Error('OAuth flow timed out'));
    }, 120000);
  });

  return msgReceivedOrTimeout.finally(() => {
    clearTimeout(timeoutId);
    removeListener(window, 'message', responseHandler);
  });
}
