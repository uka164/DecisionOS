import type { Decision } from "@/lib/types"

// Markdown generator

export function generateRFC(decision: Decision): string {
  const date = new Date().toISOString().split("T")[0]

  const tradeoffTable =
    decision.tradeoffs.length > 0
      ? [
          "| Dimension | Score |",
          "|-----------|-------|",
          ...decision.tradeoffs.map((t) => `| ${t.axis} | ${t.value}/100 |`),
        ].join("\n")
      : "_No trade-off axes recorded._"

  const optionsList =
    decision.options.length > 0
      ? decision.options
          .map((o, i) => `**Option ${String.fromCharCode(65 + i)}: ${o.title}**\n${o.description}`)
          .join("\n\n")
      : "_No options recorded._"

  const context = decision.rfcData?.context ?? decision.rawThinking ?? "_No context recorded._"
  const proposal = decision.rfcData?.proposal ?? optionsList
  const rfcTradeoffs = decision.rfcData?.tradeoffs ?? tradeoffTable
  const finalDecision = decision.rfcData?.decision ?? "_Pending._"

  const riskSection =
    decision.risks.length > 0
      ? decision.risks
          .map((r) => `- ${r.text} _(severity: ${r.severity}%)_`)
          .join("\n")
      : "_No risks recorded._"

  return `# RFC: ${decision.title}

**Date:** ${date}
**Status:** ${decision.status}
**Quality Score:** ${decision.qualityScore}/100
**Risk Level:** ${decision.riskLevel ?? "unset"}
**Author:** [Your Name]

---

## Context

${context}

---

## Proposal

${proposal}

---

## Trade-offs

${rfcTradeoffs}

---

## Pre-Mortem

${decision.preMortem ?? "_No pre-mortem recorded._"}

---

## Identified Risks

${riskSection}

---

## Decision

${finalDecision}

---

## Retrospective

${decision.retrospective ?? "_To be filled after implementation._"}

---

## References

- [Related Doc 1]
- [Related Doc 2]
`
}

// Copy helper - call only from event handlers (requires secure context)

export async function copyRFCToClipboard(decision: Decision): Promise<void> {
  const md = generateRFC(decision)
  await navigator.clipboard.writeText(md)
}

// Download helper

export function downloadRFC(decision: Decision): void {
  const md = generateRFC(decision)
  const slug = decision.title.toLowerCase().replace(/\s+/g, "-").replace(/[^a-z0-9-]/g, "")
  const blob = new Blob([md], { type: "text/markdown" })
  const url = URL.createObjectURL(blob)
  const a = document.createElement("a")
  a.href = url
  a.download = `rfc-${slug}.md`
  document.body.appendChild(a)
  a.click()
  document.body.removeChild(a)
  URL.revokeObjectURL(url)
}
