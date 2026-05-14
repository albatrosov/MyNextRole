import type { Message, MessageResponse } from './messages';

export function sendMessage(message: Message): Promise<MessageResponse> {
  return chrome.runtime.sendMessage(message);
}

export function onMessage(
  handler: (message: Message, sender: chrome.runtime.MessageSender) => Promise<MessageResponse> | MessageResponse,
): void {
  chrome.runtime.onMessage.addListener((message, sender, sendResponse) => {
    const result = handler(message as Message, sender);
    if (result instanceof Promise) {
      result
        .then(sendResponse)
        .catch((err) => sendResponse({ success: false, error: String(err) }));
      return true;
    }
    sendResponse(result);
    return false;
  });
}
