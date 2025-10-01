export class GitHub {
  token = process.env.GLTHUB_TOKEN;
  url = (type: string) =>
    `https://api.github.com/repos/chi1180/Obsidian-data/contents/${encodeURIComponent(type === "tasks" ? "Tasks.md" : "Daily tasks.md")}`;
  sha: string | null = null;

  public async getTasks() {
    if (!this.token) throw new Error("Token is invalid.");

    const tasksRes = await fetch(this.url("tasks"), {
      headers: {
        Authorization: `token ${this.token}`,
        "User-Agent": "GoogleAppsScript",
        Accept: "application/vnd.github.v3+json",
      },
    });

    const response = (await tasksRes.json()) as any;

    if (tasksRes.status !== 200) {
      throw new Error(
        `Failed to fetch tasks: ${response.message || tasksRes.statusText}`,
      );
    }

    this.sha = response.sha;

    const content = Buffer.from(
      response.content,
      response.encoding || "base64",
    ).toString("utf-8");
    return content;
  }

  public async draftDailyTask(content: string) {
    if (!this.token) throw new Error("Token is invalid.");

    if (!this.sha) {
      // Get current file to get SHA for update
      const dailyTaskRes = await fetch(this.url("daily_task"), {
        headers: {
          Authorization: `token ${this.token}`,
          "User-Agent": "GoogleAppsScript",
          Accept: "application/vnd.github.v3+json",
        },
      });

      const dailyTaskData = (await dailyTaskRes.json()) as any;
      this.sha = dailyTaskData.sha;
    }

    // encode file contents with Base64
    const encodedContent = Buffer.from(content, "utf-8").toString("base64");

    // payload for update
    const payload = {
      message: `Update Daily tasks.md - ${new Date().toISOString()}`,
      content: encodedContent,
      sha: this.sha,
    };

    // Update file with PUT
    await fetch(this.url("daily_task"), {
      method: "PUT",
      headers: {
        Authorization: `token ${this.token}`,
        Accept: "application/vnd.github.v3+json",
        "Content-Type": "application/json",
      },
      body: JSON.stringify(payload),
    });
  }
}
