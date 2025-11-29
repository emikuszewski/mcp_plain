// Demo scenarios with queries and expected outcomes
export const scenarios = [
  {
    id: 'account_lookup_success',
    name: 'Account Lookup',
    query: 'Show me the account details for customer #12345',
    description: 'Basic account lookup - demonstrates successful authorization with response masking',
    tool: 'get_account_details',
    params: { account_id: '12345', branch: 'central' },
    expectedOutcomes: {
      teller: {
        gate1: 'permit', // Tool is available
        gate2: 'permit', // Can execute for own branch
        gate3: 'mask',   // SSN masked
        finalResult: 'success',
        response: {
          account_id: '12345',
          customer_name: 'John Smith',
          account_type: 'Checking',
          ssn: 'XXX-XX-6789',
          branch: 'Central',
          status: 'Active',
          opened_date: '2019-03-15',
        }
      },
      loan_officer: {
        gate1: 'permit',
        gate2: 'permit',
        gate3: 'mask',
        finalResult: 'success',
        response: {
          account_id: '12345',
          customer_name: 'John Smith',
          account_type: 'Checking',
          ssn: 'XXX-XX-6789',
          branch: 'Central',
          status: 'Active',
          opened_date: '2019-03-15',
        }
      },
      branch_manager: {
        gate1: 'permit',
        gate2: 'permit',
        gate3: 'mask',
        finalResult: 'success',
        response: {
          account_id: '12345',
          customer_name: 'John Smith',
          account_type: 'Checking',
          ssn: 'XXX-XX-6789',
          branch: 'Central',
          status: 'Active',
          opened_date: '2019-03-15',
        }
      }
    }
  },
  
  {
    id: 'cross_branch_denied',
    name: 'Cross-Branch Access',
    query: 'Show me accounts from the Downtown branch',
    description: 'Attempts to access data from another branch - demonstrates scope enforcement',
    tool: 'get_account_details',
    params: { account_id: '67890', branch: 'downtown' },
    expectedOutcomes: {
      teller: {
        gate1: 'permit',
        gate2: 'deny',
        gate3: 'skip',
        finalResult: 'denied',
        reason: 'User branch "Central" does not match requested branch "Downtown"',
        policy: 'branch-boundary-enforcement'
      },
      loan_officer: {
        gate1: 'permit',
        gate2: 'deny',
        gate3: 'skip',
        finalResult: 'denied',
        reason: 'User branch "Central" does not match requested branch "Downtown"',
        policy: 'branch-boundary-enforcement'
      },
      branch_manager: {
        gate1: 'permit',
        gate2: 'permit',
        gate3: 'mask',
        finalResult: 'success',
        response: {
          account_id: '67890',
          customer_name: 'Jane Doe',
          account_type: 'Savings',
          ssn: 'XXX-XX-4321',
          branch: 'Downtown',
          status: 'Active',
        }
      }
    }
  },
  
  {
    id: 'loan_tool_access',
    name: 'Loan Status Check',
    query: 'What is the status of loan application #L-789?',
    description: 'Attempts to access loan tools - demonstrates tool filtering',
    tool: 'get_loan_details',
    params: { loan_id: 'L-789' },
    expectedOutcomes: {
      teller: {
        gate1: 'deny',
        gate2: 'skip',
        gate3: 'skip',
        finalResult: 'denied',
        reason: 'Tool "get_loan_details" not available for role "teller"',
        policy: 'role-based-tool-access'
      },
      loan_officer: {
        gate1: 'permit',
        gate2: 'permit',
        gate3: 'partial_mask',
        finalResult: 'success',
        response: {
          loan_id: 'L-789',
          customer_id: '12345',
          customer_name: 'John Smith',
          loan_type: 'Personal',
          amount: 35000,
          status: 'Pending Review',
          interest_rate: '7.5%',
          term_months: 60,
        }
      },
      branch_manager: {
        gate1: 'permit',
        gate2: 'permit',
        gate3: 'full_access',
        finalResult: 'success',
        response: {
          loan_id: 'L-789',
          customer_id: '12345',
          customer_name: 'John Smith',
          loan_type: 'Personal',
          amount: 35000,
          status: 'Pending Review',
          interest_rate: '7.5%',
          term_months: 60,
          credit_score: 720,
          debt_to_income: 0.32,
        }
      }
    }
  },
  
  {
    id: 'loan_approval_within_limit',
    name: 'Loan Approval (Within Limit)',
    query: 'Approve the $40,000 loan for customer #12345',
    description: 'Loan approval within officer limit - demonstrates parameter-level authorization',
    tool: 'approve_loan',
    params: { loan_id: 'L-789', amount: 40000 },
    expectedOutcomes: {
      teller: {
        gate1: 'deny',
        gate2: 'skip',
        gate3: 'skip',
        finalResult: 'denied',
        reason: 'Tool "approve_loan" not available for role "teller"',
        policy: 'role-based-tool-access'
      },
      loan_officer: {
        gate1: 'permit',
        gate2: 'permit',
        gate3: 'pass',
        finalResult: 'success',
        agentCheck: {
          triggered: true,
          action: 'requires_confirmation',
          reason: 'Amount exceeds agent auto-approval limit of $25,000'
        },
        response: {
          loan_id: 'L-789',
          status: 'Approved (Pending Confirmation)',
          approved_amount: 40000,
          approved_by: 'E-5678',
          confirmation_required: true,
        }
      },
      branch_manager: {
        gate1: 'permit',
        gate2: 'permit',
        gate3: 'pass',
        finalResult: 'success',
        agentCheck: {
          triggered: true,
          action: 'requires_confirmation',
          reason: 'Amount exceeds agent auto-approval limit of $25,000'
        },
        response: {
          loan_id: 'L-789',
          status: 'Approved (Pending Confirmation)',
          approved_amount: 40000,
          approved_by: 'E-9012',
          confirmation_required: true,
        }
      }
    }
  },
  
  {
    id: 'loan_approval_over_limit',
    name: 'Loan Approval (Over Limit)',
    query: 'Approve the $75,000 loan for customer #12345',
    description: 'Loan approval exceeding officer limit - demonstrates limit enforcement',
    tool: 'approve_loan',
    params: { loan_id: 'L-456', amount: 75000 },
    expectedOutcomes: {
      teller: {
        gate1: 'deny',
        gate2: 'skip',
        gate3: 'skip',
        finalResult: 'denied',
        reason: 'Tool "approve_loan" not available for role "teller"',
        policy: 'role-based-tool-access'
      },
      loan_officer: {
        gate1: 'permit',
        gate2: 'deny',
        gate3: 'skip',
        finalResult: 'denied',
        reason: 'Loan amount $75,000 exceeds approval limit of $50,000 for role "loan_officer"',
        policy: 'loan-approval-limits',
        suggestion: 'Escalate to Branch Manager for approval'
      },
      branch_manager: {
        gate1: 'permit',
        gate2: 'permit',
        gate3: 'pass',
        finalResult: 'success',
        agentCheck: {
          triggered: true,
          action: 'requires_confirmation',
          reason: 'Amount exceeds agent auto-approval limit of $25,000'
        },
        response: {
          loan_id: 'L-456',
          status: 'Approved (Pending Confirmation)',
          approved_amount: 75000,
          approved_by: 'E-9012',
          confirmation_required: true,
        }
      }
    }
  },
  
  {
    id: 'admin_tool_attempt',
    name: 'Admin Tool Access',
    query: 'Override the transaction limit for account #12345 to $50,000',
    description: 'Attempts to use admin-only tool - demonstrates complete tool hiding',
    tool: 'override_transaction_limit',
    params: { account_id: '12345', new_limit: 50000 },
    expectedOutcomes: {
      teller: {
        gate1: 'deny',
        gate2: 'skip',
        gate3: 'skip',
        finalResult: 'denied',
        reason: 'Tool "override_transaction_limit" is not exposed to any non-admin role',
        policy: 'admin-tool-restriction'
      },
      loan_officer: {
        gate1: 'deny',
        gate2: 'skip',
        gate3: 'skip',
        finalResult: 'denied',
        reason: 'Tool "override_transaction_limit" is not exposed to any non-admin role',
        policy: 'admin-tool-restriction'
      },
      branch_manager: {
        gate1: 'deny',
        gate2: 'skip',
        gate3: 'skip',
        finalResult: 'denied',
        reason: 'Tool "override_transaction_limit" requires system administrator privileges',
        policy: 'admin-tool-restriction'
      }
    }
  }
];

// Get scenario by ID
export const getScenarioById = (scenarioId) => {
  return scenarios.find(s => s.id === scenarioId);
};

// Get outcome for scenario and role
export const getScenarioOutcome = (scenarioId, roleId) => {
  const scenario = getScenarioById(scenarioId);
  if (!scenario) return null;
  return scenario.expectedOutcomes[roleId];
};

export default scenarios;
