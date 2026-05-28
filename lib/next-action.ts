import type { Decision } from "./types"

export type NextActionKind =
  | "review-overdue"
  | "name-regret-lesson"
  | "set-revisit"
  | "add-human-frame"
  | "close-stale"
  | "add-second-option"
  | "calm"

export interface NextHonestAction {
  kind: NextActionKind
  title: string
  why: string
  decisionId: string | null
  decisionTitle: string | null
  cta: { label: string; href: string }
}

// ─── Thresholds ───────────────────────────────────────────────────────────────

export const HIGH_IMPACT_THRESHOLD = 4
export const STALE_IN_PROGRESS_MS = 14 * 24 * 60 * 60 * 1000

// ─── Helpers ──────────────────────────────────────────────────────────────────

function hasHumanFrame(d: Decision): boolean {
  return Boolean(
    d.valuesAtStake?.trim() ||
    d.humanCost?.trim() ||
    d.guidingPrinciple?.trim()
  )
}

function hasReviewLesson(d: Decision): boolean {
  return Boolean(d.review?.lesson?.trim() || d.review?.wrongAssumption?.trim())
}

function isOpenStatus(d: Decision): boolean {
  return d.status === "draft" || d.status === "in-progress"
}

function detailHref(d: Decision, focus?: string): string {
  return focus ? `/decisions/${d.id}?focus=${focus}` : `/decisions/${d.id}`
}

// ─── Prioritised candidates ──────────────────────────────────────────────────

function findOverdueReview(decisions: Decision[], now: number): Decision | null {
  const pool = decisions
    .filter((d) => d.revisitAt && !d.review?.completedAt)
    .filter((d) => new Date(d.revisitAt!).getTime() <= now)
    .sort((a, b) => new Date(a.revisitAt!).getTime() - new Date(b.revisitAt!).getTime())
  return pool[0] ?? null
}

function findRegretWithoutLesson(decisions: Decision[]): Decision | null {
  const pool = decisions
    .filter((d) => d.regret && !d.gotWrong?.trim() && !hasReviewLesson(d))
    .sort((a, b) => b.impact - a.impact)
  return pool[0] ?? null
}

function findHighImpactWithoutRevisit(decisions: Decision[]): Decision | null {
  const pool = decisions
    .filter(
      (d) =>
        d.impact >= HIGH_IMPACT_THRESHOLD &&
        !d.revisitAt &&
        d.status !== "archived" &&
        d.status !== "voided"
    )
    .sort((a, b) => b.impact - a.impact)
  return pool[0] ?? null
}

function findHighImpactWithoutHumanFrame(decisions: Decision[]): Decision | null {
  const pool = decisions
    .filter(
      (d) =>
        d.impact >= HIGH_IMPACT_THRESHOLD &&
        !hasHumanFrame(d) &&
        d.status !== "voided" &&
        d.status !== "archived"
    )
    .sort((a, b) => b.impact - a.impact)
  return pool[0] ?? null
}

function findStaleInProgress(decisions: Decision[], now: number): Decision | null {
  const pool = decisions
    .filter(
      (d) =>
        isOpenStatus(d) &&
        now - new Date(d.updatedAt ?? d.createdAt).getTime() > STALE_IN_PROGRESS_MS
    )
    .sort(
      (a, b) =>
        new Date(a.updatedAt ?? a.createdAt).getTime() -
        new Date(b.updatedAt ?? b.createdAt).getTime()
    )
  return pool[0] ?? null
}

function findTunnelVision(decisions: Decision[]): Decision | null {
  const pool = decisions
    .filter(
      (d) =>
        d.impact >= 3 &&
        d.options.filter((o) => o.title.trim().length > 0).length < 2 &&
        d.status !== "voided" &&
        d.status !== "archived"
    )
    .sort((a, b) => b.impact - a.impact)
  return pool[0] ?? null
}

// ─── Public API ───────────────────────────────────────────────────────────────

/**
 * Pick the single most important next thing the user should do.
 * Priority is fixed and centrally defined — no per-component heuristics.
 * Static example decisions are excluded so the calm state is reachable.
 */
export function getNextHonestAction(decisions: Decision[], now: number): NextHonestAction {
  const userDecisions = decisions.filter((d) => !d.id.startsWith("static-"))

  // 1. Overdue review — the strongest learning signal.
  const overdue = findOverdueReview(userDecisions, now)
  if (overdue) {
    const daysOverdue = Math.max(
      0,
      Math.floor((now - new Date(overdue.revisitAt!).getTime()) / (24 * 60 * 60 * 1000))
    )
    return {
      kind: "review-overdue",
      title: "Review an overdue decision",
      why:
        daysOverdue === 0
          ? "It is the day you said you would look back. Do it before the memory rewrites itself."
          : `You said you would look back ${daysOverdue} day${daysOverdue === 1 ? "" : "s"} ago. The longer you wait, the less honest the review.`,
      decisionId: overdue.id,
      decisionTitle: overdue.title,
      cta: { label: "Start review", href: detailHref(overdue, "review") },
    }
  }

  // 2. Regret marked but no lesson written.
  const regret = findRegretWithoutLesson(userDecisions)
  if (regret) {
    return {
      kind: "name-regret-lesson",
      title: "Name what you got wrong",
      why: "You marked this as a regret but never wrote the lesson. That is the loop that closes the wound.",
      decisionId: regret.id,
      decisionTitle: regret.title,
      cta: { label: "Write the lesson", href: detailHref(regret, "regret") },
    }
  }

  // 3. High-impact decision with no revisit date.
  const noRevisit = findHighImpactWithoutRevisit(userDecisions)
  if (noRevisit) {
    return {
      kind: "set-revisit",
      title: "Schedule a revisit",
      why: "High-impact decisions without a revisit date never get audited. Pre-commit to looking back.",
      decisionId: noRevisit.id,
      decisionTitle: noRevisit.title,
      cta: { label: "Set a date", href: detailHref(noRevisit, "revisit") },
    }
  }

  // 4. High-impact decision with no human frame.
  const noHuman = findHighImpactWithoutHumanFrame(userDecisions)
  if (noHuman) {
    return {
      kind: "add-human-frame",
      title: "Add a human frame",
      why: "This is a high-impact decision with no values, cost, or principle on record. Spreadsheets do not bleed.",
      decisionId: noHuman.id,
      decisionTitle: noHuman.title,
      cta: { label: "Add context", href: detailHref(noHuman, "human-frame") },
    }
  }

  // 5. Stale in-progress.
  const stale = findStaleInProgress(userDecisions, now)
  if (stale) {
    return {
      kind: "close-stale",
      title: "Close a stale decision",
      why: "This has been open for more than two weeks. If it is decided, mark it. If it is dead, void it.",
      decisionId: stale.id,
      decisionTitle: stale.title,
      cta: { label: "Resolve status", href: detailHref(stale) },
    }
  }

  // 6. Tunnel vision on a meaningful decision.
  const tunnel = findTunnelVision(userDecisions)
  if (tunnel) {
    return {
      kind: "add-second-option",
      title: "Add a second option",
      why: "Only one option on record means the alternative was not really considered. Even 'do nothing' is honest.",
      decisionId: tunnel.id,
      decisionTitle: tunnel.title,
      cta: { label: "Add option", href: detailHref(tunnel) },
    }
  }

  // Calm state — nothing urgent, not an empty placeholder.
  return {
    kind: "calm",
    title: "Nothing demanding your attention.",
    why: "Loops are closed, revisits are scheduled, and no high-impact decision is missing context. Log the next one when it arrives.",
    decisionId: null,
    decisionTitle: null,
    cta: { label: "View decisions", href: "/decisions" },
  }
}
