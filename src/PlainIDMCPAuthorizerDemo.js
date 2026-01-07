import React, { useState, useEffect, useRef, useCallback } from 'react';
import { Shield, Play, Volume2, VolumeX, SkipForward, Zap, RotateCcw } from 'lucide-react';

// ============================================================================
// DATA IMPORTS
// ============================================================================

import { roles } from './data/roles';
import { incidents } from './data/incidents';

// ============================================================================
// SCENARIOS (simplified for our UI)
// ============================================================================

const scenarios = [
  {
    id: 'account_lookup',
    name: 'Account Lookup',
    description: 'Basic account inquiry — shows data masking',
    tool: 'get_account_details',
  },
  {
    id: 'cross_branch',
    name: 'Cross-Branch Access',
    description: 'Access another branch\'s data — shows scope enforcement',
    tool: 'get_account_details',
  },
  {
    id: 'loan_approval',
    name: '$75K Loan Approval',
    description: 'Approve a large loan — shows role-based limits',
    tool: 'approve_loan',
  },
  {
    id: 'admin_override',
    name: 'Override Limits',
    description: 'Override transaction limits — shows admin tool hiding',
    tool: 'override_transaction_limit',
  },
];

// Expected outcomes for scenario badges
const outcomeMatrix = {
  account_lookup: { teller: 'success', loan_officer: 'success', branch_manager: 'success' },
  cross_branch: { teller: 'denied', loan_officer: 'denied', branch_manager: 'success' },
  loan_approval: { teller: 'denied', loan_officer: 'denied', branch_manager: 'success' },
  admin_override: { teller: 'denied', loan_officer: 'denied', branch_manager: 'denied' },
};

// ============================================================================
// TERMINAL OUTPUT TEMPLATES
// ============================================================================

const terminalOutputs = {
  // ==================== ACCOUNT LOOKUP ====================
  account_lookup: {
    teller: {
      readable: [
        { type: 'request', text: '→ Incoming request: get_account_details', highlight: 'get_account_details' },
        { type: 'context', text: '  User: Bank Teller (E-1234) | Branch: Central' },
        { type: 'context', text: '  Target: Account #12345' },
        { type: 'blank', text: '' },
        { type: 'gate', tag: 'GATE 1', text: 'Tool discovery filter' },
        { type: 'context', text: '  Policy: role-based-tool-access' },
        { type: 'context', text: '  Checking tool visibility for role "teller"...' },
        { type: 'decision', tag: 'PASS', text: 'Tool visible (3 of 12 permitted)' },
        { type: 'blank', text: '' },
        { type: 'gate', tag: 'GATE 2', text: 'Execution authorization' },
        { type: 'context', text: '  Policy: branch-boundary-enforcement' },
        { type: 'context', text: '  Checking: user.branch == resource.branch' },
        { type: 'context', text: '  Central == Central' },
        { type: 'decision', tag: 'PASS', text: 'Scope validated' },
        { type: 'blank', text: '' },
        { type: 'forward', text: '→ Forwarding to MCP server...' },
        { type: 'response', text: '← Response received (186 bytes)' },
        { type: 'blank', text: '' },
        { type: 'gate', tag: 'GATE 3', text: 'Response masking' },
        { type: 'context', text: '  Policy: pii-masking' },
        { type: 'context', text: '  Scanning response fields...' },
        { type: 'context', text: '  Field "ssn" contains PII' },
        { type: 'mask', tag: 'MASK', text: 'ssn: 123-45-6789', transform: 'XXX-XX-6789' },
        { type: 'blank', text: '' },
        { type: 'done', tag: 'DONE', text: 'Response delivered to agent (1 field masked)' },
      ],
      raw: [
        { text: '[2025-01-07T14:23:01.234Z] REQ  tool=get_account_details user=E-1234 role=teller branch=central' },
        { text: '[2025-01-07T14:23:01.235Z] CTX  target_account=12345 target_branch=central' },
        { text: '[2025-01-07T14:23:01.238Z] G1   policy=role-based-tool-access' },
        { text: '[2025-01-07T14:23:01.240Z] G1   decision=PERMIT tools_visible=3 tools_total=12' },
        { text: '[2025-01-07T14:23:01.245Z] G2   policy=branch-boundary-enforcement' },
        { text: '[2025-01-07T14:23:01.248Z] G2   check=branch_match user_branch=central resource_branch=central' },
        { text: '[2025-01-07T14:23:01.250Z] G2   decision=PERMIT' },
        { text: '[2025-01-07T14:23:01.312Z] FWD  endpoint=mcp://acme-bank/account-management' },
        { text: '[2025-01-07T14:23:01.456Z] RSP  status=200 bytes=186' },
        { text: '[2025-01-07T14:23:01.458Z] G3   policy=pii-masking' },
        { text: '[2025-01-07T14:23:01.460Z] G3   field=ssn action=MASK original=123-45-6789 masked=XXX-XX-6789' },
        { text: '[2025-01-07T14:23:01.462Z] DONE result=SUCCESS fields_masked=1' },
      ],
      withoutNote: 'SSN "123-45-6789" would be returned in plain text. No masking applied.',
    },
    loan_officer: {
      readable: [
        { type: 'request', text: '→ Incoming request: get_account_details', highlight: 'get_account_details' },
        { type: 'context', text: '  User: Loan Officer (E-5678) | Branch: Central' },
        { type: 'context', text: '  Target: Account #12345' },
        { type: 'blank', text: '' },
        { type: 'gate', tag: 'GATE 1', text: 'Tool discovery filter' },
        { type: 'context', text: '  Policy: role-based-tool-access' },
        { type: 'context', text: '  Checking tool visibility for role "loan_officer"...' },
        { type: 'decision', tag: 'PASS', text: 'Tool visible (7 of 12 permitted)' },
        { type: 'blank', text: '' },
        { type: 'gate', tag: 'GATE 2', text: 'Execution authorization' },
        { type: 'context', text: '  Policy: branch-boundary-enforcement' },
        { type: 'context', text: '  Checking: user.branch == resource.branch' },
        { type: 'context', text: '  Central == Central' },
        { type: 'decision', tag: 'PASS', text: 'Scope validated' },
        { type: 'blank', text: '' },
        { type: 'forward', text: '→ Forwarding to MCP server...' },
        { type: 'response', text: '← Response received (186 bytes)' },
        { type: 'blank', text: '' },
        { type: 'gate', tag: 'GATE 3', text: 'Response masking' },
        { type: 'context', text: '  Policy: pii-masking' },
        { type: 'context', text: '  Scanning response fields...' },
        { type: 'context', text: '  Field "ssn" contains PII' },
        { type: 'mask', tag: 'MASK', text: 'ssn: 123-45-6789', transform: 'XXX-XX-6789' },
        { type: 'blank', text: '' },
        { type: 'done', tag: 'DONE', text: 'Response delivered to agent (1 field masked)' },
      ],
      raw: [
        { text: '[2025-01-07T14:23:01.234Z] REQ  tool=get_account_details user=E-5678 role=loan_officer branch=central' },
        { text: '[2025-01-07T14:23:01.235Z] CTX  target_account=12345 target_branch=central' },
        { text: '[2025-01-07T14:23:01.238Z] G1   policy=role-based-tool-access' },
        { text: '[2025-01-07T14:23:01.240Z] G1   decision=PERMIT tools_visible=7 tools_total=12' },
        { text: '[2025-01-07T14:23:01.245Z] G2   policy=branch-boundary-enforcement' },
        { text: '[2025-01-07T14:23:01.248Z] G2   check=branch_match user_branch=central resource_branch=central' },
        { text: '[2025-01-07T14:23:01.250Z] G2   decision=PERMIT' },
        { text: '[2025-01-07T14:23:01.312Z] FWD  endpoint=mcp://acme-bank/account-management' },
        { text: '[2025-01-07T14:23:01.456Z] RSP  status=200 bytes=186' },
        { text: '[2025-01-07T14:23:01.458Z] G3   policy=pii-masking' },
        { text: '[2025-01-07T14:23:01.460Z] G3   field=ssn action=MASK original=123-45-6789 masked=XXX-XX-6789' },
        { text: '[2025-01-07T14:23:01.462Z] DONE result=SUCCESS fields_masked=1' },
      ],
      withoutNote: 'SSN "123-45-6789" would be returned in plain text. No masking applied.',
    },
    branch_manager: {
      readable: [
        { type: 'request', text: '→ Incoming request: get_account_details', highlight: 'get_account_details' },
        { type: 'context', text: '  User: Branch Manager (E-9012) | Branch: Central' },
        { type: 'context', text: '  Target: Account #12345' },
        { type: 'blank', text: '' },
        { type: 'gate', tag: 'GATE 1', text: 'Tool discovery filter' },
        { type: 'context', text: '  Policy: role-based-tool-access' },
        { type: 'context', text: '  Checking tool visibility for role "branch_manager"...' },
        { type: 'decision', tag: 'PASS', text: 'Tool visible (11 of 12 permitted)' },
        { type: 'blank', text: '' },
        { type: 'gate', tag: 'GATE 2', text: 'Execution authorization' },
        { type: 'context', text: '  Policy: branch-boundary-enforcement' },
        { type: 'context', text: '  Checking: user.branch == resource.branch' },
        { type: 'context', text: '  Central == Central' },
        { type: 'decision', tag: 'PASS', text: 'Scope validated' },
        { type: 'blank', text: '' },
        { type: 'forward', text: '→ Forwarding to MCP server...' },
        { type: 'response', text: '← Response received (186 bytes)' },
        { type: 'blank', text: '' },
        { type: 'gate', tag: 'GATE 3', text: 'Response masking' },
        { type: 'context', text: '  Policy: pii-masking' },
        { type: 'context', text: '  Scanning response fields...' },
        { type: 'context', text: '  Field "ssn" contains PII' },
        { type: 'mask', tag: 'MASK', text: 'ssn: 123-45-6789', transform: 'XXX-XX-6789' },
        { type: 'blank', text: '' },
        { type: 'done', tag: 'DONE', text: 'Response delivered to agent (1 field masked)' },
      ],
      raw: [
        { text: '[2025-01-07T14:23:01.234Z] REQ  tool=get_account_details user=E-9012 role=branch_manager branch=central' },
        { text: '[2025-01-07T14:23:01.235Z] CTX  target_account=12345 target_branch=central' },
        { text: '[2025-01-07T14:23:01.238Z] G1   policy=role-based-tool-access' },
        { text: '[2025-01-07T14:23:01.240Z] G1   decision=PERMIT tools_visible=11 tools_total=12' },
        { text: '[2025-01-07T14:23:01.245Z] G2   policy=branch-boundary-enforcement' },
        { text: '[2025-01-07T14:23:01.248Z] G2   check=branch_match user_branch=central resource_branch=central' },
        { text: '[2025-01-07T14:23:01.250Z] G2   decision=PERMIT' },
        { text: '[2025-01-07T14:23:01.312Z] FWD  endpoint=mcp://acme-bank/account-management' },
        { text: '[2025-01-07T14:23:01.456Z] RSP  status=200 bytes=186' },
        { text: '[2025-01-07T14:23:01.458Z] G3   policy=pii-masking' },
        { text: '[2025-01-07T14:23:01.460Z] G3   field=ssn action=MASK original=123-45-6789 masked=XXX-XX-6789' },
        { text: '[2025-01-07T14:23:01.462Z] DONE result=SUCCESS fields_masked=1' },
      ],
      withoutNote: 'SSN "123-45-6789" would be returned in plain text. No masking applied.',
    },
  },

  // ==================== CROSS BRANCH ====================
  cross_branch: {
    teller: {
      readable: [
        { type: 'request', text: '→ Incoming request: get_account_details', highlight: 'get_account_details' },
        { type: 'context', text: '  User: Bank Teller (E-1234) | Branch: Central' },
        { type: 'context', text: '  Target: Account #67890 | Branch: Downtown' },
        { type: 'blank', text: '' },
        { type: 'gate', tag: 'GATE 1', text: 'Tool discovery filter' },
        { type: 'context', text: '  Policy: role-based-tool-access' },
        { type: 'context', text: '  Checking tool visibility for role "teller"...' },
        { type: 'decision', tag: 'PASS', text: 'Tool visible (3 of 12 permitted)' },
        { type: 'blank', text: '' },
        { type: 'gate', tag: 'GATE 2', text: 'Execution authorization' },
        { type: 'context', text: '  Policy: branch-boundary-enforcement' },
        { type: 'context', text: '  Checking: user.branch == resource.branch' },
        { type: 'context', text: '  Central ≠ Downtown', slow: true },
        { type: 'blank', text: '' },
        { type: 'deny', tag: 'DENY', text: 'Branch boundary violation' },
        { type: 'deny-context', text: '  User branch "Central" cannot access "Downtown" resources' },
        { type: 'deny-context', text: '  Request blocked. MCP server was not contacted.' },
      ],
      raw: [
        { text: '[2025-01-07T14:23:01.234Z] REQ  tool=get_account_details user=E-1234 role=teller branch=central' },
        { text: '[2025-01-07T14:23:01.235Z] CTX  target_account=67890 target_branch=downtown' },
        { text: '[2025-01-07T14:23:01.238Z] G1   policy=role-based-tool-access' },
        { text: '[2025-01-07T14:23:01.240Z] G1   decision=PERMIT tools_visible=3 tools_total=12' },
        { text: '[2025-01-07T14:23:01.245Z] G2   policy=branch-boundary-enforcement' },
        { text: '[2025-01-07T14:23:01.248Z] G2   check=branch_match user_branch=central resource_branch=downtown' },
        { text: '[2025-01-07T14:23:01.250Z] G2   decision=DENY reason="branch_boundary_violation"' },
        { text: '[2025-01-07T14:23:01.251Z] DONE result=BLOCKED gate=2 mcp_contacted=false' },
      ],
      withoutNote: 'Request would succeed. Teller could access any branch\'s customer data.',
    },
    loan_officer: {
      readable: [
        { type: 'request', text: '→ Incoming request: get_account_details', highlight: 'get_account_details' },
        { type: 'context', text: '  User: Loan Officer (E-5678) | Branch: Central' },
        { type: 'context', text: '  Target: Account #67890 | Branch: Downtown' },
        { type: 'blank', text: '' },
        { type: 'gate', tag: 'GATE 1', text: 'Tool discovery filter' },
        { type: 'context', text: '  Policy: role-based-tool-access' },
        { type: 'context', text: '  Checking tool visibility for role "loan_officer"...' },
        { type: 'decision', tag: 'PASS', text: 'Tool visible (7 of 12 permitted)' },
        { type: 'blank', text: '' },
        { type: 'gate', tag: 'GATE 2', text: 'Execution authorization' },
        { type: 'context', text: '  Policy: branch-boundary-enforcement' },
        { type: 'context', text: '  Checking: user.branch == resource.branch' },
        { type: 'context', text: '  Central ≠ Downtown', slow: true },
        { type: 'blank', text: '' },
        { type: 'deny', tag: 'DENY', text: 'Branch boundary violation' },
        { type: 'deny-context', text: '  User branch "Central" cannot access "Downtown" resources' },
        { type: 'deny-context', text: '  Request blocked. MCP server was not contacted.' },
      ],
      raw: [
        { text: '[2025-01-07T14:23:01.234Z] REQ  tool=get_account_details user=E-5678 role=loan_officer branch=central' },
        { text: '[2025-01-07T14:23:01.235Z] CTX  target_account=67890 target_branch=downtown' },
        { text: '[2025-01-07T14:23:01.238Z] G1   policy=role-based-tool-access' },
        { text: '[2025-01-07T14:23:01.240Z] G1   decision=PERMIT tools_visible=7 tools_total=12' },
        { text: '[2025-01-07T14:23:01.245Z] G2   policy=branch-boundary-enforcement' },
        { text: '[2025-01-07T14:23:01.248Z] G2   check=branch_match user_branch=central resource_branch=downtown' },
        { text: '[2025-01-07T14:23:01.250Z] G2   decision=DENY reason="branch_boundary_violation"' },
        { text: '[2025-01-07T14:23:01.251Z] DONE result=BLOCKED gate=2 mcp_contacted=false' },
      ],
      withoutNote: 'Request would succeed. Loan officer could access any branch\'s data.',
    },
    branch_manager: {
      readable: [
        { type: 'request', text: '→ Incoming request: get_account_details', highlight: 'get_account_details' },
        { type: 'context', text: '  User: Branch Manager (E-9012) | Branch: Central' },
        { type: 'context', text: '  Target: Account #67890 | Branch: Downtown' },
        { type: 'blank', text: '' },
        { type: 'gate', tag: 'GATE 1', text: 'Tool discovery filter' },
        { type: 'context', text: '  Policy: role-based-tool-access' },
        { type: 'context', text: '  Checking tool visibility for role "branch_manager"...' },
        { type: 'decision', tag: 'PASS', text: 'Tool visible (11 of 12 permitted)' },
        { type: 'blank', text: '' },
        { type: 'gate', tag: 'GATE 2', text: 'Execution authorization' },
        { type: 'context', text: '  Policy: branch-boundary-enforcement' },
        { type: 'context', text: '  Checking scope permissions...' },
        { type: 'context', text: '  Role "branch_manager" has scope: all_branches' },
        { type: 'decision', tag: 'PASS', text: 'Cross-branch access permitted' },
        { type: 'blank', text: '' },
        { type: 'forward', text: '→ Forwarding to MCP server...' },
        { type: 'response', text: '← Response received (192 bytes)' },
        { type: 'blank', text: '' },
        { type: 'gate', tag: 'GATE 3', text: 'Response masking' },
        { type: 'context', text: '  Policy: pii-masking' },
        { type: 'context', text: '  Scanning response fields...' },
        { type: 'context', text: '  Field "ssn" contains PII' },
        { type: 'mask', tag: 'MASK', text: 'ssn: 987-65-4321', transform: 'XXX-XX-4321' },
        { type: 'blank', text: '' },
        { type: 'done', tag: 'DONE', text: 'Response delivered to agent (1 field masked)' },
      ],
      raw: [
        { text: '[2025-01-07T14:23:01.234Z] REQ  tool=get_account_details user=E-9012 role=branch_manager branch=central' },
        { text: '[2025-01-07T14:23:01.235Z] CTX  target_account=67890 target_branch=downtown' },
        { text: '[2025-01-07T14:23:01.238Z] G1   policy=role-based-tool-access' },
        { text: '[2025-01-07T14:23:01.240Z] G1   decision=PERMIT tools_visible=11 tools_total=12' },
        { text: '[2025-01-07T14:23:01.245Z] G2   policy=branch-boundary-enforcement' },
        { text: '[2025-01-07T14:23:01.248Z] G2   check=scope user_scope=all_branches' },
        { text: '[2025-01-07T14:23:01.250Z] G2   decision=PERMIT' },
        { text: '[2025-01-07T14:23:01.312Z] FWD  endpoint=mcp://acme-bank/account-management' },
        { text: '[2025-01-07T14:23:01.456Z] RSP  status=200 bytes=192' },
        { text: '[2025-01-07T14:23:01.458Z] G3   policy=pii-masking' },
        { text: '[2025-01-07T14:23:01.460Z] G3   field=ssn action=MASK original=987-65-4321 masked=XXX-XX-4321' },
        { text: '[2025-01-07T14:23:01.462Z] DONE result=SUCCESS fields_masked=1' },
      ],
      withoutNote: 'Any user could access any branch\'s data. No scope enforcement.',
    },
  },

  // ==================== LOAN APPROVAL ====================
  loan_approval: {
    teller: {
      readable: [
        { type: 'request', text: '→ Incoming request: approve_loan', highlight: 'approve_loan' },
        { type: 'context', text: '  User: Bank Teller (E-1234) | Branch: Central' },
        { type: 'context', text: '  Params: { loan_id: "L-2024-0892", amount: $75,000 }' },
        { type: 'blank', text: '' },
        { type: 'gate', tag: 'GATE 1', text: 'Tool discovery filter' },
        { type: 'context', text: '  Policy: role-based-tool-access' },
        { type: 'context', text: '  Checking tool visibility for role "teller"...' },
        { type: 'context', text: '  Tool "approve_loan" not in permitted set', slow: true },
        { type: 'blank', text: '' },
        { type: 'deny', tag: 'DENY', text: 'Tool not available' },
        { type: 'deny-context', text: '  Role "teller" cannot see or use "approve_loan"' },
        { type: 'deny-context', text: '  Tool is hidden from this user\'s agent' },
        { type: 'deny-context', text: '  Request blocked. MCP server was not contacted.' },
      ],
      raw: [
        { text: '[2025-01-07T14:23:01.234Z] REQ  tool=approve_loan user=E-1234 role=teller branch=central' },
        { text: '[2025-01-07T14:23:01.235Z] CTX  loan_id=L-2024-0892 amount=75000' },
        { text: '[2025-01-07T14:23:01.238Z] G1   policy=role-based-tool-access' },
        { text: '[2025-01-07T14:23:01.240Z] G1   decision=DENY reason="tool_not_permitted" tool=approve_loan role=teller' },
        { text: '[2025-01-07T14:23:01.241Z] DONE result=BLOCKED gate=1 mcp_contacted=false' },
      ],
      withoutNote: 'Tool would be visible. Teller\'s agent could attempt loan approvals.',
    },
    loan_officer: {
      readable: [
        { type: 'request', text: '→ Incoming request: approve_loan', highlight: 'approve_loan' },
        { type: 'context', text: '  User: Loan Officer (E-5678) | Branch: Central' },
        { type: 'context', text: '  Params: { loan_id: "L-2024-0892", amount: $75,000 }' },
        { type: 'blank', text: '' },
        { type: 'gate', tag: 'GATE 1', text: 'Tool discovery filter' },
        { type: 'context', text: '  Policy: role-based-tool-access' },
        { type: 'context', text: '  Checking tool visibility for role "loan_officer"...' },
        { type: 'decision', tag: 'PASS', text: 'Tool visible (7 of 12 permitted)' },
        { type: 'blank', text: '' },
        { type: 'gate', tag: 'GATE 2', text: 'Execution authorization' },
        { type: 'context', text: '  Policy: loan-approval-limits' },
        { type: 'context', text: '  Checking: amount <= role.max_approval' },
        { type: 'context', text: '  $75,000 > $50,000 (loan_officer limit)', slow: true },
        { type: 'blank', text: '' },
        { type: 'deny', tag: 'DENY', text: 'Approval limit exceeded' },
        { type: 'deny-context', text: '  Loan amount $75,000 exceeds limit of $50,000' },
        { type: 'deny-context', text: '  Suggestion: Escalate to Branch Manager' },
        { type: 'deny-context', text: '  Request blocked. MCP server was not contacted.' },
      ],
      raw: [
        { text: '[2025-01-07T14:23:01.234Z] REQ  tool=approve_loan user=E-5678 role=loan_officer branch=central' },
        { text: '[2025-01-07T14:23:01.235Z] CTX  loan_id=L-2024-0892 amount=75000' },
        { text: '[2025-01-07T14:23:01.238Z] G1   policy=role-based-tool-access' },
        { text: '[2025-01-07T14:23:01.240Z] G1   decision=PERMIT tools_visible=7 tools_total=12' },
        { text: '[2025-01-07T14:23:01.245Z] G2   policy=loan-approval-limits' },
        { text: '[2025-01-07T14:23:01.248Z] G2   check=amount_limit requested=75000 max=50000' },
        { text: '[2025-01-07T14:23:01.250Z] G2   decision=DENY reason="approval_limit_exceeded"' },
        { text: '[2025-01-07T14:23:01.251Z] DONE result=BLOCKED gate=2 mcp_contacted=false' },
      ],
      withoutNote: 'No limit enforcement. Loan officer could approve any amount.',
    },
    branch_manager: {
      readable: [
        { type: 'request', text: '→ Incoming request: approve_loan', highlight: 'approve_loan' },
        { type: 'context', text: '  User: Branch Manager (E-9012) | Branch: Central' },
        { type: 'context', text: '  Params: { loan_id: "L-2024-0892", amount: $75,000 }' },
        { type: 'blank', text: '' },
        { type: 'gate', tag: 'GATE 1', text: 'Tool discovery filter' },
        { type: 'context', text: '  Policy: role-based-tool-access' },
        { type: 'context', text: '  Checking tool visibility for role "branch_manager"...' },
        { type: 'decision', tag: 'PASS', text: 'Tool visible (11 of 12 permitted)' },
        { type: 'blank', text: '' },
        { type: 'gate', tag: 'GATE 2', text: 'Execution authorization' },
        { type: 'context', text: '  Policy: loan-approval-limits' },
        { type: 'context', text: '  Checking: amount <= role.max_approval' },
        { type: 'context', text: '  $75,000 <= $500,000 (branch_manager limit)' },
        { type: 'decision', tag: 'PASS', text: 'Within approval authority' },
        { type: 'blank', text: '' },
        { type: 'forward', text: '→ Forwarding to MCP server...' },
        { type: 'response', text: '← Response received (94 bytes)' },
        { type: 'blank', text: '' },
        { type: 'gate', tag: 'GATE 3', text: 'Response masking' },
        { type: 'context', text: '  Policy: pii-masking' },
        { type: 'context', text: '  Scanning response fields...' },
        { type: 'context', text: '  No sensitive fields detected' },
        { type: 'decision', tag: 'PASS', text: 'No masking required' },
        { type: 'blank', text: '' },
        { type: 'done', tag: 'DONE', text: 'Loan approved successfully' },
      ],
      raw: [
        { text: '[2025-01-07T14:23:01.234Z] REQ  tool=approve_loan user=E-9012 role=branch_manager branch=central' },
        { text: '[2025-01-07T14:23:01.235Z] CTX  loan_id=L-2024-0892 amount=75000' },
        { text: '[2025-01-07T14:23:01.238Z] G1   policy=role-based-tool-access' },
        { text: '[2025-01-07T14:23:01.240Z] G1   decision=PERMIT tools_visible=11 tools_total=12' },
        { text: '[2025-01-07T14:23:01.245Z] G2   policy=loan-approval-limits' },
        { text: '[2025-01-07T14:23:01.248Z] G2   check=amount_limit requested=75000 max=500000' },
        { text: '[2025-01-07T14:23:01.250Z] G2   decision=PERMIT' },
        { text: '[2025-01-07T14:23:01.312Z] FWD  endpoint=mcp://acme-bank/loan-services' },
        { text: '[2025-01-07T14:23:01.456Z] RSP  status=200 bytes=94' },
        { text: '[2025-01-07T14:23:01.458Z] G3   policy=pii-masking' },
        { text: '[2025-01-07T14:23:01.460Z] G3   decision=PASS fields_masked=0' },
        { text: '[2025-01-07T14:23:01.462Z] DONE result=SUCCESS' },
      ],
      withoutNote: 'No approval limits enforced. Any user could approve any loan amount.',
    },
  },

  // ==================== ADMIN OVERRIDE ====================
  admin_override: {
    teller: {
      readable: [
        { type: 'request', text: '→ Incoming request: override_transaction_limit', highlight: 'override_transaction_limit' },
        { type: 'context', text: '  User: Bank Teller (E-1234) | Branch: Central' },
        { type: 'context', text: '  Params: { account_id: "12345", new_limit: $50,000 }' },
        { type: 'blank', text: '' },
        { type: 'gate', tag: 'GATE 1', text: 'Tool discovery filter' },
        { type: 'context', text: '  Policy: admin-tool-restriction' },
        { type: 'context', text: '  Checking tool visibility for role "teller"...' },
        { type: 'context', text: '  Tool "override_transaction_limit" requires sysadmin', slow: true },
        { type: 'blank', text: '' },
        { type: 'deny', tag: 'DENY', text: 'Tool not available' },
        { type: 'deny-context', text: '  Administrative tool hidden from role "teller"' },
        { type: 'deny-context', text: '  This tool is not visible to the agent' },
        { type: 'deny-context', text: '  Request blocked. MCP server was not contacted.' },
      ],
      raw: [
        { text: '[2025-01-07T14:23:01.234Z] REQ  tool=override_transaction_limit user=E-1234 role=teller branch=central' },
        { text: '[2025-01-07T14:23:01.235Z] CTX  account_id=12345 new_limit=50000' },
        { text: '[2025-01-07T14:23:01.238Z] G1   policy=admin-tool-restriction' },
        { text: '[2025-01-07T14:23:01.240Z] G1   decision=DENY reason="requires_sysadmin" role=teller clearance=standard' },
        { text: '[2025-01-07T14:23:01.241Z] DONE result=BLOCKED gate=1 mcp_contacted=false' },
      ],
      withoutNote: 'Admin tools visible to all. Any user\'s agent could discover sensitive operations.',
    },
    loan_officer: {
      readable: [
        { type: 'request', text: '→ Incoming request: override_transaction_limit', highlight: 'override_transaction_limit' },
        { type: 'context', text: '  User: Loan Officer (E-5678) | Branch: Central' },
        { type: 'context', text: '  Params: { account_id: "12345", new_limit: $50,000 }' },
        { type: 'blank', text: '' },
        { type: 'gate', tag: 'GATE 1', text: 'Tool discovery filter' },
        { type: 'context', text: '  Policy: admin-tool-restriction' },
        { type: 'context', text: '  Checking tool visibility for role "loan_officer"...' },
        { type: 'context', text: '  Tool "override_transaction_limit" requires sysadmin', slow: true },
        { type: 'blank', text: '' },
        { type: 'deny', tag: 'DENY', text: 'Tool not available' },
        { type: 'deny-context', text: '  Administrative tool hidden from role "loan_officer"' },
        { type: 'deny-context', text: '  This tool is not visible to the agent' },
        { type: 'deny-context', text: '  Request blocked. MCP server was not contacted.' },
      ],
      raw: [
        { text: '[2025-01-07T14:23:01.234Z] REQ  tool=override_transaction_limit user=E-5678 role=loan_officer branch=central' },
        { text: '[2025-01-07T14:23:01.235Z] CTX  account_id=12345 new_limit=50000' },
        { text: '[2025-01-07T14:23:01.238Z] G1   policy=admin-tool-restriction' },
        { text: '[2025-01-07T14:23:01.240Z] G1   decision=DENY reason="requires_sysadmin" role=loan_officer clearance=elevated' },
        { text: '[2025-01-07T14:23:01.241Z] DONE result=BLOCKED gate=1 mcp_contacted=false' },
      ],
      withoutNote: 'Admin tools visible to all. Any user\'s agent could discover sensitive operations.',
    },
    branch_manager: {
      readable: [
        { type: 'request', text: '→ Incoming request: override_transaction_limit', highlight: 'override_transaction_limit' },
        { type: 'context', text: '  User: Branch Manager (E-9012) | Branch: Central' },
        { type: 'context', text: '  Params: { account_id: "12345", new_limit: $50,000 }' },
        { type: 'blank', text: '' },
        { type: 'gate', tag: 'GATE 1', text: 'Tool discovery filter' },
        { type: 'context', text: '  Policy: admin-tool-restriction' },
        { type: 'context', text: '  Checking tool visibility for role "branch_manager"...' },
        { type: 'context', text: '  Tool "override_transaction_limit" requires sysadmin' },
        { type: 'context', text: '  Role "branch_manager" clearance: executive' },
        { type: 'context', text: '  Required clearance: system_admin', slow: true },
        { type: 'blank', text: '' },
        { type: 'deny', tag: 'DENY', text: 'Insufficient clearance' },
        { type: 'deny-context', text: '  Tool requires system administrator privileges' },
        { type: 'deny-context', text: '  Even "branch_manager" cannot access this tool' },
        { type: 'deny-context', text: '  Request blocked. MCP server was not contacted.' },
      ],
      raw: [
        { text: '[2025-01-07T14:23:01.234Z] REQ  tool=override_transaction_limit user=E-9012 role=branch_manager branch=central' },
        { text: '[2025-01-07T14:23:01.235Z] CTX  account_id=12345 new_limit=50000' },
        { text: '[2025-01-07T14:23:01.238Z] G1   policy=admin-tool-restriction' },
        { text: '[2025-01-07T14:23:01.240Z] G1   check=clearance role=branch_manager clearance=executive required=system_admin' },
        { text: '[2025-01-07T14:23:01.242Z] G1   decision=DENY reason="insufficient_clearance"' },
        { text: '[2025-01-07T14:23:01.243Z] DONE result=BLOCKED gate=1 mcp_contacted=false' },
      ],
      withoutNote: 'All 12 tools visible to all users. No privilege separation for admin operations.',
    },
  },
};

// ============================================================================
// SOUND SYSTEM (Web Audio API)
// ============================================================================

class SoundSystem {
  constructor() {
    this.audioContext = null;
    this.enabled = true;
    this.initialized = false;
  }

  init() {
    if (this.initialized) return;
    try {
      this.audioContext = new (window.AudioContext || window.webkitAudioContext)();
      this.initialized = true;
    } catch (e) {
      console.warn('Web Audio API not supported');
      this.enabled = false;
    }
  }

  setEnabled(enabled) {
    this.enabled = enabled;
  }

  playTone(frequency, duration, type = 'sine', volume = 0.1) {
    if (!this.enabled || !this.audioContext) return;
    
    try {
      const oscillator = this.audioContext.createOscillator();
      const gainNode = this.audioContext.createGain();
      
      oscillator.connect(gainNode);
      gainNode.connect(this.audioContext.destination);
      
      oscillator.frequency.value = frequency;
      oscillator.type = type;
      gainNode.gain.value = volume;
      
      oscillator.start();
      gainNode.gain.exponentialRampToValueAtTime(0.001, this.audioContext.currentTime + duration);
      oscillator.stop(this.audioContext.currentTime + duration);
    } catch (e) {
      // Ignore audio errors
    }
  }

  playKeyClick() {
    this.playTone(800, 0.015, 'square', 0.03);
  }

  playGateStart() {
    this.playTone(220, 0.1, 'sine', 0.08);
  }

  playPass() {
    this.playTone(440, 0.1, 'sine', 0.1);
    setTimeout(() => this.playTone(554, 0.15, 'sine', 0.1), 80);
  }

  playDeny() {
    this.playTone(180, 0.25, 'triangle', 0.12);
  }

  playMask() {
    // White noise burst for masking sound
    if (!this.enabled || !this.audioContext) return;
    try {
      const bufferSize = this.audioContext.sampleRate * 0.1;
      const buffer = this.audioContext.createBuffer(1, bufferSize, this.audioContext.sampleRate);
      const data = buffer.getChannelData(0);
      for (let i = 0; i < bufferSize; i++) {
        data[i] = (Math.random() * 2 - 1) * (1 - i / bufferSize);
      }
      const source = this.audioContext.createBufferSource();
      const gainNode = this.audioContext.createGain();
      source.buffer = buffer;
      source.connect(gainNode);
      gainNode.connect(this.audioContext.destination);
      gainNode.gain.value = 0.08;
      source.start();
    } catch (e) {
      // Ignore
    }
  }

  playComplete() {
    this.playTone(523, 0.15, 'sine', 0.08);
    setTimeout(() => this.playTone(659, 0.15, 'sine', 0.08), 100);
    setTimeout(() => this.playTone(784, 0.2, 'sine', 0.08), 200);
  }
}

const soundSystem = new SoundSystem();

// ============================================================================
// HELPER COMPONENTS
// ============================================================================

const AlphaTag = () => (
  <span className="alpha-tag">Alpha</span>
);

// ============================================================================
// HEADER COMPONENT
// ============================================================================

const Header = ({ isSticky }) => {
  const scrollTo = (id) => {
    const el = document.getElementById(id);
    if (el) {
      el.scrollIntoView({ behavior: 'smooth' });
    }
  };

  return (
    <header className={`site-header ${isSticky ? 'sticky' : ''}`}>
      <div className="header-inner">
        <div className="logo">
          <div className="logo-icon">
            <Shield size={18} />
          </div>
          <span className="logo-text">PlainID MCP Authorizer</span>
          <AlphaTag />
        </div>
        <nav className="header-nav">
          <button onClick={() => scrollTo('overview')} className="nav-link">overview</button>
          <button onClick={() => scrollTo('demo')} className="nav-link">demo</button>
          <button onClick={() => scrollTo('incidents')} className="nav-link">incidents</button>
        </nav>
      </div>
    </header>
  );
};

// ============================================================================
// HERO SECTION
// ============================================================================

const HeroSection = () => {
  const scrollToDemo = () => {
    const el = document.getElementById('demo');
    if (el) el.scrollIntoView({ behavior: 'smooth' });
  };

  return (
    <section className="hero">
      <div className="hero-label">MCP Authorization Proxy</div>
      <h1 className="hero-title">
        Control what your<br />
        AI agents <span className="accent">see</span><br />
        and <span className="accent">do</span>.
      </h1>
      <p className="hero-subtitle">
        PlainID sits between your agents and MCP servers.
        Every tool call. Every response. Authorized in real-time.
      </p>
      <div className="scroll-indicator" onClick={scrollToDemo}>
        <span className="scroll-line"></span>
        <span>Scroll to explore</span>
      </div>
    </section>
  );
};

// ============================================================================
// PROBLEM SECTION
// ============================================================================

const ProblemSection = () => (
  <section className="problem-section" id="overview">
    <div className="section-label">01 — THE PROBLEM</div>
    <h2 className="section-title">
      MCP servers weren't designed with enterprise authorization in mind.
    </h2>
    <div className="problem-grid">
      <div className="problem-card">
        <div className="problem-number">01</div>
        <h3>Tool Exposure</h3>
        <p>Every tool is visible to every user. Agents see admin capabilities they should never know exist.</p>
      </div>
      <div className="problem-card">
        <div className="problem-number">02</div>
        <h3>No Boundaries</h3>
        <p>No scope enforcement. A teller can query any branch. A user can access any tenant.</p>
      </div>
      <div className="problem-card">
        <div className="problem-number">03</div>
        <h3>Data Leakage</h3>
        <p>Responses contain raw PII. SSNs, account numbers, and confidential data flow freely.</p>
      </div>
    </div>
  </section>
);

// ============================================================================
// SOLUTION SECTION
// ============================================================================

const SolutionSection = () => (
  <section className="solution-section">
    <div className="solution-left">
      <div className="section-label light">02 — THE SOLUTION</div>
      <h2>Three gates of<br />authorization.</h2>
      <p>
        PlainID intercepts every interaction between your AI agent and MCP servers.
        We filter tools, validate execution, and mask responses — all based on policy.
      </p>
    </div>
    <div className="solution-right">
      <div className="pipeline-vertical">
        <div className="pipeline-step">
          <div className="step-marker user">U</div>
          <div className="step-content">
            <h4>User Request</h4>
            <p>Authenticated user initiates action via AI agent</p>
          </div>
        </div>
        <div className="pipeline-step">
          <div className="step-marker gate1">1</div>
          <div className="step-content">
            <h4>Gate 1: Tool Filter</h4>
            <p>Hide unauthorized tools from agent's view</p>
          </div>
        </div>
        <div className="pipeline-step">
          <div className="step-marker gate2">2</div>
          <div className="step-content">
            <h4>Gate 2: Execution Auth</h4>
            <p>Validate parameters, scopes, and limits</p>
          </div>
        </div>
        <div className="pipeline-step">
          <div className="step-marker gate3">3</div>
          <div className="step-content">
            <h4>Gate 3: Response Mask</h4>
            <p>Redact sensitive fields before delivery</p>
          </div>
        </div>
        <div className="pipeline-step">
          <div className="step-marker done">✓</div>
          <div className="step-content">
            <h4>Safe Response</h4>
            <p>Agent receives only what policy permits</p>
          </div>
        </div>
      </div>
    </div>
  </section>
);

// ============================================================================
// DEMO SECTION
// ============================================================================

const RoleCard = ({ role, isSelected, onClick, isDisabled }) => {
  const roleData = roles[role];
  const toolsVisible = role === 'teller' ? 3 : role === 'loan_officer' ? 7 : 11;
  
  return (
    <button
      className={`role-card ${isSelected ? 'selected' : ''} ${isDisabled ? 'disabled' : ''}`}
      onClick={() => !isDisabled && onClick(role)}
      disabled={isDisabled}
    >
      <div className="role-icon">{roleData.icon}</div>
      <div className="role-info">
        <div className="role-name">{roleData.name}</div>
        <div className="role-meta">{toolsVisible}/12 tools • {roleData.access}</div>
      </div>
    </button>
  );
};

const ScenarioItem = ({ scenario, isSelected, expectedOutcome, onClick, isDisabled }) => (
  <button
    className={`scenario-item ${isSelected ? 'selected' : ''} ${isDisabled ? 'disabled' : ''}`}
    onClick={() => !isDisabled && onClick(scenario.id)}
    disabled={isDisabled}
  >
    <span className="scenario-name">{scenario.name}</span>
    <span className={`scenario-badge ${expectedOutcome === 'success' ? 'success' : 'denied'}`}>
      {expectedOutcome === 'success' ? '✓ Allow' : '✗ Deny'}
    </span>
  </button>
);

const Terminal = ({
  lines,
  currentLineIndex,
  currentCharIndex,
  isTyping,
  isComplete,
  outputMode,
  soundEnabled,
  showSkip,
  onToggleMode,
  onToggleSound,
  onSkip,
  withoutNote,
}) => {
  const terminalBodyRef = useRef(null);

  useEffect(() => {
    if (terminalBodyRef.current) {
      terminalBodyRef.current.scrollTop = terminalBodyRef.current.scrollHeight;
    }
  }, [lines, currentLineIndex, currentCharIndex]);

  const renderLine = (line, index) => {
    const isCurrentLine = index === currentLineIndex;
    const isPastLine = index < currentLineIndex;
    const isFutureLine = index > currentLineIndex;

    if (isFutureLine) return null;

    // For raw mode, just render the text
    if (outputMode === 'raw') {
      let displayText = line.text;
      if (isCurrentLine && isTyping) {
        displayText = line.text.substring(0, currentCharIndex);
      }
      return (
        <div key={index} className="terminal-line raw">
          <span className="line-text">{displayText}</span>
          {isCurrentLine && isTyping && <span className="cursor">_</span>}
        </div>
      );
    }

    // Readable mode rendering
    if (line.type === 'blank') {
      return <div key={index} className="terminal-line blank">&nbsp;</div>;
    }

    let displayText = line.text;
    if (isCurrentLine && isTyping && !line.tag) {
      displayText = line.text.substring(0, currentCharIndex);
    }

    const lineClass = `terminal-line ${line.type || ''} ${line.type === 'deny' || line.type === 'deny-context' ? 'deny-line' : ''}`;

    // Handle mask transformation
    if (line.type === 'mask' && line.transform) {
      const showTransform = isPastLine || (isCurrentLine && !isTyping);
      return (
        <div key={index} className={lineClass}>
          {line.tag && <span className={`tag tag-${line.tag.toLowerCase().replace(' ', '')}`}>{line.tag}</span>}
          <span className="line-text">
            {line.text}
            {showTransform && (
              <span className="mask-transform"> → <span className="masked-value">{line.transform}</span></span>
            )}
          </span>
        </div>
      );
    }

    return (
      <div key={index} className={lineClass}>
        {line.tag && <span className={`tag tag-${line.tag.toLowerCase().replace(' ', '')}`}>{line.tag}</span>}
        <span className="line-text">
          {line.highlight ? (
            <>
              {displayText.split(line.highlight)[0]}
              <span className="highlight">{line.highlight}</span>
              {displayText.split(line.highlight)[1] || ''}
            </>
          ) : (
            displayText
          )}
        </span>
        {isCurrentLine && isTyping && !line.tag && <span className="cursor">_</span>}
      </div>
    );
  };

  return (
    <div className="terminal">
      <div className="terminal-header">
        <div className="terminal-dots">
          <span className="dot red"></span>
          <span className="dot yellow"></span>
          <span className="dot green"></span>
        </div>
        <div className="terminal-title">authorization.log</div>
        <div className="terminal-controls">
          <button
            className={`mode-toggle ${outputMode === 'raw' ? 'active' : ''}`}
            onClick={onToggleMode}
            title="Toggle output mode"
          >
            {outputMode === 'readable' ? 'Readable' : 'Raw'}
          </button>
          <button
            className="sound-toggle"
            onClick={onToggleSound}
            title={soundEnabled ? 'Mute sounds' : 'Enable sounds'}
          >
            {soundEnabled ? <Volume2 size={14} /> : <VolumeX size={14} />}
          </button>
          {showSkip && (
            <button className="skip-btn" onClick={onSkip}>
              skip <SkipForward size={12} />
            </button>
          )}
        </div>
      </div>
      <div className="terminal-body" ref={terminalBodyRef}>
        {lines.length === 0 ? (
          <div className="terminal-empty">
            <span className="comment">// Select a role and scenario, then run</span>
            <span className="cursor blink">_</span>
          </div>
        ) : (
          <>
            {lines.map((line, index) => renderLine(line, index))}
            {isComplete && withoutNote && (
              <div className="without-note">
                <div className="divider">───────────────────────────────────────────</div>
                <div className="note-content">
                  <span className="warning-icon">⚠</span>
                  <span className="note-label">Without PlainID:</span>
                  <span className="note-text">{withoutNote}</span>
                </div>
              </div>
            )}
          </>
        )}
      </div>
    </div>
  );
};

const DemoSection = () => {
  const [selectedRole, setSelectedRole] = useState('teller');
  const [selectedScenario, setSelectedScenario] = useState('account_lookup');
  const [lines, setLines] = useState([]);
  const [currentLineIndex, setCurrentLineIndex] = useState(-1);
  const [currentCharIndex, setCurrentCharIndex] = useState(0);
  const [isRunning, setIsRunning] = useState(false);
  const [isTyping, setIsTyping] = useState(false);
  const [isComplete, setIsComplete] = useState(false);
  const [hasRunOnce, setHasRunOnce] = useState(false);
  const [outputMode, setOutputMode] = useState('readable');
  const [soundEnabled, setSoundEnabled] = useState(true);
  const [showSkip, setShowSkip] = useState(false);

  const animationRef = useRef(null);
  const skipTimeoutRef = useRef(null);
  const keyClickCounterRef = useRef(0);

  const getOutput = useCallback(() => {
    const scenarioOutputs = terminalOutputs[selectedScenario];
    if (!scenarioOutputs) return { lines: [], withoutNote: '' };
    const roleOutput = scenarioOutputs[selectedRole];
    if (!roleOutput) return { lines: [], withoutNote: '' };
    return {
      lines: outputMode === 'readable' ? roleOutput.readable : roleOutput.raw,
      withoutNote: roleOutput.withoutNote,
    };
  }, [selectedRole, selectedScenario, outputMode]);

  const clearTerminal = useCallback(() => {
    if (animationRef.current) {
      clearTimeout(animationRef.current);
    }
    if (skipTimeoutRef.current) {
      clearTimeout(skipTimeoutRef.current);
    }
    setLines([]);
    setCurrentLineIndex(-1);
    setCurrentCharIndex(0);
    setIsRunning(false);
    setIsTyping(false);
    setIsComplete(false);
    setShowSkip(false);
  }, []);

  const handleRoleChange = (role) => {
    setSelectedRole(role);
    clearTerminal();
  };

  const handleScenarioChange = (scenarioId) => {
    setSelectedScenario(scenarioId);
    clearTerminal();
  };

  const handleToggleMode = () => {
    setOutputMode(prev => prev === 'readable' ? 'raw' : 'readable');
  };

  const handleToggleSound = () => {
    const newValue = !soundEnabled;
    setSoundEnabled(newValue);
    soundSystem.setEnabled(newValue);
    try {
      localStorage.setItem('plainid-mcp-sound', String(newValue));
    } catch (e) {}
  };

  const handleSkip = useCallback(() => {
    if (animationRef.current) {
      clearTimeout(animationRef.current);
    }
    if (skipTimeoutRef.current) {
      clearTimeout(skipTimeoutRef.current);
    }
    
    const output = getOutput();
    setLines(output.lines);
    setCurrentLineIndex(output.lines.length);
    setCurrentCharIndex(0);
    setIsTyping(false);
    setIsRunning(false);
    setIsComplete(true);
    setShowSkip(false);
    setHasRunOnce(true);
  }, [getOutput]);

  const runSimulation = useCallback((quick = false) => {
    soundSystem.init();
    clearTerminal();
    
    const output = getOutput();
    if (output.lines.length === 0) return;

    setLines(output.lines);
    setIsRunning(true);
    setIsComplete(false);

    if (quick) {
      // Quick run - show everything instantly
      setCurrentLineIndex(output.lines.length);
      setCurrentCharIndex(0);
      setIsTyping(false);
      setIsRunning(false);
      setIsComplete(true);
      setHasRunOnce(true);
      return;
    }

    // Show skip button after 2 seconds
    skipTimeoutRef.current = setTimeout(() => {
      setShowSkip(true);
    }, 2000);

    // Start typing animation
    let lineIndex = 0;
    let charIndex = 0;

    const typeNextChar = () => {
      if (lineIndex >= output.lines.length) {
        // Animation complete
        setIsTyping(false);
        setIsRunning(false);
        setIsComplete(true);
        setHasRunOnce(true);
        setShowSkip(false);
        if (soundEnabled) soundSystem.playComplete();
        return;
      }

      const currentLine = output.lines[lineIndex];
      setCurrentLineIndex(lineIndex);

      // Handle blank lines
      if (currentLine.type === 'blank' || outputMode === 'raw' && currentLine.text === '') {
        lineIndex++;
        charIndex = 0;
        animationRef.current = setTimeout(typeNextChar, 100);
        return;
      }

      // Handle lines with tags (instant appearance)
      if (currentLine.tag && charIndex === 0) {
        // Play appropriate sound
        if (soundEnabled) {
          if (currentLine.tag.includes('GATE')) {
            soundSystem.playGateStart();
          } else if (currentLine.tag === 'PASS' || currentLine.tag === 'DONE') {
            soundSystem.playPass();
          } else if (currentLine.tag === 'DENY') {
            soundSystem.playDeny();
          } else if (currentLine.tag === 'MASK') {
            soundSystem.playMask();
          }
        }
        
        // For tag lines, show the whole line
        setCurrentCharIndex(currentLine.text?.length || 0);
        lineIndex++;
        charIndex = 0;
        
        // Pause after decision tags
        const pauseTime = ['PASS', 'DENY', 'MASK', 'DONE'].includes(currentLine.tag) ? 400 : 200;
        animationRef.current = setTimeout(typeNextChar, pauseTime);
        return;
      }

      // Regular typing
      const textToType = outputMode === 'raw' ? currentLine.text : currentLine.text;
      const textLength = textToType?.length || 0;

      if (charIndex < textLength) {
        setIsTyping(true);
        setCurrentCharIndex(charIndex + 1);
        
        // Play key click occasionally
        keyClickCounterRef.current++;
        if (soundEnabled && keyClickCounterRef.current % 3 === 0) {
          soundSystem.playKeyClick();
        }

        // Determine typing speed
        let delay = 35;
        if (currentLine.slow) delay = 80;
        if (currentLine.highlight && textToType.substring(charIndex, charIndex + currentLine.highlight.length) === currentLine.highlight) {
          delay = 50;
        }

        charIndex++;
        animationRef.current = setTimeout(typeNextChar, delay);
      } else {
        // Line complete
        setIsTyping(false);
        lineIndex++;
        charIndex = 0;
        
        // Pause between lines
        animationRef.current = setTimeout(typeNextChar, 150);
      }
    };

    // Start animation after a brief delay
    animationRef.current = setTimeout(typeNextChar, 300);
  }, [getOutput, clearTerminal, outputMode, soundEnabled]);

  // Load sound preference from localStorage
  useEffect(() => {
    try {
      const saved = localStorage.getItem('plainid-mcp-sound');
      if (saved !== null) {
        const enabled = saved === 'true';
        setSoundEnabled(enabled);
        soundSystem.setEnabled(enabled);
      }
    } catch (e) {}
  }, []);

  // Cleanup on unmount
  useEffect(() => {
    return () => {
      if (animationRef.current) clearTimeout(animationRef.current);
      if (skipTimeoutRef.current) clearTimeout(skipTimeoutRef.current);
    };
  }, []);

  const output = getOutput();
  const expectedOutcome = outcomeMatrix[selectedScenario]?.[selectedRole] || 'denied';

  return (
    <section className="demo-section" id="demo">
      <div className="demo-header">
        <div>
          <div className="section-label">03 — INTERACTIVE</div>
          <h2 className="section-title">See it in action</h2>
        </div>
        <div className="demo-controls">
          <button
            className="btn btn-secondary"
            onClick={clearTerminal}
            disabled={!isComplete && !isRunning}
          >
            <RotateCcw size={14} />
            Reset
          </button>
          {hasRunOnce ? (
            <div className="split-button">
              <button
                className="btn btn-primary"
                onClick={() => runSimulation(false)}
                disabled={isRunning}
              >
                <Play size={14} />
                Run
              </button>
              <button
                className="btn btn-primary quick"
                onClick={() => runSimulation(true)}
                disabled={isRunning}
                title="Quick run (no animation)"
              >
                <Zap size={14} />
              </button>
            </div>
          ) : (
            <button
              className="btn btn-primary"
              onClick={() => runSimulation(false)}
              disabled={isRunning}
            >
              <Play size={14} />
              Run
            </button>
          )}
        </div>
      </div>

      <div className="demo-container">
        <div className="config-panel">
          <div className="config-header">Configuration</div>
          <div className="config-body">
            <div className="config-group">
              <div className="config-label">Role</div>
              <div className="role-list">
                {['teller', 'loan_officer', 'branch_manager'].map(role => (
                  <RoleCard
                    key={role}
                    role={role}
                    isSelected={selectedRole === role}
                    onClick={handleRoleChange}
                    isDisabled={isRunning}
                  />
                ))}
              </div>
            </div>
            <div className="config-group">
              <div className="config-label">Scenario</div>
              <div className="scenario-list">
                {scenarios.map(scenario => (
                  <ScenarioItem
                    key={scenario.id}
                    scenario={scenario}
                    isSelected={selectedScenario === scenario.id}
                    expectedOutcome={outcomeMatrix[scenario.id]?.[selectedRole] || 'denied'}
                    onClick={handleScenarioChange}
                    isDisabled={isRunning}
                  />
                ))}
              </div>
            </div>
          </div>
        </div>

        <Terminal
          lines={lines}
          currentLineIndex={currentLineIndex}
          currentCharIndex={currentCharIndex}
          isTyping={isTyping}
          isComplete={isComplete}
          outputMode={outputMode}
          soundEnabled={soundEnabled}
          showSkip={showSkip && isRunning}
          onToggleMode={handleToggleMode}
          onToggleSound={handleToggleSound}
          onSkip={handleSkip}
          withoutNote={output.withoutNote}
        />
      </div>
    </section>
  );
};

// ============================================================================
// INCIDENTS SECTION
// ============================================================================

const IncidentsSection = () => (
  <section className="incidents-section" id="incidents">
    <div className="section-label">04 — REAL WORLD</div>
    <h2 className="section-title">Incidents we prevent</h2>
    <p className="section-subtitle">Recent MCP security events and how PlainID mitigates them.</p>

    <div className="incidents-table">
      <div className="incidents-header">
        <div>Incident</div>
        <div>Description</div>
        <div>Without PlainID</div>
        <div>With PlainID</div>
      </div>
      {incidents.map(incident => (
        <div key={incident.id} className="incident-row">
          <div className="incident-meta">
            <div className="incident-name">{incident.name}</div>
            <div className="incident-company">{incident.company} • {incident.date}</div>
            <span className={`incident-severity ${incident.severity}`}>
              {incident.severity.toUpperCase()}
            </span>
          </div>
          <div className="incident-desc">{incident.description}</div>
          <div className="incident-without">
            <div className="incident-label">✗ Vulnerable</div>
            <p>{incident.without_plainid.outcome}</p>
          </div>
          <div className="incident-with">
            <div className="incident-label">✓ Protected</div>
            <p>{incident.with_plainid.outcome}</p>
          </div>
        </div>
      ))}
    </div>
  </section>
);

// ============================================================================
// FOOTER
// ============================================================================

const Footer = () => (
  <footer className="site-footer">
    <div className="footer-logo">
      <Shield size={16} />
      <span>PlainID MCP Authorizer</span>
      <AlphaTag />
    </div>
    <div className="footer-meta">
      Made by the <a href="mailto:presales@plainid.com">SE Team</a> for walkthrough purposes
    </div>
  </footer>
);

// ============================================================================
// MAIN COMPONENT
// ============================================================================

export default function PlainIDMCPAuthorizerDemo() {
  const [isHeaderSticky, setIsHeaderSticky] = useState(false);

  useEffect(() => {
    const handleScroll = () => {
      const heroHeight = window.innerHeight * 0.8;
      setIsHeaderSticky(window.scrollY > heroHeight);
    };

    window.addEventListener('scroll', handleScroll, { passive: true });
    return () => window.removeEventListener('scroll', handleScroll);
  }, []);

  return (
    <div className="app">
      <Header isSticky={isHeaderSticky} />
      <main>
        <HeroSection />
        <ProblemSection />
        <SolutionSection />
        <DemoSection />
        <IncidentsSection />
      </main>
      <Footer />
    </div>
  );
}
