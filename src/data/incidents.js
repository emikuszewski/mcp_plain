// Real-world MCP security incidents and how PlainID prevents them
export const incidents = [
  {
    id: 'asana_cross_tenant',
    name: 'Cross-Tenant Data Exposure',
    company: 'Asana',
    date: 'June 2025',
    severity: 'critical',
    icon: 'users',
    color: 'red',
    description: 'Asana\'s MCP server exposed data from one customer\'s tenant to another',
    details: {
      what_happened: 'Asana\'s new MCP server (introduced May 1, 2025) exposed data from one customer\'s tenant to another due to insufficient tenant isolation.',
      impact: '~1,000 customers affected, MCP taken offline June 5-17, 2025',
      root_cause: 'Missing tenant boundary checks in MCP tool execution',
    },
    without_plainid: {
      title: 'Without PlainID',
      description: 'User A queries MCP server and receives User B\'s data',
      outcome: 'Cross-tenant data exposure',
      risk: 'Data breach, compliance violation, customer trust erosion',
    },
    with_plainid: {
      title: 'With PlainID',
      description: 'PlainID\'s Gate 2 validates tenant context before tool execution',
      policies_applied: ['tenant-isolation', 'resource-boundary-enforcement'],
      outcome: 'Request denied - tenant mismatch detected',
      protection: 'Zero cross-tenant data exposure',
    },
    demo_scenario: {
      query: 'Show me account details for customer #99999',
      user_tenant: 'acme-corp',
      resource_tenant: 'other-corp',
      gate: 2,
      decision: 'DENY',
      policy: 'tenant-isolation',
      reason: 'Resource tenant "other-corp" does not match user tenant "acme-corp"',
    }
  },
  
  {
    id: 'slack_mcp_cve',
    name: 'Sensitive Data Leakage',
    company: 'Slack MCP Server',
    date: 'May 2025',
    severity: 'high',
    icon: 'eye-off',
    color: 'orange',
    cve: 'CVE-2025-34072',
    description: 'Anthropic\'s deprecated Slack MCP server leaked sensitive data in responses',
    details: {
      what_happened: 'A widely used but deprecated Slack MCP server from Anthropic was shown to leak sensitive data in API responses.',
      impact: 'CVE-2025-34072 issued, reference servers archived and unpatched',
      root_cause: 'No response filtering or data masking in MCP responses',
    },
    without_plainid: {
      title: 'Without PlainID',
      description: 'MCP server returns raw data including sensitive fields',
      outcome: 'PII and confidential data exposed in responses',
      risk: 'Privacy violation, regulatory penalties, data misuse',
    },
    with_plainid: {
      title: 'With PlainID',
      description: 'PlainID\'s Gate 3 masks sensitive data before response delivery',
      policies_applied: ['pii-masking', 'response-sanitization'],
      outcome: 'Sensitive fields automatically redacted based on user/agent permissions',
      protection: 'SSN, account numbers, and confidential data masked',
    },
    demo_scenario: {
      query: 'Get full customer profile for #12345',
      sensitive_fields: ['ssn', 'account_number', 'credit_score'],
      gate: 3,
      decision: 'MASK',
      policy: 'pii-masking',
      masked_response: {
        ssn: 'XXX-XX-6789',
        account_number: '****4567',
        credit_score: '[REDACTED]',
      }
    }
  },
  
  {
    id: 'backslash_exposure',
    name: 'Excessive Permissions',
    company: 'Industry-Wide (Backslash Research)',
    date: 'June 2025',
    severity: 'high',
    icon: 'unlock',
    color: 'yellow',
    description: '~7,000 MCP servers found on public web with hundreds allowing unauthenticated access',
    details: {
      what_happened: 'Backslash Security identified ~7,000 MCP servers accessible on the public web, with hundreds open for unauthenticated connections and ~70 having severe vulnerabilities.',
      impact: 'Widespread exposure of MCP endpoints enabling data leakage',
      root_cause: 'MCP servers running with elevated privileges, lack of principle of least privilege',
    },
    without_plainid: {
      title: 'Without PlainID',
      description: 'All MCP tools exposed to all authenticated users regardless of role',
      outcome: 'Low-privilege users can call high-privilege tools',
      risk: 'Privilege escalation, unauthorized actions, data exposure',
    },
    with_plainid: {
      title: 'With PlainID',
      description: 'PlainID\'s Gate 1 filters tool discovery based on user role and permissions',
      policies_applied: ['role-based-tool-access', 'principle-of-least-privilege'],
      outcome: 'Users only see tools they are authorized to use',
      protection: 'Admin tools completely hidden from non-admin users',
    },
    demo_scenario: {
      query: 'List all available tools',
      user_role: 'teller',
      all_tools: 12,
      visible_tools: 3,
      hidden_tools: ['approve_loan', 'transfer_funds', 'override_transaction_limit', 'get_employee_records'],
      gate: 1,
      decision: 'FILTER',
      policy: 'role-based-tool-access',
    }
  }
];

// Get incident by ID
export const getIncidentById = (incidentId) => {
  return incidents.find(i => i.id === incidentId);
};

// Get all incidents
export const getAllIncidents = () => incidents;

export default incidents;
