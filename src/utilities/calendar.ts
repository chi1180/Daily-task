import { OAuth2Client } from "google-auth-library";
import { type calendar_v3, google } from "googleapis";
import { exec } from "node:child_process";
import * as http from "node:http";
import * as url from "node:url";
import type {
  CalendarCredentials,
  CalendarEvent,
} from "../types/calendar.types";

export class Calendar {
  private readonly scopes = [
    "https://www.googleapis.com/auth/calendar.readonly",
  ];
  private readonly creds: CalendarCredentials;
  private oauth2Client: OAuth2Client;
  private calendar: calendar_v3.Calendar | null = null;

  constructor() {
    const raw = process.env.CALENDAR_CREDENTIALS;
    if (!raw) {
      throw new Error(
        "CALENDAR_CREDENTIALS is not set. Provide the OAuth2 client credentials JSON content via environment variables.",
      );
    }

    let parsed: any;
    try {
      parsed = JSON.parse(raw);
    } catch (e) {
      const message = e instanceof Error ? e.message : String(e);
      throw new Error(`CALENDAR_CREDENTIALS is not valid JSON: ${message}`);
    }

    if (!parsed.installed?.client_id || !parsed.installed?.client_secret) {
      throw new Error(
        "CALENDAR_CREDENTIALS must contain OAuth2 client fields: installed.client_id and installed.client_secret.",
      );
    }

    this.creds = parsed as CalendarCredentials;

    // Initialize OAuth2 client (redirect URI will be set dynamically)
    this.oauth2Client = new OAuth2Client(
      this.creds.installed.client_id,
      this.creds.installed.client_secret,
    );
  }

  private isLocalEnvironment(): boolean {
    return process.env.NODE_ENV === "local";
  }

  private async authenticateLocally(): Promise<void> {
    return new Promise((resolve, reject) => {
      // Start local server to receive callback
      const server = http.createServer(async (req, res) => {
        if (req.url?.startsWith("/?")) {
          const query = url.parse(req.url, true).query;
          const code = query.code as string;

          if (code) {
            try {
              const { tokens } = await this.oauth2Client.getToken(code);
              this.oauth2Client.setCredentials(tokens);

              // Save refresh token to env (user should manually add it to their env file)
              if (tokens.refresh_token) {
                console.log("\n=== IMPORTANT ===");
                console.log(
                  "Please add this refresh token to your .env.local file:",
                );
                console.log(`CALENDAR_REFRESH_TOKEN=${tokens.refresh_token}`);
                console.log("================\n");
              }

              res.writeHead(200, { "Content-Type": "text/html" });
              res.end(`
                <html>
                  <body>
                    <h1>Authentication Successful!</h1>
                    <p>You can close this window and return to the application.</p>
                    ${tokens.refresh_token ? `<p><strong>Please save the refresh token shown in your console to your .env.local file.</strong></p>` : ""}
                  </body>
                </html>
              `);

              server.close();
              resolve();
            } catch (error) {
              res.writeHead(400, { "Content-Type": "text/html" });
              res.end("<h1>Authentication failed</h1><p>Please try again.</p>");
              server.close();
              reject(error);
            }
          } else {
            res.writeHead(400, { "Content-Type": "text/html" });
            res.end("<h1>No authorization code received</h1>");
            server.close();
            reject(new Error("No authorization code received"));
          }
        }
      });

      server.listen(0, () => {
        const port = (server.address() as any)?.port;
        const redirectUri = `http://localhost:${port}`;

        const authUrl = this.oauth2Client.generateAuthUrl({
          access_type: "offline",
          scope: this.scopes,
          prompt: "consent", // Force consent screen to get refresh token
          redirect_uri: redirectUri,
        });

        console.log("Opening browser for authentication...");
        console.log("If browser doesn't open automatically, please visit:");
        console.log(authUrl);
        console.log(`Local server started on http://localhost:${port}`);

        // Try to open browser
        const platform = process.platform;
        const command =
          platform === "darwin"
            ? "open"
            : platform === "win32"
              ? "start"
              : "xdg-open";

        exec(`${command} "${authUrl}"`, (error) => {
          if (error) {
            console.log(
              "Could not open browser automatically. Please open the URL manually.",
            );
          }
        });
      });

      // Timeout after 5 minutes
      setTimeout(
        () => {
          server.close();
          reject(new Error("Authentication timeout"));
        },
        5 * 60 * 1000,
      );
    });
  }

  private async authenticateWithRefreshToken(): Promise<void> {
    const refreshToken = process.env.CALENDAR_REFRESH_TOKEN;
    if (!refreshToken) {
      throw new Error(
        "CALENDAR_REFRESH_TOKEN is not set. This is required for non-local environments.",
      );
    }

    this.oauth2Client.setCredentials({
      refresh_token: refreshToken,
    });

    try {
      // Refresh the access token
      await this.oauth2Client.getAccessToken();
    } catch (error) {
      throw new Error(`Failed to refresh access token: ${error}`);
    }
  }

  private async ensureAuthenticated(): Promise<void> {
    if (this.isLocalEnvironment()) {
      // Check if we already have a valid refresh token
      const refreshToken = process.env.CALENDAR_REFRESH_TOKEN;
      if (refreshToken) {
        try {
          await this.authenticateWithRefreshToken();
          return;
        } catch (error) {
          console.log(
            "Stored refresh token is invalid, starting new authentication...",
          );
        }
      }
      // Start browser authentication flow
      await this.authenticateLocally();
    } else {
      // Use refresh token for CI/production
      await this.authenticateWithRefreshToken();
    }
  }

  // Returns a Google Calendar API client (v3) authorized with OAuth2
  async auth(): Promise<calendar_v3.Calendar> {
    await this.ensureAuthenticated();
    return google.calendar({ version: "v3", auth: this.oauth2Client as any });
  }

  private async listCalendars() {
    this.calendar = await this.auth();

    // get list of calendar id
    const res = await this.calendar.calendarList.list();

    if (res.data.items) return res.data.items;
    return [];
  }

  // main called method
  public async getEvents(date: Date): Promise<CalendarEvent[]> {
    const calendars = await this.listCalendars();

    // Get start and end of the day in ISO format
    const startOfDay = new Date(date);
    startOfDay.setHours(0, 0, 0, 0);

    const endOfDay = new Date(date);
    endOfDay.setHours(23, 59, 59, 999);

    const allEvents: CalendarEvent[] = [];

    for (const calendarInfo of calendars) {
      if (!calendarInfo.id || !calendarInfo.summary || !this.calendar) continue;

      try {
        const res = await this.calendar.events.list({
          calendarId: calendarInfo.id,
          timeMin: startOfDay.toISOString(),
          timeMax: endOfDay.toISOString(),
          maxResults: 100,
          singleEvents: true,
          orderBy: "startTime",
        });

        if (res.data.items) {
          const events = res.data.items.map((event) => ({
            id: event.id,
            summary: event.summary,
            description: event.description,
            start: event.start,
            end: event.end,
            location: event.location,
            calendarId: calendarInfo.id,
            calendarSummary: calendarInfo.summary,
          })) as CalendarEvent[];

          allEvents.push(...events);
        }
      } catch (error) {
        console.error(
          `Error fetching events for calendar ${calendarInfo.id}:`,
          error,
        );
        // Continue with other calendars even if one fails
      }
    }

    return allEvents;
  }
}
