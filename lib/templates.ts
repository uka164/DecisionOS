import type { DecisionOption } from "./types"

export interface DecisionTemplate {
  id: string
  name: string
  tagline: string
  rawThinking: string
  options: DecisionOption[]
  constraints: string[]
  tags: string[]
}

export const DECISION_TEMPLATES: DecisionTemplate[] = [
  {
    id: "blank",
    name: "Blank",
    tagline: "Start from scratch",
    rawThinking: "",
    options: [],
    constraints: [],
    tags: [],
  },
  {
    id: "technical-choice",
    name: "Technical Choice",
    tagline: "Pick between two approaches or tools",
    rawThinking:
      "// Why are we making this choice now?\n// What problem does each option solve?\n// What's the risk if we get this wrong?\n// Who else is affected?",
    options: [
      { title: "Option A", description: "Describe the first approach" },
      { title: "Option B", description: "Describe the alternative" },
    ],
    constraints: ["Time", "Tech Debt"],
    tags: ["ARCH"],
  },
  {
    id: "build-vs-buy",
    name: "Build vs Buy",
    tagline: "Make it or use an existing solution",
    rawThinking:
      "// What's the cost of building? (time, maintenance, opportunity cost)\n// What's the cost of buying? (license, lock-in, customization limits)\n// How strategic is this capability?\n// What would we lose by not owning it?",
    options: [
      { title: "Build in-house", description: "Full control, ongoing maintenance cost" },
      { title: "Buy / use existing", description: "Faster, but dependency and cost" },
    ],
    constraints: ["Budget", "Time"],
    tags: ["BUILD-VS-BUY"],
  },
  {
    id: "team-process",
    name: "Team Process",
    tagline: "Change how the team works",
    rawThinking:
      "// What's the current pain?\n// Who is affected by this change?\n// How will we know if it's working?\n// What's the rollback if it doesn't help?",
    options: [
      { title: "New process", description: "What you want to try" },
      { title: "Status quo", description: "Keep doing what we do" },
    ],
    constraints: ["Team", "Culture"],
    tags: ["PROCESS"],
  },
  {
    id: "hire-decision",
    name: "Hiring Decision",
    tagline: "Who to hire, how, or whether to",
    rawThinking:
      "// What's the gap we're trying to fill?\n// Contractor vs full-time tradeoffs for this role?\n// What level do we need — senior vs junior?\n// Timeline pressure?",
    options: [
      { title: "Full-time hire", description: "Long-term investment, slower to ramp" },
      { title: "Contractor", description: "Faster start, higher hourly, no benefits" },
    ],
    constraints: ["Budget", "Timeline"],
    tags: ["HIRING", "TEAM"],
  },
  {
    id: "career-move",
    name: "Career Move",
    tagline: "Personal or team career decisions",
    rawThinking:
      "// What's pulling me toward this change?\n// What am I giving up?\n// Where do I want to be in 2 years — does this help?\n// What's the reversibility?",
    options: [
      { title: "Make the move", description: "What changes if you do" },
      { title: "Stay the course", description: "What you preserve by not changing" },
    ],
    constraints: ["Risk", "Time"],
    tags: ["CAREER"],
  },
]
