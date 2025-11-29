// Sample PlainID authorization policies for MCP
export const policies = {
  'role-based-tool-access': {
    id: 'role-based-tool-access',
    name: 'Role-Based Tool Access',
    description: 'Controls which MCP tools are visible based on user role',
    type: 'tool_discovery',
    gate: 1,
    rules: [
      {
        condition: 'user.role == "teller"',
        allowedTools: ['get_account_details', 'get_account_balance', 'get_transaction_history'],
        deniedTools: ['*_loan_*', '*_admin_*', 'update_*', 'transfer_*', 'override_*']
      },
      {
        condition: 'user.role == "loan_officer"',
        allowedTools: ['get_account_*', 'get_transaction_history', 'get_loan_*', 'calculate_loan_*', 'approve_loan'],
        deniedTools: ['*_admin_*', 'update_*', 'transfer_*', 'override_*']
      },
      {
        condition: 'user.role == "branch_manager"',
        allowedTools: ['get_*', 'calculate_*', 'approve_loan', 'update_account_info', 'transfer_funds', 'generate_audit_report'],
        deniedTools: ['override_*']
      }
    ]
  },
  
  'branch-boundary-enforcement': {
    id: 'branch-boundary-enforcement',
    name: 'Branch Boundary Enforcement',
    description: 'Ensures users can only access data within their authorized branch scope',
    type: 'execution_authorization',
    gate: 2,
    rules: [
      {
        condition: 'user.permissions[tool].scope == "own_branch"',
        check: 'resource.branch == user.branch',
        denyMessage: 'Access denied: Resource branch does not match user branch'
      },
      {
        condition: 'user.permissions[tool].scope == "all_branches"',
        check: 'true',
        allowMessage: 'User has cross-branch access privileges'
      }
    ]
  },
  
  'loan-approval-limits': {
    id: 'loan-approval-limits',
    name: 'Loan Approval Limits',
    description: 'Enforces loan approval amount limits based on role',
    type: 'execution_authorization',
    gate: 2,
    rules: [
      {
        condition: 'tool == "approve_loan" && user.role == "loan_officer"',
        check: 'params.amount <= 50000',
        denyMessage: 'Loan amount exceeds $50,000 limit for loan officers',
        suggestion: 'Escalate to Branch Manager'
      },
      {
        condition: 'tool == "approve_loan" && user.role == "branch_manager"',
        check: 'params.amount <= 500000',
        denyMessage: 'Loan amount exceeds $500,000 limit for branch managers',
        suggestion: 'Escalate to Regional Director'
      }
    ]
  },
  
  'agent-restrictions': {
    id: 'agent-restrictions',
    name: 'AI Agent Restrictions',
    description: 'Applies additional restrictions when AI agent is acting on behalf of user',
    type: 'execution_authorization',
    gate: 2,
    rules: [
      {
        condition: 'agent.present && tool == "approve_loan"',
        check: 'params.amount <= agent.restrictions.maxLoanApproval',
        action: 'require_confirmation',
        message: 'Agent restriction: Loans above $25,000 require human confirmation'
      },
      {
        condition: 'agent.present && tool == "transfer_funds"',
        action: 'require_confirmation',
        message: 'Agent restriction: All fund transfers require human confirmation'
      }
    ]
  },
  
  'pii-masking': {
    id: 'pii-masking',
    name: 'PII Data Masking',
    description: 'Masks personally identifiable information in responses',
    type: 'response_masking',
    gate: 3,
    rules: [
      {
        field: 'ssn',
        condition: 'agent.present || !user.permissions.viewFullSSN',
        mask: 'XXX-XX-{last4}',
        reason: 'SSN masked per data protection policy'
      },
      {
        field: 'account_number',
        condition: 'agent.present',
        mask: '****{last4}',
        reason: 'Account number partially masked for agent access'
      },
      {
        field: 'credit_score',
        condition: 'user.role == "teller"',
        mask: '[REDACTED]',
        reason: 'Credit score not visible to teller role'
      },
      {
        field: 'salary',
        condition: 'agent.present || user.role != "branch_manager"',
        mask: '[REDACTED]',
        reason: 'Salary data restricted'
      }
    ]
  },
  
  'admin-tool-restriction': {
    id: 'admin-tool-restriction',
    name: 'Administrative Tool Restriction',
    description: 'Completely hides administrative tools from non-admin roles',
    type: 'tool_discovery',
    gate: 1,
    rules: [
      {
        tools: ['override_transaction_limit'],
        condition: 'user.clearance != "system_admin"',
        action: 'hide',
        reason: 'Tool requires system administrator privileges'
      }
    ]
  },
  
  'audit-logging': {
    id: 'audit-logging',
    name: 'Audit Logging',
    description: 'Records all authorization decisions for compliance',
    type: 'obligation',
    appliesTo: 'all',
    rules: [
      {
        event: 'tool_discovery',
        log: ['user_id', 'role', 'tools_requested', 'tools_filtered', 'policy_applied']
      },
      {
        event: 'execution_authorization',
        log: ['user_id', 'role', 'tool', 'params', 'decision', 'policy_applied', 'reason']
      },
      {
        event: 'response_masking',
        log: ['user_id', 'role', 'fields_masked', 'masking_policy']
      }
    ]
  }
};

// Get policy by ID
export const getPolicyById = (policyId) => policies[policyId];

// Get policies by gate
export const getPoliciesByGate = (gateNumber) => {
  return Object.values(policies).filter(p => p.gate === gateNumber);
};

// Get policies by type
export const getPoliciesByType = (type) => {
  return Object.values(policies).filter(p => p.type === type);
};

export default policies;
