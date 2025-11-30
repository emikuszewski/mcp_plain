import React, { useState, useEffect } from 'react';
import { 
  Shield, User, Bot, Server, Check, X, AlertTriangle, 
  ChevronDown, Play, RotateCcw, Eye, EyeOff,
  Lock, Unlock, ArrowRight, Info,
  CheckCircle, XCircle, Zap, Sparkles, GitCompare, FileWarning
} from 'lucide-react';

// ============================================================================
// Alpha Tag Component
// ============================================================================
const AlphaTag = () => (
  <span className="ml-2 px-1.5 py-0.5 text-xs font-medium bg-violet-100 text-violet-800 rounded uppercase">
    Alpha
  </span>
);

// ============================================================================
// DATA
// ============================================================================

const roles = {
  teller: {
    id: 'teller',
    name: 'Bank Teller',
    icon: '🏦',
    description: 'Front-line customer service',
    access: 'Basic',
    color: 'blue',
    toolsVisible: 3,
    toolsTotal: 12,
  },
  loan_officer: {
    id: 'loan_officer', 
    name: 'Loan Officer',
    icon: '📋',
    description: 'Processes loan applications',
    access: 'Limited',
    color: 'amber',
    toolsVisible: 7,
    toolsTotal: 12,
  },
  branch_manager: {
    id: 'branch_manager',
    name: 'Branch Manager',
    icon: '👔',
    description: 'Oversees all operations',
    access: 'Full',
    color: 'green',
    toolsVisible: 11,
    toolsTotal: 12,
  }
};

const scenarios = [
  {
    id: 'account_lookup',
    name: 'Look up customer account',
    description: 'Basic account inquiry - shows data masking',
    tool: 'get_account_details',
    outcomes: {
      teller: { allowed: true, masked: ['SSN'], result: 'success' },
      loan_officer: { allowed: true, masked: ['SSN'], result: 'success' },
      branch_manager: { allowed: true, masked: ['SSN'], result: 'success' },
    }
  },
  {
    id: 'cross_branch',
    name: 'Access another branch\'s data',
    description: 'Shows branch boundary enforcement',
    tool: 'get_account_details',
    outcomes: {
      teller: { allowed: false, reason: 'Branch boundary violation', result: 'denied' },
      loan_officer: { allowed: false, reason: 'Branch boundary violation', result: 'denied' },
      branch_manager: { allowed: true, masked: ['SSN'], result: 'success' },
    }
  },
  {
    id: 'approve_loan',
    name: 'Approve a $75,000 loan',
    description: 'Shows role-based limits',
    tool: 'approve_loan',
    outcomes: {
      teller: { allowed: false, reason: 'Tool not available', result: 'denied' },
      loan_officer: { allowed: false, reason: 'Exceeds $50K limit', result: 'denied' },
      branch_manager: { allowed: true, masked: [], result: 'success' },
    }
  },
  {
    id: 'admin_override',
    name: 'Override transaction limits',
    description: 'Shows admin tool hiding',
    tool: 'override_transaction_limit',
    outcomes: {
      teller: { allowed: false, reason: 'Tool hidden', result: 'denied' },
      loan_officer: { allowed: false, reason: 'Tool hidden', result: 'denied' },
      branch_manager: { allowed: false, reason: 'Requires sysadmin', result: 'denied' },
    }
  },
];

const incidents = [
  {
    id: 'asana_cross_tenant',
    name: 'Cross-Tenant Data Exposure',
    company: 'Asana',
    date: 'June 2025',
    severity: 'critical',
    description: 'Asana\'s MCP server exposed data from one customer\'s tenant to another due to insufficient tenant isolation.',
    impact: '~1,000 customers affected, MCP taken offline June 5-17, 2025',
    without_plainid: {
      outcome: 'User A queries MCP server and receives User B\'s data. Cross-tenant data breach.',
    },
    with_plainid: {
      outcome: 'PlainID proxy validates tenant context at Gate 2. Request blocked — tenant mismatch detected.',
    },
  },
  {
    id: 'slack_mcp_cve',
    name: 'Sensitive Data Leakage',
    company: 'Slack MCP Server',
    date: 'May 2025',
    severity: 'high',
    cve: 'CVE-2025-34072',
    description: 'A widely used but deprecated Slack MCP server leaked sensitive data in API responses.',
    impact: 'CVE issued, reference servers archived and unpatched',
    without_plainid: {
      outcome: 'MCP server returns raw data including PII and confidential fields to any caller.',
    },
    with_plainid: {
      outcome: 'PlainID proxy intercepts response at Gate 3 and masks sensitive fields before forwarding to agent.',
    },
  },
  {
    id: 'backslash_exposure',
    name: 'Excessive Permissions',
    company: 'Industry-Wide (Backslash Research)',
    date: 'June 2025',
    severity: 'high',
    description: '~7,000 MCP servers found on public web with hundreds allowing unauthenticated access and elevated privileges.',
    impact: 'Widespread exposure enabling data leakage and privilege escalation',
    without_plainid: {
      outcome: 'All MCP tools exposed to all authenticated users regardless of role or need.',
    },
    with_plainid: {
      outcome: 'PlainID proxy filters tools/list response at Gate 1. Agent only sees tools they\'re authorized to use.',
    },
  }
];

// ============================================================================
// COMPONENTS
// ============================================================================

const Header = ({ activeView, onViewChange }) => (
  <header className="bg-white border-b border-gray-100 sticky top-0 z-50">
    <div className="max-w-5xl mx-auto px-4 py-3 flex items-center justify-between">
      <div className="flex items-center space-x-3">
        <div className="w-9 h-9 bg-gradient-to-br from-teal-500 to-teal-600 rounded-lg flex items-center justify-center text-white shadow-sm">
          <Shield size={18} />
        </div>
        <div>
          <h1 className="text-base font-semibold text-gray-900 flex items-center">
            PlainID MCP Authorizer
            <AlphaTag />
          </h1>
          <p className="text-xs text-gray-500">Zero-Trust AI Authorization</p>
        </div>
      </div>
      
      <div className="flex items-center space-x-2">
        <button
          onClick={() => onViewChange('simulation')}
          className={`px-3 py-1.5 text-sm font-medium rounded-lg transition-colors ${
            activeView === 'simulation' 
              ? 'bg-teal-500 text-white' 
              : 'text-gray-600 hover:bg-gray-100'
          }`}
        >
          Simulation
        </button>
        <button
          onClick={() => onViewChange('compare')}
          className={`px-3 py-1.5 text-sm font-medium rounded-lg transition-colors flex items-center ${
            activeView === 'compare' 
              ? 'bg-teal-500 text-white' 
              : 'text-gray-600 hover:bg-gray-100'
          }`}
        >
          <GitCompare size={14} className="mr-1.5" />
          Compare
        </button>
        <button
          onClick={() => onViewChange('incidents')}
          className={`px-3 py-1.5 text-sm font-medium rounded-lg transition-colors flex items-center ${
            activeView === 'incidents' 
              ? 'bg-teal-500 text-white' 
              : 'text-gray-600 hover:bg-gray-100'
          }`}
        >
          <FileWarning size={14} className="mr-1.5" />
          Incidents
        </button>
      </div>
    </div>
  </header>
);

const HeroSection = ({ onStartSimulation }) => (
  <section className="bg-gradient-to-b from-slate-50 to-white py-12">
    <div className="max-w-4xl mx-auto px-4 text-center">
      <h2 className="text-2xl md:text-3xl font-bold text-gray-900 mb-3">
        Dynamic Authorization for
        <span className="text-teal-600"> MCP-Powered Agents</span>
      </h2>
      <p className="text-base text-gray-600 mb-8 max-w-xl mx-auto">
        PlainID sits between your AI agents and MCP servers, ensuring they only see 
        and do what policy permits.
      </p>
      
      <div className="grid md:grid-cols-2 gap-4 mb-8 max-w-2xl mx-auto">
        <div className="bg-white rounded-xl border-2 border-red-100 p-5 text-left">
          <div className="flex items-center mb-3">
            <div className="w-8 h-8 bg-red-100 rounded-full flex items-center justify-center mr-2">
              <Unlock className="text-red-500" size={16} />
            </div>
            <div>
              <h3 className="font-semibold text-gray-900 text-sm">Without PlainID</h3>
              <p className="text-xs text-gray-500">Standard MCP</p>
            </div>
          </div>
          <ul className="space-y-2">
            <li className="flex items-start text-sm">
              <X size={14} className="text-red-500 mr-2 mt-0.5 flex-shrink-0" />
              <span className="text-gray-700">All 12 tools visible to everyone</span>
            </li>
            <li className="flex items-start text-sm">
              <X size={14} className="text-red-500 mr-2 mt-0.5 flex-shrink-0" />
              <span className="text-gray-700">No parameter-level checks</span>
            </li>
            <li className="flex items-start text-sm">
              <X size={14} className="text-red-500 mr-2 mt-0.5 flex-shrink-0" />
              <span className="text-gray-700">SSN & sensitive data exposed</span>
            </li>
          </ul>
        </div>
        
        <div className="bg-white rounded-xl border-2 border-teal-200 p-5 text-left shadow-lg shadow-teal-50">
          <div className="flex items-center mb-3">
            <div className="w-8 h-8 bg-teal-100 rounded-full flex items-center justify-center mr-2">
              <Shield className="text-teal-600" size={16} />
            </div>
            <div>
              <h3 className="font-semibold text-gray-900 text-sm">With PlainID</h3>
              <p className="text-xs text-gray-500">Authorization Proxy</p>
            </div>
          </div>
          <ul className="space-y-2">
            <li className="flex items-start text-sm">
              <Check size={14} className="text-teal-600 mr-2 mt-0.5 flex-shrink-0" />
              <span className="text-gray-700">Only permitted tools visible</span>
            </li>
            <li className="flex items-start text-sm">
              <Check size={14} className="text-teal-600 mr-2 mt-0.5 flex-shrink-0" />
              <span className="text-gray-700">Scope & limit enforcement</span>
            </li>
            <li className="flex items-start text-sm">
              <Check size={14} className="text-teal-600 mr-2 mt-0.5 flex-shrink-0" />
              <span className="text-gray-700">Automatic PII masking</span>
            </li>
          </ul>
        </div>
      </div>
      
      <button
        onClick={onStartSimulation}
        className="inline-flex items-center px-6 py-3 bg-gradient-to-r from-teal-500 to-teal-600 text-white font-medium rounded-xl hover:shadow-lg hover:shadow-teal-100 transition-all"
      >
        <Play size={18} className="mr-2" />
        Run Interactive Simulation
      </button>
    </div>
  </section>
);

const HowItWorks = ({ isExpanded, onToggle }) => (
  <section className="border-b border-gray-100 bg-white">
    <div className="max-w-4xl mx-auto px-4">
      <button
        onClick={onToggle}
        className="w-full py-3 flex items-center justify-between text-left"
      >
        <div className="flex items-center">
          <Info size={16} className="text-teal-500 mr-2" />
          <span className="font-medium text-gray-700 text-sm">How does it work?</span>
        </div>
        <ChevronDown 
          size={18} 
          className={`text-gray-400 transition-transform ${isExpanded ? 'rotate-180' : ''}`} 
        />
      </button>
      
      {isExpanded && (
        <div className="pb-6">
          <div className="bg-slate-50 rounded-xl p-5">
            <div className="flex items-center justify-between max-w-md mx-auto mb-5">
              <div className="text-center">
                <div className="w-12 h-12 bg-blue-100 rounded-lg flex items-center justify-center mx-auto mb-1">
                  <Bot className="text-blue-600" size={20} />
                </div>
                <span className="text-xs text-gray-600">AI Agent</span>
              </div>
              <ArrowRight className="text-gray-300" size={20} />
              <div className="text-center">
                <div className="w-12 h-12 bg-teal-500 rounded-lg flex items-center justify-center mx-auto mb-1 shadow-md">
                  <Shield className="text-white" size={20} />
                </div>
                <span className="text-xs text-teal-700 font-medium">PlainID</span>
              </div>
              <ArrowRight className="text-gray-300" size={20} />
              <div className="text-center">
                <div className="w-12 h-12 bg-green-100 rounded-lg flex items-center justify-center mx-auto mb-1">
                  <Server className="text-green-600" size={20} />
                </div>
                <span className="text-xs text-gray-600">MCP Server</span>
              </div>
            </div>
            
            <div className="grid grid-cols-3 gap-3">
              <div className="bg-white rounded-lg p-3 border border-teal-100">
                <div className="flex items-center mb-1">
                  <div className="w-5 h-5 bg-teal-500 text-white rounded-full flex items-center justify-center text-xs font-bold mr-1.5">1</div>
                  <span className="font-medium text-gray-900 text-xs">Tool Filter</span>
                </div>
                <p className="text-xs text-gray-600">Hide unauthorized tools</p>
              </div>
              <div className="bg-white rounded-lg p-3 border border-blue-100">
                <div className="flex items-center mb-1">
                  <div className="w-5 h-5 bg-blue-500 text-white rounded-full flex items-center justify-center text-xs font-bold mr-1.5">2</div>
                  <span className="font-medium text-gray-900 text-xs">Exec Auth</span>
                </div>
                <p className="text-xs text-gray-600">Validate parameters</p>
              </div>
              <div className="bg-white rounded-lg p-3 border border-purple-100">
                <div className="flex items-center mb-1">
                  <div className="w-5 h-5 bg-purple-500 text-white rounded-full flex items-center justify-center text-xs font-bold mr-1.5">3</div>
                  <span className="font-medium text-gray-900 text-xs">Mask Data</span>
                </div>
                <p className="text-xs text-gray-600">Redact sensitive fields</p>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  </section>
);

const RoleSelector = ({ selectedRole, onSelect }) => (
  <div className="grid grid-cols-3 gap-2">
    {Object.values(roles).map((role) => {
      const isSelected = selectedRole === role.id;
      return (
        <button
          key={role.id}
          onClick={() => onSelect(role.id)}
          className={`p-3 rounded-lg border-2 text-left transition-all ${
            isSelected 
              ? 'border-teal-500 bg-teal-50' 
              : 'border-gray-200 hover:border-gray-300 bg-white'
          }`}
        >
          <div className="text-xl mb-1">{role.icon}</div>
          <div className="font-medium text-gray-900 text-xs">{role.name}</div>
          <div className="text-xs text-gray-500">{role.access}</div>
          <div className="mt-1.5 text-xs">
            <span className="text-teal-600 font-medium">{role.toolsVisible}</span>
            <span className="text-gray-400">/{role.toolsTotal} tools</span>
          </div>
        </button>
      );
    })}
  </div>
);

const ScenarioDropdown = ({ scenarios, selectedId, onSelect }) => {
  const [isOpen, setIsOpen] = useState(false);
  const selected = scenarios.find(s => s.id === selectedId);
  
  return (
    <div className="relative">
      <button
        onClick={() => setIsOpen(!isOpen)}
        className="w-full px-3 py-2.5 bg-white border border-gray-200 rounded-lg text-left flex items-center justify-between hover:border-gray-300 transition-colors"
      >
        <div>
          <div className="font-medium text-gray-900 text-sm">{selected?.name}</div>
          <div className="text-xs text-gray-500">{selected?.description}</div>
        </div>
        <ChevronDown size={18} className={`text-gray-400 transition-transform flex-shrink-0 ml-2 ${isOpen ? 'rotate-180' : ''}`} />
      </button>
      
      {isOpen && (
        <div className="absolute top-full left-0 right-0 mt-1 bg-white border border-gray-200 rounded-lg shadow-lg z-20 overflow-hidden">
          {scenarios.map((scenario) => (
            <button
              key={scenario.id}
              onClick={() => { onSelect(scenario.id); setIsOpen(false); }}
              className={`w-full px-3 py-2.5 text-left hover:bg-gray-50 border-b border-gray-100 last:border-b-0 ${
                selectedId === scenario.id ? 'bg-teal-50' : ''
              }`}
            >
              <div className="font-medium text-gray-900 text-sm">{scenario.name}</div>
              <div className="text-xs text-gray-500">{scenario.description}</div>
            </button>
          ))}
        </div>
      )}
    </div>
  );
};

const SIMPLE_STEPS = [
  { id: 'start', name: '', icon: Play, hidden: true },
  { id: 'request', name: 'Request', icon: User },
  { id: 'auth', name: 'Auth', icon: Lock },
  { id: 'authorize', name: 'Authorize', icon: Shield },
  { id: 'execute', name: 'Execute', icon: Zap },
  { id: 'respond', name: 'Respond', icon: Check },
];

const SimplePipeline = ({ currentStep, outcome, onStepClick, maxReachedStep }) => {
  const getStepStatus = (index) => {
    if (currentStep > index) return 'complete';
    if (currentStep === index) return 'active';
    return 'pending';
  };
  
  const isClickable = (index) => {
    return index <= maxReachedStep && index > 0;
  };
  
  // Filter out the hidden start step for display
  const visibleSteps = SIMPLE_STEPS.filter(step => !step.hidden);
  
  return (
    <div className="flex items-center justify-between">
      {visibleSteps.map((step) => {
        // Get the actual index from the full array
        const actualIndex = SIMPLE_STEPS.findIndex(s => s.id === step.id);
        const status = getStepStatus(actualIndex);
        const Icon = step.icon;
        const isDenied = status === 'active' && step.id === 'authorize' && outcome && !outcome.allowed;
        const clickable = isClickable(actualIndex);
        
        return (
          <React.Fragment key={step.id}>
            <div className="flex flex-col items-center">
              <button
                onClick={() => clickable && onStepClick && onStepClick(actualIndex)}
                disabled={!clickable}
                className={`
                  w-10 h-10 rounded-full flex items-center justify-center transition-all duration-300
                  ${status === 'complete' ? 'bg-teal-500 text-white' : ''}
                  ${status === 'active' && !isDenied ? 'bg-teal-500 text-white ring-4 ring-teal-100 scale-110' : ''}
                  ${status === 'active' && isDenied ? 'bg-red-500 text-white ring-4 ring-red-100 scale-110' : ''}
                  ${status === 'pending' ? 'bg-gray-100 text-gray-400' : ''}
                  ${clickable ? 'cursor-pointer hover:opacity-80' : ''}
                `}
              >
                {status === 'complete' ? <Check size={18} /> : isDenied ? <X size={18} /> : <Icon size={18} />}
              </button>
              <span className={`text-xs mt-1.5 ${status === 'pending' ? 'text-gray-400' : 'text-gray-700'}`}>
                {step.name}
              </span>
            </div>
            
            {visibleSteps.indexOf(step) < visibleSteps.length - 1 && (
              <div className={`flex-1 h-0.5 mx-1.5 rounded-full transition-all duration-300 ${
                status === 'complete' ? 'bg-teal-500' : 'bg-gray-200'
              }`} />
            )}
          </React.Fragment>
        );
      })}
    </div>
  );
};

const StepContent = ({ step, role, scenario, outcome, showTechnical }) => {
  if (step === 0) {
    return (
      <div className="text-center py-6 text-gray-500">
        <Sparkles size={28} className="mx-auto mb-2 text-teal-400" />
        <p className="text-sm">Click "Run" to see PlainID in action</p>
      </div>
    );
  }
  
  if (step === 1) {
    return (
      <div className="bg-blue-50 rounded-lg p-4">
        <div className="flex items-start">
          <div className="w-8 h-8 bg-blue-500 rounded-full flex items-center justify-center text-white mr-3 flex-shrink-0">
            <User size={16} />
          </div>
          <div>
            <h4 className="font-medium text-gray-900 text-sm mb-1">User Request</h4>
            <p className="text-gray-700 text-sm">"{scenario.name}"</p>
            <div className="mt-2 flex items-center text-xs text-gray-500">
              <span className="mr-3">Role: <strong className="text-gray-700">{roles[role].name}</strong></span>
              <span>Tool: <strong className="text-gray-700 font-mono">{scenario.tool}</strong></span>
            </div>
          </div>
        </div>
      </div>
    );
  }
  
  if (step === 2) {
    return (
      <div className="bg-amber-50 rounded-lg p-4">
        <div className="flex items-start">
          <div className="w-8 h-8 bg-amber-500 rounded-full flex items-center justify-center text-white mr-3 flex-shrink-0">
            <Lock size={16} />
          </div>
          <div className="flex-1">
            <h4 className="font-medium text-gray-900 text-sm mb-1">OAuth 2.1 Authentication</h4>
            <div className="flex items-center">
              <CheckCircle size={14} className="text-green-500 mr-1.5" />
              <span className="text-sm text-green-700">Authentication successful</span>
            </div>
            {showTechnical && (
              <div className="mt-2 bg-white/70 rounded p-2 text-xs font-mono text-gray-600">
                token_type: "Bearer" | user_id: "{roles[role].id}"
              </div>
            )}
          </div>
        </div>
      </div>
    );
  }
  
  if (step === 3) {
    const roleData = roles[role];
    return (
      <div className={`rounded-lg p-4 ${outcome.allowed ? 'bg-teal-50' : 'bg-red-50'}`}>
        <div className="flex items-start">
          <div className={`w-8 h-8 rounded-full flex items-center justify-center text-white mr-3 flex-shrink-0 ${
            outcome.allowed ? 'bg-teal-500' : 'bg-red-500'
          }`}>
            <Shield size={16} />
          </div>
          <div className="flex-1">
            <h4 className="font-medium text-gray-900 text-sm mb-2">PlainID Authorization</h4>
            
            <div className="grid grid-cols-3 gap-2 mb-3">
              <div className={`rounded p-2 ${
                outcome.reason === 'Tool not available' || outcome.reason === 'Tool hidden' 
                  ? 'bg-red-100 border border-red-200' 
                  : 'bg-white border border-teal-200'
              }`}>
                <div className="flex items-center justify-between">
                  <span className="text-xs text-gray-600">Filter</span>
                  {outcome.reason === 'Tool not available' || outcome.reason === 'Tool hidden' 
                    ? <XCircle size={12} className="text-red-500" />
                    : <CheckCircle size={12} className="text-teal-500" />
                  }
                </div>
              </div>
              <div className={`rounded p-2 ${
                !outcome.allowed && outcome.reason !== 'Tool not available' && outcome.reason !== 'Tool hidden'
                  ? 'bg-red-100 border border-red-200' 
                  : 'bg-white border border-blue-200'
              }`}>
                <div className="flex items-center justify-between">
                  <span className="text-xs text-gray-600">Exec</span>
                  {!outcome.allowed && outcome.reason !== 'Tool not available' && outcome.reason !== 'Tool hidden'
                    ? <XCircle size={12} className="text-red-500" />
                    : <CheckCircle size={12} className="text-blue-500" />
                  }
                </div>
              </div>
              <div className={`rounded p-2 bg-white border ${outcome.masked?.length > 0 ? 'border-purple-200' : 'border-gray-200'}`}>
                <div className="flex items-center justify-between">
                  <span className="text-xs text-gray-600">Mask</span>
                  {outcome.masked?.length > 0 
                    ? <Eye size={12} className="text-purple-500" />
                    : <span className="text-xs text-gray-400">—</span>
                  }
                </div>
              </div>
            </div>
            
            <div className={`flex items-center p-2 rounded ${outcome.allowed ? 'bg-teal-100' : 'bg-red-100'}`}>
              {outcome.allowed ? (
                <>
                  <CheckCircle size={14} className="text-teal-600 mr-1.5" />
                  <span className="text-xs text-teal-800">Authorized — Request forwarded to MCP server</span>
                </>
              ) : (
                <>
                  <XCircle size={14} className="text-red-600 mr-1.5" />
                  <span className="text-xs text-red-800">Denied — {outcome.reason}</span>
                </>
              )}
            </div>
          </div>
        </div>
      </div>
    );
  }
  
  if (step === 4) {
    if (!outcome.allowed) {
      return (
        <div className="bg-gray-100 rounded-lg p-4 text-center">
          <X size={24} className="mx-auto mb-2 text-gray-400" />
          <p className="text-sm text-gray-600">Request blocked by PlainID proxy</p>
          <p className="text-xs text-gray-500 mt-1">MCP server was never called</p>
        </div>
      );
    }
    return (
      <div className="bg-green-50 rounded-lg p-4">
        <div className="flex items-start">
          <div className="w-8 h-8 bg-green-500 rounded-full flex items-center justify-center text-white mr-3 flex-shrink-0">
            <Zap size={16} />
          </div>
          <div>
            <h4 className="font-medium text-gray-900 text-sm mb-1">MCP Server Execution</h4>
            <div className="flex items-center">
              <CheckCircle size={14} className="text-green-500 mr-1.5" />
              <span className="text-sm text-green-700">Tool executed successfully</span>
            </div>
          </div>
        </div>
      </div>
    );
  }
  
  if (step === 5) {
    if (!outcome.allowed) {
      return (
        <div className="bg-red-50 rounded-lg p-4">
          <div className="flex items-start">
            <div className="w-8 h-8 bg-red-500 rounded-full flex items-center justify-center text-white mr-3 flex-shrink-0">
              <X size={16} />
            </div>
            <div>
              <h4 className="font-medium text-gray-900 text-sm mb-1">Request Denied</h4>
              <p className="text-sm text-gray-600">{outcome.reason}</p>
              <p className="text-xs text-gray-500 mt-2">No sensitive data was exposed.</p>
            </div>
          </div>
        </div>
      );
    }
    
    return (
      <div className="bg-gradient-to-r from-teal-50 to-green-50 rounded-lg p-4">
        <div className="flex items-start">
          <div className="w-8 h-8 bg-gradient-to-br from-teal-500 to-green-500 rounded-full flex items-center justify-center text-white mr-3 flex-shrink-0">
            <Check size={16} />
          </div>
          <div className="flex-1">
            <h4 className="font-medium text-gray-900 text-sm mb-1">Response Delivered</h4>
            
            {outcome.masked?.length > 0 && (
              <div className="flex items-center mb-2">
                <EyeOff size={14} className="text-purple-500 mr-1.5" />
                <span className="text-xs text-purple-700">Masked: {outcome.masked.join(', ')}</span>
              </div>
            )}
            
            {showTechnical && (
              <div className="bg-gray-900 rounded p-2 text-xs font-mono text-gray-100 mt-2">
                <div>customer_name: "John Smith"</div>
                {outcome.masked?.includes('SSN') && (
                  <div className="text-purple-400">ssn: "XXX-XX-6789"</div>
                )}
              </div>
            )}
            
            <div className="flex items-center mt-2 p-1.5 bg-teal-100 rounded">
              <CheckCircle size={12} className="text-teal-600 mr-1" />
              <span className="text-xs text-teal-800">Zero data leakage — Policy enforced</span>
            </div>
          </div>
        </div>
      </div>
    );
  }
  
  return null;
};

// ============================================================================
// MAIN VIEWS
// ============================================================================

const SimulationView = () => {
  const [showHowItWorks, setShowHowItWorks] = useState(false);
  const [showSimulation, setShowSimulation] = useState(false);
  const [selectedRole, setSelectedRole] = useState('teller');
  const [selectedScenario, setSelectedScenario] = useState('account_lookup');
  const [currentStep, setCurrentStep] = useState(0);
  const [maxReachedStep, setMaxReachedStep] = useState(0);
  const [isRunning, setIsRunning] = useState(false);
  const [showTechnical, setShowTechnical] = useState(false);
  
  const scenario = scenarios.find(s => s.id === selectedScenario);
  const outcome = scenario?.outcomes[selectedRole];
  
  useEffect(() => {
    if (!isRunning || currentStep === 0 || currentStep >= 5) return;
    
    // Slower durations for human readability
    const durations = [0, 3000, 3500, 4000, 3000, 0];
    const timer = setTimeout(() => {
      const nextStep = currentStep + 1;
      
      if (currentStep === 3 && !outcome?.allowed) {
        setCurrentStep(5);
        setMaxReachedStep(5);
        setIsRunning(false);
        return;
      }
      
      if (nextStep <= 5) {
        setCurrentStep(nextStep);
        setMaxReachedStep(prev => Math.max(prev, nextStep));
        if (nextStep === 5) setIsRunning(false);
      }
    }, durations[currentStep]);
    
    return () => clearTimeout(timer);
  }, [currentStep, isRunning, outcome]);
  
  const startSimulation = () => { 
    setCurrentStep(1); 
    setMaxReachedStep(1);
    setIsRunning(true); 
  };
  const resetSimulation = () => { 
    setCurrentStep(0); 
    setMaxReachedStep(0);
    setIsRunning(false); 
  };
  
  const handleStepClick = (stepIndex) => {
    if (stepIndex <= maxReachedStep && stepIndex > 0) {
      setCurrentStep(stepIndex);
      setIsRunning(false);
    }
  };
  
  const handleStartFromHero = () => {
    setShowSimulation(true);
    setTimeout(() => document.getElementById('simulation')?.scrollIntoView({ behavior: 'smooth' }), 100);
  };
  
  return (
    <>
      <HeroSection onStartSimulation={handleStartFromHero} />
      <HowItWorks isExpanded={showHowItWorks} onToggle={() => setShowHowItWorks(!showHowItWorks)} />
      
      {showSimulation && (
        <section className="py-8 bg-white" id="simulation">
          <div className="max-w-3xl mx-auto px-4">
            <div className="text-center mb-6">
              <h2 className="text-xl font-bold text-gray-900 mb-1">Interactive Simulation</h2>
              <p className="text-sm text-gray-600">See how PlainID protects your MCP agents</p>
            </div>
            
            <div className="bg-slate-50 rounded-xl p-4 mb-4">
              <div className="grid md:grid-cols-2 gap-4">
                <div>
                  <label className="block text-xs font-medium text-gray-700 mb-2">Select User Role</label>
                  <RoleSelector selectedRole={selectedRole} onSelect={(id) => { setSelectedRole(id); resetSimulation(); }} />
                </div>
                <div>
                  <label className="block text-xs font-medium text-gray-700 mb-2">Select Scenario</label>
                  <ScenarioDropdown 
                    scenarios={scenarios}
                    selectedId={selectedScenario}
                    onSelect={(id) => { setSelectedScenario(id); resetSimulation(); }}
                  />
                  <div className={`mt-2 px-2 py-1.5 rounded text-xs ${
                    outcome?.allowed ? 'bg-teal-50 text-teal-700' : 'bg-red-50 text-red-700'
                  }`}>
                    Expected: {outcome?.allowed ? '✓ Allowed' : `✗ ${outcome?.reason}`}
                  </div>
                </div>
              </div>
            </div>
            
            <div className="bg-white rounded-xl border border-gray-200 p-4">
              <div className="flex items-center justify-between mb-4">
                <h3 className="font-medium text-gray-900 text-sm">Authorization Flow</h3>
                <div className="flex items-center space-x-2">
                  <label className="flex items-center text-xs text-gray-600 cursor-pointer">
                    <input 
                      type="checkbox" 
                      checked={showTechnical}
                      onChange={(e) => setShowTechnical(e.target.checked)}
                      className="mr-1.5 rounded border-gray-300 text-teal-500 focus:ring-teal-500"
                    />
                    Technical
                  </label>
                  
                  {currentStep === 0 ? (
                    <button onClick={startSimulation} className="flex items-center px-3 py-1.5 bg-teal-500 text-white text-xs font-medium rounded-lg hover:bg-teal-600">
                      <Play size={14} className="mr-1" /> Run
                    </button>
                  ) : (
                    <button onClick={resetSimulation} className="flex items-center px-3 py-1.5 bg-gray-100 text-gray-700 text-xs font-medium rounded-lg hover:bg-gray-200">
                      <RotateCcw size={14} className="mr-1" /> Reset
                    </button>
                  )}
                </div>
              </div>
              
              <div className="mb-5">
                <SimplePipeline 
                  currentStep={currentStep} 
                  outcome={outcome} 
                  onStepClick={handleStepClick}
                  maxReachedStep={maxReachedStep}
                />
              </div>
              
              <div className="min-h-[140px]">
                <StepContent step={currentStep} role={selectedRole} scenario={scenario} outcome={outcome} showTechnical={showTechnical} />
              </div>
              
              {isRunning && currentStep > 0 && currentStep < 5 && (
                <div className="flex items-center justify-center mt-3 text-teal-600">
                  <div className="flex space-x-1 mr-2">
                    <span className="w-1.5 h-1.5 bg-teal-500 rounded-full animate-bounce" />
                    <span className="w-1.5 h-1.5 bg-teal-500 rounded-full animate-bounce" style={{ animationDelay: '0.1s' }} />
                    <span className="w-1.5 h-1.5 bg-teal-500 rounded-full animate-bounce" style={{ animationDelay: '0.2s' }} />
                  </div>
                  <span className="text-xs">Processing...</span>
                </div>
              )}
            </div>
          </div>
        </section>
      )}
    </>
  );
};

const CompareView = ({ selectedRole, selectedScenario, onRoleChange, onScenarioChange }) => {
  const scenario = scenarios.find(s => s.id === selectedScenario);
  const outcome = scenario?.outcomes[selectedRole];
  const roleData = roles[selectedRole];
  
  return (
    <section className="py-8 bg-slate-50 min-h-[calc(100vh-60px)]">
      <div className="max-w-6xl mx-auto px-4">
        <div className="text-center mb-6">
          <h2 className="text-xl font-bold text-gray-900 mb-1">Compare Approaches</h2>
          <p className="text-sm text-gray-600">See the difference PlainID makes for the same request</p>
        </div>
        
        {/* Configuration */}
        <div className="bg-white rounded-xl p-4 mb-6 border border-gray-200">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <label className="block text-xs font-medium text-gray-700 mb-2">User Role</label>
              <RoleSelector selectedRole={selectedRole} onSelect={onRoleChange} />
            </div>
            <div>
              <label className="block text-xs font-medium text-gray-700 mb-2">Scenario</label>
              <ScenarioDropdown 
                scenarios={scenarios}
                selectedId={selectedScenario}
                onSelect={onScenarioChange}
              />
            </div>
          </div>
        </div>
        
        {/* Side by side comparison */}
        <div style={{ display: 'flex', flexDirection: 'row', gap: '1.5rem' }}>
          {/* Without PlainID */}
          <div style={{ flex: 1 }} className="bg-white rounded-xl border-2 border-red-100 p-6 shadow-sm">
            <div className="flex items-center mb-5">
              <div className="w-10 h-10 bg-red-100 rounded-full flex items-center justify-center mr-3">
                <Unlock className="text-red-500" size={20} />
              </div>
              <div>
                <h3 className="font-semibold text-gray-900">Without PlainID</h3>
                <p className="text-xs text-gray-500">Standard MCP</p>
              </div>
            </div>
            
            <div className="space-y-4">
              <div>
                <div className="text-xs font-medium text-gray-600 mb-1.5">Request</div>
                <div className="bg-gray-50 p-3 rounded-lg text-sm text-gray-700">
                  "{scenario?.name}"
                </div>
              </div>
              
              <div>
                <div className="text-xs font-medium text-gray-600 mb-1.5">Tool Discovery</div>
                <div className="bg-red-50 p-3 rounded-lg border border-red-200">
                  <div className="flex items-center text-red-700 text-sm mb-1">
                    <X size={14} className="mr-1.5" />
                    All 12 tools exposed
                  </div>
                  <p className="text-xs text-red-600">No filtering — agent sees everything</p>
                </div>
              </div>
              
              <div>
                <div className="text-xs font-medium text-gray-600 mb-1.5">Execution</div>
                <div className="bg-red-50 p-3 rounded-lg border border-red-200">
                  <div className="flex items-center text-red-700 text-sm mb-1">
                    <X size={14} className="mr-1.5" />
                    No authorization checks
                  </div>
                  <p className="text-xs text-red-600">Any tool, any parameters accepted</p>
                </div>
              </div>
              
              <div>
                <div className="text-xs font-medium text-gray-600 mb-1.5">Response</div>
                <div className="bg-red-50 p-4 rounded-lg border border-red-200">
                  <div className="bg-white rounded p-3 font-mono text-xs text-gray-700 mb-2">
                    <div>customer_name: "John Smith"</div>
                    <div className="text-red-600">ssn: "123-45-6789"</div>
                    <div className="text-red-600">account_number: "9876543210"</div>
                  </div>
                  <div className="flex items-center text-red-700 text-xs">
                    <AlertTriangle size={12} className="mr-1" />
                    SSN and account number exposed!
                  </div>
                </div>
              </div>
            </div>
          </div>
          
          {/* With PlainID */}
          <div style={{ flex: 1 }} className="bg-white rounded-xl border-2 border-teal-200 p-6 shadow-lg">
            <div className="flex items-center mb-5">
              <div className="w-10 h-10 bg-teal-100 rounded-full flex items-center justify-center mr-3">
                <Shield className="text-teal-600" size={20} />
              </div>
              <div>
                <h3 className="font-semibold text-gray-900">With PlainID</h3>
                <p className="text-xs text-gray-500">Authorization Proxy</p>
              </div>
            </div>
            
            <div className="space-y-4">
              <div>
                <div className="text-xs font-medium text-gray-600 mb-1.5">Request</div>
                <div className="bg-gray-50 p-3 rounded-lg text-sm text-gray-700">
                  "{scenario?.name}"
                </div>
              </div>
              
              <div>
                <div className="text-xs font-medium text-gray-600 mb-1.5">Gate 1: Tool Discovery</div>
                <div className={`p-3 rounded-lg border ${
                  outcome?.reason === 'Tool not available' || outcome?.reason === 'Tool hidden'
                    ? 'bg-red-50 border-red-200'
                    : 'bg-teal-50 border-teal-200'
                }`}>
                  <div className={`flex items-center text-sm mb-1 ${
                    outcome?.reason === 'Tool not available' || outcome?.reason === 'Tool hidden'
                      ? 'text-red-700'
                      : 'text-teal-700'
                  }`}>
                    {outcome?.reason === 'Tool not available' || outcome?.reason === 'Tool hidden'
                      ? <><X size={14} className="mr-1.5" />Tool hidden from agent</>
                      : <><Check size={14} className="mr-1.5" />{roleData.toolsVisible} of {roleData.toolsTotal} tools visible</>
                    }
                  </div>
                  <p className="text-xs text-gray-600">
                    {outcome?.reason === 'Tool hidden' 
                      ? 'Admin tools completely invisible'
                      : `Filtered by role: ${roleData.name}`
                    }
                  </p>
                </div>
              </div>
              
              <div>
                <div className="text-xs font-medium text-gray-600 mb-1.5">Gate 2: Execution Auth</div>
                <div className={`p-3 rounded-lg border ${
                  !outcome?.allowed && outcome?.reason !== 'Tool not available' && outcome?.reason !== 'Tool hidden'
                    ? 'bg-red-50 border-red-200'
                    : outcome?.reason === 'Tool not available' || outcome?.reason === 'Tool hidden'
                      ? 'bg-gray-50 border-gray-200'
                      : 'bg-blue-50 border-blue-200'
                }`}>
                  <div className={`flex items-center text-sm mb-1 ${
                    !outcome?.allowed && outcome?.reason !== 'Tool not available' && outcome?.reason !== 'Tool hidden'
                      ? 'text-red-700'
                      : outcome?.reason === 'Tool not available' || outcome?.reason === 'Tool hidden'
                        ? 'text-gray-500'
                        : 'text-blue-700'
                  }`}>
                    {!outcome?.allowed && outcome?.reason !== 'Tool not available' && outcome?.reason !== 'Tool hidden'
                      ? <><X size={14} className="mr-1.5" />{outcome?.reason}</>
                      : outcome?.reason === 'Tool not available' || outcome?.reason === 'Tool hidden'
                        ? <><span className="mr-1.5">—</span>Skipped (tool not visible)</>
                        : <><Check size={14} className="mr-1.5" />Parameters validated</>
                    }
                  </div>
                  <p className="text-xs text-gray-600">
                    {outcome?.allowed ? 'Scope and limits checked' : 'Request blocked by policy'}
                  </p>
                </div>
              </div>
              
              <div>
                <div className="text-xs font-medium text-gray-600 mb-1.5">Gate 3: Response</div>
                <div className={`p-3 rounded-lg border ${
                  outcome?.allowed ? 'bg-purple-50 border-purple-200' : 'bg-gray-50 border-gray-200'
                }`}>
                  {outcome?.allowed ? (
                    <>
                      <div className="bg-white rounded p-2 font-mono text-xs text-gray-700 mb-2">
                        <div>customer_name: "John Smith"</div>
                        {outcome?.masked?.includes('SSN') && (
                          <div className="text-purple-600">ssn: "XXX-XX-6789"</div>
                        )}
                      </div>
                      <div className="flex items-center text-purple-700 text-xs">
                        <Shield size={12} className="mr-1" />
                        {outcome?.masked?.length > 0 
                          ? `${outcome.masked.join(', ')} masked by policy`
                          : 'Response validated'
                        }
                      </div>
                    </>
                  ) : (
                    <>
                      <div className="flex items-center text-gray-500 text-sm mb-1">
                        <span className="mr-1.5">—</span>No response (blocked)
                      </div>
                      <p className="text-xs text-gray-600">No data exposed to agent</p>
                    </>
                  )}
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>
    </section>
  );
};

const IncidentsView = () => (
  <section className="py-8 bg-slate-50 min-h-[calc(100vh-60px)]">
    <div className="max-w-5xl mx-auto px-4">
      <div className="text-center mb-8">
        <h2 className="text-xl font-bold text-gray-900 mb-1">Security Incident Prevention</h2>
        <p className="text-sm text-gray-600">See how PlainID prevents real-world MCP security incidents</p>
      </div>
      
      <div className="grid md:grid-cols-3 gap-5">
        {incidents.map((incident) => (
          <div key={incident.id} className="bg-white rounded-xl border border-gray-200 p-5 hover:shadow-md transition-shadow">
            <div className={`inline-flex items-center px-2 py-1 rounded-full text-xs font-medium mb-3 ${
              incident.severity === 'critical' ? 'bg-red-100 text-red-800' : 'bg-orange-100 text-orange-800'
            }`}>
              <AlertTriangle size={12} className="mr-1" />
              {incident.severity.toUpperCase()}
            </div>
            
            <h3 className="font-semibold text-gray-900 mb-1">{incident.name}</h3>
            <p className="text-xs text-gray-500 mb-3">{incident.company} • {incident.date}</p>
            <p className="text-sm text-gray-600 mb-4">{incident.description}</p>
            
            {incident.cve && (
              <div className="text-xs font-mono bg-gray-100 text-gray-600 px-2 py-1 rounded mb-3 inline-block">
                {incident.cve}
              </div>
            )}
            
            <div className="space-y-3">
              <div className="bg-red-50 p-3 rounded-lg border border-red-100">
                <div className="text-xs font-medium text-red-800 mb-1 flex items-center">
                  <Unlock size={12} className="mr-1" />
                  Without PlainID
                </div>
                <p className="text-xs text-red-700">{incident.without_plainid.outcome}</p>
              </div>
              
              <div className="bg-teal-50 p-3 rounded-lg border border-teal-100">
                <div className="text-xs font-medium text-teal-800 mb-1 flex items-center">
                  <Shield size={12} className="mr-1" />
                  With PlainID
                </div>
                <p className="text-xs text-teal-700">{incident.with_plainid.outcome}</p>
              </div>
            </div>
          </div>
        ))}
      </div>
    </div>
  </section>
);

const Footer = () => (
  <footer className="bg-gray-900 text-gray-400 py-6">
    <div className="max-w-3xl mx-auto px-4 text-center">
      <div className="flex items-center justify-center mb-2">
        <Shield size={16} className="text-teal-500 mr-1.5" />
        <span className="text-white font-medium text-sm">PlainID MCP Authorizer</span>
        <AlphaTag />
      </div>
      <p className="text-xs">
        Made by the{' '}
        <a href="mailto:presales@plainid.com" className="text-teal-400 hover:underline">SE Team</a>
        {' '}for walkthrough purposes
      </p>
    </div>
  </footer>
);

// ============================================================================
// MAIN COMPONENT
// ============================================================================

export default function MCPAuthorizerWalkthrough() {
  const [activeView, setActiveView] = useState('simulation');
  const [selectedRole, setSelectedRole] = useState('teller');
  const [selectedScenario, setSelectedScenario] = useState('account_lookup');
  
  return (
    <div className="min-h-screen bg-white flex flex-col">
      <Header activeView={activeView} onViewChange={setActiveView} />
      
      <main className="flex-1">
        {activeView === 'simulation' && <SimulationView />}
        {activeView === 'compare' && (
          <CompareView 
            selectedRole={selectedRole}
            selectedScenario={selectedScenario}
            onRoleChange={setSelectedRole}
            onScenarioChange={setSelectedScenario}
          />
        )}
        {activeView === 'incidents' && <IncidentsView />}
      </main>
      
      <Footer />
    </div>
  );
}
