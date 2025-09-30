import { type calendar_v3, google } from "googleapis";
import type { ServiceAccountCredentials } from "../types/calendar.types";

export class Calendar {
  private readonly scopes = [
    "https://www.googleapis.com/auth/calendar.readonly",
  ];
  private readonly creds: ServiceAccountCredentials;

  constructor() {
    const raw = process.env.CALENDAR_CREDENTIALS;
    if (!raw) {
      throw new Error(
        "CALENDAR_CREDENTIALS is not set. Provide the service account JSON content via environment variables.",
      );
    }

    let parsed: any;
    try {
      parsed = JSON.parse(raw);
    } catch (e) {
      const message = e instanceof Error ? e.message : String(e);
      throw new Error(`CALENDAR_CREDENTIALS is not valid JSON: ${message}`);
    }

    if (!parsed.client_email || !parsed.private_key) {
      throw new Error(
        "CALENDAR_CREDENTIALS must contain service account fields: client_email and private_key.",
      );
    }

    // Normalize private_key newlines when provided as a single-line JSON string in env
    const normalizedPrivateKey: string = String(parsed.private_key).replace(
      /\\n/g,
      "\n",
    );

    this.creds = {
      client_email: String(parsed.client_email),
      private_key: normalizedPrivateKey,
    };
  }

  private async getAuthClient() {
    const auth = new google.auth.GoogleAuth({
      credentials: {
        client_email: this.creds.client_email,
        private_key: this.creds.private_key,
      },
      scopes: this.scopes,
    });
    return await auth.getClient();
  }

  // Returns a Google Calendar API client (v3) authorized with the service account
  async auth(): Promise<calendar_v3.Calendar> {
    const authClient = await this.getAuthClient();
    return google.calendar({ version: "v3", auth: authClient as any });
  }

  public async listCalendars() {
    const calendar = await this.auth();

    // get list of calendar id
    const res = await calendar.calendarList.list();
    console.log("[--DEBUG--] Full API response:", JSON.stringify(res.data, null, 2));
    
    if (res.data.items) {
      const calendars = res.data.items.map((item) => item.id);
      console.log("[--DEBUG--] Calendar items found:", res.data.items.length);
      console.log("[--DEBUG--] Calendar IDs:", calendars);

      return calendars;
    } else {
      console.log("[--DEBUG--] No items in response data");
      return [];
    }
  }
}
