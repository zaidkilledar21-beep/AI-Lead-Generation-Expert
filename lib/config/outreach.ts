export const forbiddenPhrases = [
  "i hope this email finds you well",
  "i wanted to reach out",
  "just following up",
  "touching base",
  "circling back",
  "as per my last email",
  "i know you're busy",
  "i know you are busy",
  "i'll keep this brief",
  "i will keep this brief",
  "i came across your business",
  "we help businesses like yours",
  "our ai-powered solution",
  "revolutionary",
  "game-changing",
  "synergy",
  "value proposition",
  "at the end of the day",
  "don't miss out",
  "do not miss out",
  "limited time",
  "act now"
];

export const wordLimits: Record<string, number> = {
  "A:1": 120,
  "A:2": 100,
  "A:3": 80,
  "B:1": 130,
  "B:2": 120,
  "B:3": 110,
  "B:4": 90,
  "C:1": 130,
  "C:2": 120,
  "C:3": 110,
  "C:4": 100,
  "C:5": 80,
  "D:1": 100,
  "D:2": 80,
  "D:3": 70
};

export const safeLeadStatuses = ["paused", "unsubscribed", "bounced", "not_interested", "replied", "archived"];
