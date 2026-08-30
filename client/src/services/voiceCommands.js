import api from "./api";

export async function runVoiceCommand(transcript, { navigate, setToast, toggleTheme }) {
  const raw = (transcript || "").trim();
  const t = raw.toLowerCase();
  if (!raw) return "I did not catch that.";

  if (/(dark mode|ink mode|modo oscuro)/.test(t)) {
    await toggleTheme("dark");
    return "Ink mode.";
  }
  if (/(light mode|paper mode|modo claro)/.test(t)) {
    await toggleTheme("light");
    return "Paper mode.";
  }
  if (/(plan my day|plan the day|daily plan|plan del día)/.test(t)) {
    navigate("/planner");
    return "Opening the daily planner.";
  }
  if (/(what.*(today|finish)|today's work)/.test(t)) {
    navigate("/assistant");
    return "Ask Kairo what is due today.";
  }
  const go = t.match(/^(go to|open|abrir)\s+(tasks|notes|calendar|reminders|search|documents|pulse|analytics|studio|settings|kairo|assistant|planner|atelier)/);
  if (go) {
    const map = {
      tasks: "/tasks",
      notes: "/notes",
      calendar: "/calendar",
      reminders: "/reminders",
      search: "/search",
      documents: "/documents",
      pulse: "/analytics",
      analytics: "/analytics",
      studio: "/settings",
      settings: "/settings",
      kairo: "/assistant",
      assistant: "/assistant",
      planner: "/planner",
      atelier: "/",
    };
    navigate(map[go[2]] || "/");
    return `Opening ${go[2]}.`;
  }
  const search = t.match(/^(search|find|buscar)(?:\s+for)?\s+(.+)/);
  if (search) {
    navigate(`/search?q=${encodeURIComponent(search[2])}`);
    return `Searching for ${search[2]}.`;
  }
  if (/^(remind|create task|add task|add a task|new task|recordar)/.test(t)) {
    const { data } = await api.post("/ai/create-task", { text: raw });
    navigate("/tasks");
    return `Captured: ${data.task?.title || raw}`;
  }
  if (/summarize/.test(t) && /note/.test(t)) {
    navigate("/notes");
    return "Open a note and tap Summarize, or ask Kairo in chat.";
  }

  await api.post("/ai/create-task", { text: raw });
  setToast?.(`Captured · ${raw}`);
  navigate("/tasks");
  return `Captured as a task: ${raw}`;
}