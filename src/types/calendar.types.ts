export type OAuth2Credentials = {
  client_id: string;
  client_secret: string;
  redirect_uris: string[];
};

export type CalendarCredentials = {
  installed: OAuth2Credentials;
};

export type CalendarEvent = {
  id?: string;
  summary?: string;
  description?: string;
  start?: {
    dateTime?: string;
    date?: string;
    timeZone?: string;
  };
  end?: {
    dateTime?: string;
    date?: string;
    timeZone?: string;
  };
  location?: string;
  calendarId?: string;
  calendarSummary?: string;
};

// Legacy type - kept for compatibility
export type ServiceAccountCredentials = {
  client_email: string;
  private_key: string;
};
