import { config } from "dotenv-flow";
import { getTodo } from "./services/getTodo";
import { Gemini } from "./utilities/gemini";
import { makeSchedule } from "./services/makeSchedule";
import { sendMail } from "./services/mail";

async function main() {
  // load environment variables.
  config();

  // get todo data
  const TODO = await getTodo();

  // make daily schedule and task on GitHub
  await makeSchedule(TODO);
}

//---  < Start />  ---//

try {
  main();
} catch (error) {
  const message = JSON.stringify(error);
  console.error("[--ERROR--] Error occurred:", message);
  sendMail(message);
}
