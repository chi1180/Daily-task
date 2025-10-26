import { config } from "dotenv-flow";
import { getTodo } from "./services/getTodo";
import { sendMail } from "./services/mail";
import { makeSchedule } from "./services/makeSchedule";

async function main() {
  // load environment variables.
  const isLocalEnv = process.env.NODE_ENV === "local";
  if (isLocalEnv) config();

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
