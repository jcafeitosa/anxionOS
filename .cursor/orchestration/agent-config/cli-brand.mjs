/**
 * Branding e placeholders agnósticos para CLIs do framework.
 */

import { formatIssueIdHint, getIssuePrefix, loadOrchestrationConfig } from "./load-config.mjs";

export function getCliBrand(options = {}) {
  const { projectName } = loadOrchestrationConfig(options);
  if (projectName && projectName !== "project") {
    return `${projectName} orchestration`;
  }
  return "Cursor orchestration";
}

/** Placeholder genérico para help text (ex.: ISSUE-N, ANX-N). */
export function issuePlaceholder(options = {}) {
  const prefix = getIssuePrefix(options);
  return `${prefix}-N`;
}

export { formatIssueIdHint, getIssuePrefix };
