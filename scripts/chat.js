import { TabichanClient } from 'tabichan';

const client = new TabichanClient();

const taskId = await client.startChat(
  "Plan a 2-day trip to Tokyo for this weekend",
  "user123",
  "japan"
);

const result = await client.waitForChat(taskId, true);
console.log(result);