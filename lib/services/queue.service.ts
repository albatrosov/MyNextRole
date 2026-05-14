import type { ApplicationData, ResultStatus } from '../types/application';

type QueueItem =
  | { action: 'append'; data: ApplicationData }
  | { action: 'updateStatus'; rowIndex: number; status: ResultStatus };

const QUEUE_KEY = 'writeQueue';

async function getQueue(): Promise<QueueItem[]> {
  const result = await chrome.storage.local.get(QUEUE_KEY);
  return (result[QUEUE_KEY] as QueueItem[]) ?? [];
}

async function setQueue(queue: QueueItem[]): Promise<void> {
  await chrome.storage.local.set({ [QUEUE_KEY]: queue });
}

export async function enqueue(item: QueueItem): Promise<void> {
  const queue = await getQueue();
  queue.push(item);
  await setQueue(queue);
}

export async function processQueue(
  handlers: {
    append: (data: ApplicationData) => Promise<void>;
    updateStatus: (rowIndex: number, status: ResultStatus) => Promise<void>;
  },
): Promise<number> {
  const queue = await getQueue();
  if (queue.length === 0) return 0;

  const failed: QueueItem[] = [];
  let processed = 0;

  for (const item of queue) {
    try {
      if (item.action === 'append') {
        await handlers.append(item.data);
      } else {
        await handlers.updateStatus(item.rowIndex, item.status);
      }
      processed++;
    } catch {
      failed.push(item);
    }
  }

  await setQueue(failed);
  return processed;
}
