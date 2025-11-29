// Mock authorization engine that simulates PlainID's decision making
import { getRoleById, getRolePermission } from '../data/roles';
import { agent, checkAgentRestriction, getMaskedValue } from '../data/agents';
import { getToolByName, getAllTools } from '../data/mcpServers';
import { getPolicyById } from '../data/policies';

// Generate a unique request ID
export const generateRequestId = () => {
  return 'req-' + Math.random().toString(36).substr(2, 9) + '-' + Date.now().toString(36);
};

// Generate timestamp
export const generateTimestamp = () => {
  return new Date().toISOString();
};

// Gate 1: Tool Discovery Filter
export const evaluateGate1 = (roleId) => {
  const role = getRoleById(roleId);
  const allTools = getAllTools();
  
  const filteredTools = [];
  const removedTools = [];
  
  allTools.forEach(tool => {
    const permission = getRolePermission(roleId, tool.name);
    if (permission.allowed) {
      filteredTools.push(tool);
    } else {
      removedTools.push({
        name: tool.name,
        reason: `Not authorized for role "${role.name}"`,
        policy: 'role-based-tool-access'
      });
    }
  });
  
  return {
    decision: 'FILTER',
    originalCount: allTools.length,
    filteredCount: filteredTools.length,
    removedCount: removedTools.length,
    filteredTools,
    removedTools,
    policy: getPolicyById('role-based-tool-access'),
    timestamp: generateTimestamp(),
  };
};

// Gate 2: Execution Authorization
export const evaluateGate2 = (roleId, toolName, params) => {
  const role = getRoleById(roleId);
  const permission = getRolePermission(roleId, toolName);
  const tool = getToolByName(toolName);
  
  // Check if tool is allowed at all
  if (!permission.allowed) {
    return {
      decision: 'DENY',
      reason: `Tool "${toolName}" is not authorized for role "${role.name}"`,
      policy: getPolicyById('role-based-tool-access'),
      timestamp: generateTimestamp(),
    };
  }
  
  // Check scope (branch boundary)
  if (permission.scope === 'own_branch' && params.branch && params.branch !== role.branch.toLowerCase()) {
    return {
      decision: 'DENY',
      reason: `User branch "${role.branch}" does not match resource branch "${params.branch}"`,
      policy: getPolicyById('branch-boundary-enforcement'),
      timestamp: generateTimestamp(),
    };
  }
  
  // Check limits (loan approval)
  if (toolName === 'approve_loan' && params.amount) {
    const limit = permission.limit;
    if (params.amount > limit) {
      return {
        decision: 'DENY',
        reason: `Loan amount $${params.amount.toLocaleString()} exceeds approval limit of $${limit.toLocaleString()} for role "${role.name}"`,
        policy: getPolicyById('loan-approval-limits'),
        suggestion: roleId === 'loan_officer' ? 'Escalate to Branch Manager for approval' : 'Escalate to Regional Director',
        timestamp: generateTimestamp(),
      };
    }
  }
  
  // Check transfer limits
  if (toolName === 'transfer_funds' && params.amount) {
    const limit = permission.limit || 0;
    if (params.amount > limit) {
      return {
        decision: 'DENY',
        reason: `Transfer amount $${params.amount.toLocaleString()} exceeds limit of $${limit.toLocaleString()} for role "${role.name}"`,
        policy: getPolicyById('branch-boundary-enforcement'),
        timestamp: generateTimestamp(),
      };
    }
  }
  
  // Check agent restrictions
  let agentCheck = null;
  if (toolName === 'approve_loan' && params.amount) {
    agentCheck = checkAgentRestriction('approve_loan', params);
  } else if (toolName === 'transfer_funds') {
    agentCheck = checkAgentRestriction('transfer_funds', params);
  }
  
  return {
    decision: 'PERMIT',
    reason: `User "${role.name}" is authorized to execute "${toolName}"`,
    scope: permission.scope,
    policy: getPolicyById('role-based-tool-access'),
    agentCheck,
    timestamp: generateTimestamp(),
  };
};

// Gate 3: Response Masking
export const evaluateGate3 = (roleId, responseData) => {
  const role = getRoleById(roleId);
  const maskedFields = [];
  const maskedResponse = { ...responseData };
  
  // Always mask SSN (agent restriction + general policy)
  if (responseData.ssn) {
    maskedResponse.ssn = getMaskedValue('ssn', responseData.ssn);
    maskedFields.push({
      field: 'ssn',
      originalValue: responseData.ssn,
      maskedValue: maskedResponse.ssn,
      reason: 'SSN masked per agent restriction and PII policy',
      policy: 'pii-masking'
    });
  }
  
  // Mask account numbers (agent restriction)
  if (responseData.account_number) {
    maskedResponse.account_number = getMaskedValue('account_number', responseData.account_number);
    maskedFields.push({
      field: 'account_number',
      originalValue: responseData.account_number,
      maskedValue: maskedResponse.account_number,
      reason: 'Account number partially masked for agent access',
      policy: 'pii-masking'
    });
  }
  
  // Mask credit score for non-managers
  if (responseData.credit_score && roleId !== 'branch_manager') {
    maskedResponse.credit_score = '[REDACTED]';
    maskedFields.push({
      field: 'credit_score',
      originalValue: responseData.credit_score,
      maskedValue: '[REDACTED]',
      reason: 'Credit score not visible to non-manager roles',
      policy: 'pii-masking'
    });
  }
  
  // Mask salary data
  if (responseData.salary) {
    maskedResponse.salary = getMaskedValue('salary', responseData.salary);
    maskedFields.push({
      field: 'salary',
      originalValue: responseData.salary,
      maskedValue: '[REDACTED]',
      reason: 'Salary data restricted by agent policy',
      policy: 'pii-masking'
    });
  }
  
  return {
    decision: maskedFields.length > 0 ? 'MASK' : 'PASS',
    maskedFields,
    maskedResponse,
    policy: getPolicyById('pii-masking'),
    timestamp: generateTimestamp(),
  };
};

// Generate full authorization context
export const generateAuthContext = (roleId, toolName, params) => {
  const role = getRoleById(roleId);
  
  return {
    user: {
      id: role.employeeId,
      role: roleId,
      name: role.name,
      branch: role.branch,
      clearance: role.clearance,
      department: role.context.department,
    },
    agent: {
      id: agent.id,
      name: agent.name,
      version: agent.version,
      trust_level: agent.trustLevel,
      restrictions: Object.keys(agent.restrictions).filter(k => agent.restrictions[k]),
    },
    resource: {
      tool: toolName,
      server: getToolByName(toolName)?.server,
      params: params,
    },
    context: {
      time: generateTimestamp(),
      request_id: generateRequestId(),
      session_id: 'session-' + Math.random().toString(36).substr(2, 9),
    }
  };
};

// Generate audit log entry
export const generateAuditEntry = (event, details) => {
  return {
    timestamp: generateTimestamp(),
    event,
    ...details,
  };
};

export default {
  evaluateGate1,
  evaluateGate2,
  evaluateGate3,
  generateAuthContext,
  generateRequestId,
  generateTimestamp,
  generateAuditEntry,
};
