// MCP Server definitions with their tools
export const mcpServers = {
  account_management: {
    id: 'account_management',
    name: 'Account Management MCP Server',
    description: 'Customer account operations and information retrieval',
    endpoint: 'mcp://acme-bank/account-management',
    version: '1.2.0',
    tools: [
      {
        name: 'get_account_details',
        description: 'Retrieve detailed account information for a customer',
        category: 'account',
        sensitivity: 'medium',
        inputSchema: {
          type: 'object',
          properties: {
            account_id: { type: 'string', description: 'The account identifier' }
          },
          required: ['account_id']
        }
      },
      {
        name: 'get_account_balance',
        description: 'Get current balance for an account',
        category: 'account',
        sensitivity: 'medium',
        inputSchema: {
          type: 'object',
          properties: {
            account_id: { type: 'string', description: 'The account identifier' }
          },
          required: ['account_id']
        }
      },
      {
        name: 'get_transaction_history',
        description: 'Retrieve transaction history for an account',
        category: 'account',
        sensitivity: 'medium',
        inputSchema: {
          type: 'object',
          properties: {
            account_id: { type: 'string', description: 'The account identifier' },
            days: { type: 'integer', description: 'Number of days of history', default: 30 }
          },
          required: ['account_id']
        }
      },
      {
        name: 'update_account_info',
        description: 'Update customer account information',
        category: 'account',
        sensitivity: 'high',
        inputSchema: {
          type: 'object',
          properties: {
            account_id: { type: 'string', description: 'The account identifier' },
            fields: { type: 'object', description: 'Fields to update' }
          },
          required: ['account_id', 'fields']
        }
      }
    ]
  },
  
  loan_services: {
    id: 'loan_services',
    name: 'Loan Services MCP Server',
    description: 'Loan processing, eligibility, and approval operations',
    endpoint: 'mcp://acme-bank/loan-services',
    version: '2.0.1',
    tools: [
      {
        name: 'get_loan_details',
        description: 'Retrieve details of a loan application or active loan',
        category: 'loan',
        sensitivity: 'high',
        inputSchema: {
          type: 'object',
          properties: {
            loan_id: { type: 'string', description: 'The loan identifier' }
          },
          required: ['loan_id']
        }
      },
      {
        name: 'calculate_loan_eligibility',
        description: 'Calculate loan eligibility for a customer',
        category: 'loan',
        sensitivity: 'medium',
        inputSchema: {
          type: 'object',
          properties: {
            customer_id: { type: 'string', description: 'The customer identifier' },
            loan_type: { type: 'string', description: 'Type of loan requested' },
            amount: { type: 'number', description: 'Requested loan amount' }
          },
          required: ['customer_id']
        }
      },
      {
        name: 'approve_loan',
        description: 'Approve a loan application',
        category: 'loan',
        sensitivity: 'critical',
        inputSchema: {
          type: 'object',
          properties: {
            loan_id: { type: 'string', description: 'The loan identifier' },
            amount: { type: 'number', description: 'Approved amount' },
            terms: { type: 'object', description: 'Loan terms' }
          },
          required: ['loan_id', 'amount']
        }
      },
      {
        name: 'get_loan_documents',
        description: 'Retrieve documents associated with a loan',
        category: 'loan',
        sensitivity: 'high',
        inputSchema: {
          type: 'object',
          properties: {
            loan_id: { type: 'string', description: 'The loan identifier' }
          },
          required: ['loan_id']
        }
      }
    ]
  },
  
  admin_operations: {
    id: 'admin_operations',
    name: 'Admin Operations MCP Server',
    description: 'Administrative and management operations',
    endpoint: 'mcp://acme-bank/admin-operations',
    version: '1.5.0',
    tools: [
      {
        name: 'get_employee_records',
        description: 'Retrieve employee HR records',
        category: 'admin',
        sensitivity: 'critical',
        inputSchema: {
          type: 'object',
          properties: {
            employee_id: { type: 'string', description: 'The employee identifier' }
          },
          required: ['employee_id']
        }
      },
      {
        name: 'transfer_funds',
        description: 'Transfer funds between accounts',
        category: 'admin',
        sensitivity: 'critical',
        inputSchema: {
          type: 'object',
          properties: {
            from_account: { type: 'string', description: 'Source account' },
            to_account: { type: 'string', description: 'Destination account' },
            amount: { type: 'number', description: 'Transfer amount' }
          },
          required: ['from_account', 'to_account', 'amount']
        }
      },
      {
        name: 'override_transaction_limit',
        description: 'Override daily transaction limit for an account',
        category: 'admin',
        sensitivity: 'critical',
        inputSchema: {
          type: 'object',
          properties: {
            account_id: { type: 'string', description: 'The account identifier' },
            new_limit: { type: 'number', description: 'New transaction limit' }
          },
          required: ['account_id', 'new_limit']
        }
      },
      {
        name: 'generate_audit_report',
        description: 'Generate compliance audit report',
        category: 'admin',
        sensitivity: 'high',
        inputSchema: {
          type: 'object',
          properties: {
            start_date: { type: 'string', description: 'Report start date' },
            end_date: { type: 'string', description: 'Report end date' },
            report_type: { type: 'string', description: 'Type of audit report' }
          },
          required: ['start_date', 'end_date']
        }
      }
    ]
  }
};

// Get all tools from all servers
export const getAllTools = () => {
  const tools = [];
  Object.values(mcpServers).forEach(server => {
    server.tools.forEach(tool => {
      tools.push({
        ...tool,
        server: server.id,
        serverName: server.name,
      });
    });
  });
  return tools;
};

// Get tool by name
export const getToolByName = (toolName) => {
  for (const server of Object.values(mcpServers)) {
    const tool = server.tools.find(t => t.name === toolName);
    if (tool) {
      return {
        ...tool,
        server: server.id,
        serverName: server.name,
      };
    }
  }
  return null;
};

// Get server by ID
export const getServerById = (serverId) => mcpServers[serverId];

export default mcpServers;
