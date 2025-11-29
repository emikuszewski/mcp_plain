// AI Agent identity and restrictions
export const agent = {
  id: 'enterprise-ai-assistant-v2.1',
  name: 'Enterprise AI Assistant',
  version: '2.1',
  trustLevel: 'standard',
  description: 'Acme Federal Bank\'s AI-powered customer service assistant',
  
  // Agent-specific restrictions (applied regardless of user permissions)
  restrictions: {
    // Loan restrictions
    maxLoanApproval: 25000, // Agent cannot approve loans > $25K even if user can
    requiresConfirmationAbove: 10000, // Requires human confirmation for loans > $10K
    
    // Data access restrictions
    canViewSSN: false, // Agent can never view full SSN
    canViewFullAccountNumber: false, // Agent masks account numbers
    canViewSalaryData: false, // Agent cannot access salary information
    
    // Action restrictions
    requiresConfirmationForTransfers: true, // All transfers need human confirmation
    maxTransferWithoutConfirmation: 0,
    
    // Rate limiting
    maxToolCallsPerHour: 100,
    maxToolCallsPerMinute: 10,
  },
  
  // What the agent CAN do
  capabilities: [
    'Account inquiries',
    'Balance checks',
    'Transaction history lookup',
    'Loan eligibility calculations',
    'Document retrieval',
    'Basic loan processing',
  ],
  
  // Compliance certifications
  certifications: [
    'SOC 2 Type II',
    'PCI DSS Level 1',
    'GDPR Compliant',
  ],
};

// Check if agent restriction applies
export const checkAgentRestriction = (action, params) => {
  const restrictions = agent.restrictions;
  
  switch (action) {
    case 'approve_loan':
      if (params.amount > restrictions.maxLoanApproval) {
        return {
          restricted: true,
          reason: `Agent cannot approve loans exceeding $${restrictions.maxLoanApproval.toLocaleString()}`,
          requiresConfirmation: true,
        };
      }
      if (params.amount > restrictions.requiresConfirmationAbove) {
        return {
          restricted: false,
          requiresConfirmation: true,
          reason: `Loans above $${restrictions.requiresConfirmationAbove.toLocaleString()} require human confirmation`,
        };
      }
      return { restricted: false, requiresConfirmation: false };
      
    case 'transfer_funds':
      return {
        restricted: false,
        requiresConfirmation: restrictions.requiresConfirmationForTransfers,
        reason: 'All fund transfers require human confirmation',
      };
      
    case 'view_ssn':
      return {
        restricted: true,
        reason: 'Agent is prohibited from viewing full SSN',
        maskingRequired: true,
      };
      
    case 'view_account_number':
      return {
        restricted: false,
        maskingRequired: true,
        reason: 'Account numbers are partially masked by agent policy',
      };
      
    case 'view_salary':
      return {
        restricted: true,
        reason: 'Agent cannot access salary information',
      };
      
    default:
      return { restricted: false, requiresConfirmation: false };
  }
};

// Get masked value based on agent restrictions
export const getMaskedValue = (fieldType, originalValue) => {
  switch (fieldType) {
    case 'ssn':
      return 'XXX-XX-' + (originalValue ? originalValue.slice(-4) : '****');
    case 'account_number':
      return '****' + (originalValue ? originalValue.slice(-4) : '****');
    case 'phone':
      return '(***) ***-' + (originalValue ? originalValue.slice(-4) : '****');
    case 'salary':
      return '[REDACTED]';
    default:
      return originalValue;
  }
};

export default agent;
