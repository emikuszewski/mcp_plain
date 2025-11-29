// Role definitions with permissions matrix
export const roles = {
  teller: {
    id: 'teller',
    name: 'Bank Teller',
    access: 'Basic Access',
    employeeId: 'E-1234',
    branch: 'Central',
    clearance: 'standard',
    description: 'Front-line customer service representative',
    permissions: {
      // Account Management MCP Server
      get_account_details: { allowed: true, scope: 'own_branch' },
      get_account_balance: { allowed: true, scope: 'own_branch' },
      get_transaction_history: { allowed: true, scope: 'own_branch', limit: '30_days' },
      update_account_info: { allowed: false },
      
      // Loan Services MCP Server
      get_loan_details: { allowed: false },
      calculate_loan_eligibility: { allowed: false },
      approve_loan: { allowed: false },
      get_loan_documents: { allowed: false },
      
      // Admin Operations MCP Server
      get_employee_records: { allowed: false },
      transfer_funds: { allowed: false },
      override_transaction_limit: { allowed: false },
      generate_audit_report: { allowed: false },
    },
    context: {
      region: 'central',
      department: 'operations',
      maxTransactionView: 30,
    }
  },
  
  loan_officer: {
    id: 'loan_officer',
    name: 'Loan Officer',
    access: 'Limited Access',
    employeeId: 'E-5678',
    branch: 'Central',
    clearance: 'elevated',
    description: 'Processes and approves loan applications',
    permissions: {
      // Account Management MCP Server
      get_account_details: { allowed: true, scope: 'own_branch' },
      get_account_balance: { allowed: true, scope: 'own_branch' },
      get_transaction_history: { allowed: true, scope: 'own_branch', limit: '90_days' },
      update_account_info: { allowed: false },
      
      // Loan Services MCP Server
      get_loan_details: { allowed: true, scope: 'own_branch' },
      calculate_loan_eligibility: { allowed: true, scope: 'own_branch' },
      approve_loan: { allowed: true, scope: 'own_branch', limit: 50000 },
      get_loan_documents: { allowed: true, scope: 'own_branch' },
      
      // Admin Operations MCP Server
      get_employee_records: { allowed: false },
      transfer_funds: { allowed: false },
      override_transaction_limit: { allowed: false },
      generate_audit_report: { allowed: false },
    },
    context: {
      region: 'central',
      department: 'lending',
      maxLoanApproval: 50000,
      maxTransactionView: 90,
    }
  },
  
  branch_manager: {
    id: 'branch_manager',
    name: 'Branch Manager',
    access: 'Full Access',
    employeeId: 'E-9012',
    branch: 'Central',
    clearance: 'executive',
    description: 'Oversees all branch operations',
    permissions: {
      // Account Management MCP Server
      get_account_details: { allowed: true, scope: 'all_branches' },
      get_account_balance: { allowed: true, scope: 'all_branches' },
      get_transaction_history: { allowed: true, scope: 'all_branches', limit: 'full' },
      update_account_info: { allowed: true, scope: 'own_branch' },
      
      // Loan Services MCP Server
      get_loan_details: { allowed: true, scope: 'all_branches' },
      calculate_loan_eligibility: { allowed: true, scope: 'all_branches' },
      approve_loan: { allowed: true, scope: 'own_branch', limit: 500000 },
      get_loan_documents: { allowed: true, scope: 'all_branches' },
      
      // Admin Operations MCP Server
      get_employee_records: { allowed: true, scope: 'direct_reports' },
      transfer_funds: { allowed: true, scope: 'own_branch', limit: 10000 },
      override_transaction_limit: { allowed: false },
      generate_audit_report: { allowed: true, scope: 'own_branch' },
    },
    context: {
      region: 'central',
      department: 'management',
      maxLoanApproval: 500000,
      maxTransferAmount: 10000,
      maxTransactionView: 'unlimited',
    }
  }
};

export const getRoleById = (roleId) => roles[roleId] || roles.teller;

export const getRolePermission = (roleId, toolName) => {
  const role = getRoleById(roleId);
  return role.permissions[toolName] || { allowed: false };
};

export default roles;
