import { config } from "dotenv-flow";
import { Calendar } from "./utilities/calendar";

const _Calendar = new Calendar();

async function main() {
  // load environment variables.
  config();

  try {
    // get the list of calendar
    const _Calendar = new Calendar();
    console.log("[--DEBUG--] Calendar instance created successfully");
    
    const calendars = await _Calendar.listCalendars();
    console.log("[--DEBUG--] listCalendars() returned:", calendars);

    if (calendars && calendars.length > 0) {
      console.log(`[--DEBUG--] My calendars are:\n${JSON.stringify(calendars)}`);
    } else {
      console.log("[--INFO--] There are no calendars...");
    }
  } catch (error) {
    console.error("[--ERROR--] Error occurred:", error);
  }
}

main();
