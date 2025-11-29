import React, { useState, useEffect, useCallback } from 'react';
import { 
  Shield, User, Bot, Server, Database, Filter, Eye, Lock, Unlock,
  Check, X, AlertTriangle, ChevronRight, ArrowRight, Play, RotateCcw,
  Calendar, Download, FileText, Key, Layers, Users, MapPin, Clock,
  CheckCircle, XCircle, AlertCircle, Info, Zap, Activity
} from 'lucide-react';

// Import data
import { roles, getRoleById } from './data/roles';
import { agent } from './data/agents';
import { scenarios, getScenarioById } from './data/scenarios';
import { mcpServers, getAllTools, getToolByName } from './data/mcpServers';
import { incidents } from './data/incidents';
import { policies } from './data/policies';

// Import utilities
import { 
  evaluateGate1, evaluateGate2, evaluateGate3,
  generateAuthContext, generateRequestId, generateTimestamp 
} from './utils/authorizationEngine';

// ============================================================================
// CONSTANTS
// ============================================================================

const PIPELINE_STEPS = [
  { id: 0, name: 'Start', icon: Play, description: 'Configure and start the demo' },
  { id: 1, name: 'Request', icon: User, description: 'User submits request to AI Assistant' },
  { id: 2, name: 'OAuth 2.1', icon: Key, description: 'Authentication via OAuth 2.1 with PKCE' },
  { id: 3, name: 'Gate 1', icon: Filter, description: 'Tool Discovery Filter - Filter available tools' },
  { id: 4, name: 'Select Tool', icon: Bot, description: 'AI Agent selects appropriate tool' },
  { id: 5, name: 'Gate 2', icon: Shield, description: 'Execution Authorization - Validate tool call' },
  { id: 6, name: 'Execute', icon: Server, description: 'MCP Server executes the tool' },
  { id: 7, name: 'Gate 3', icon: Eye, description: 'Response Masking - Redact sensitive data' },
  { id: 8, name: 'Complete', icon: Check, description: 'Secure response delivered to user' },
];

const STEP_DURATIONS = [0, 2000, 2500, 3000, 2000, 3000, 2000, 2500, 0];

// ============================================================================
// SUB-COMPONENTS
// ============================================================================

// Beta Tag
const BetaTag = () => (
  <span className="ml-2 px-1.5 py-0.5 text-xs font-medium bg-blue-100 text-blue-800 rounded uppercase">
    Beta
  </span>
);

// JSON Viewer with syntax highlighting
const JsonViewer = ({ data, title, maxHeight = '300px' }) => {
  const formatJson = (obj, indent = 0) => {
    const spaces = '  '.repeat(indent);
    
    if (obj === null) return <span className="text-gray-500">null</span>;
    if (typeof obj === 'boolean') return <span className="text-red-600">{obj.toString()}</span>;
    if (typeof obj === 'number') return <span className="text-blue-600">{obj}</span>;
    if (typeof obj === 'string') return <span className="text-green-700">"{obj}"</span>;
    
    if (Array.isArray(obj)) {
      if (obj.length === 0) return <span>[]</span>;
      return (
        <>
          {'[\n'}
          {obj.map((item, i) => (
            <span key={i}>
              {spaces}  {formatJson(item, indent + 1)}
              {i < obj.length - 1 ? ',' : ''}{'\n'}
            </span>
          ))}
          {spaces}{']'}
        </>
      );
    }
    
    if (typeof obj === 'object') {
      const keys = Object.keys(obj);
      if (keys.length === 0) return <span>{'{}'}</span>;
      return (
        <>
          {'{\n'}
          {keys.map((key, i) => (
            <span key={key}>
              {spaces}  <span className="text-purple-600">"{key}"</span>: {formatJson(obj[key], indent + 1)}
              {i < keys.length - 1 ? ',' : ''}{'\n'}
            </span>
          ))}
          {spaces}{'}'}
        </>
      );
    }
    
    return String(obj);
  };

  return (
    <div className="bg-gray-900 rounded-lg overflow-hidden">
      {title && (
        <div className="bg-gray-800 px-4 py-2 text-sm text-gray-300 font-medium border-b border-gray-700">
          {title}
        </div>
      )}
      <pre 
        className="p-4 text-sm font-mono overflow-auto text-gray-100"
        style={{ maxHeight }}
      >
        {formatJson(data)}
      </pre>
    </div>
  );
};

// Decision Badge
const DecisionBadge = ({ decision, size = 'md' }) => {
  const configs = {
    PERMIT: { bg: 'bg-green-100', text: 'text-green-800', border: 'border-green-200', icon: CheckCircle },
    DENY: { bg: 'bg-red-100', text: 'text-red-800', border: 'border-red-200', icon: XCircle },
    FILTER: { bg: 'bg-blue-100', text: 'text-blue-800', border: 'border-blue-200', icon: Filter },
    MASK: { bg: 'bg-purple-100', text: 'text-purple-800', border: 'border-purple-200', icon: Eye },
    PASS: { bg: 'bg-green-100', text: 'text-green-800', border: 'border-green-200', icon: Check },
    PENDING: { bg: 'bg-yellow-100', text: 'text-yellow-800', border: 'border-yellow-200', icon: Clock },
  };
  
  const config = configs[decision] || configs.PENDING;
  const Icon = config.icon;
  const sizeClasses = size === 'sm' ? 'px-2 py-0.5 text-xs' : 'px-3 py-1 text-sm';
  
  return (
    <span className={`inline-flex items-center ${sizeClasses} rounded-full font-medium border ${config.bg} ${config.text} ${config.border}`}>
      <Icon size={size === 'sm' ? 12 : 14} className="mr-1" />
      {decision}
    </span>
  );
};

// Gate Badge
const GateBadge = ({ gate, active = false }) => {
  const configs = {
    1: { color: 'teal', label: 'Gate 1', subtitle: 'Tool Filter' },
    2: { color: 'blue', label: 'Gate 2', subtitle: 'Execution Auth' },
    3: { color: 'purple', label: 'Gate 3', subtitle: 'Response Mask' },
  };
  
  const config = configs[gate];
  const colorClasses = {
    teal: active ? 'bg-teal-500 text-white' : 'bg-teal-100 text-teal-800',
    blue: active ? 'bg-blue-500 text-white' : 'bg-blue-100 text-blue-800',
    purple: active ? 'bg-purple-500 text-white' : 'bg-purple-100 text-purple-800',
  };
  
  return (
    <div className={`inline-flex items-center px-3 py-1.5 rounded-lg ${colorClasses[config.color]} transition-all duration-300`}>
      <Shield size={14} className="mr-1.5" />
      <span className="font-medium text-sm">{config.label}</span>
    </div>
  );
};

// Progress Steps
const ProgressSteps = ({ currentStep, steps }) => {
  return (
    <div className="relative">
      {/* Background track */}
      <div className="absolute h-1 bg-gray-200 left-6 right-6 top-5 rounded-full" />
      
      {/* Progress bar */}
      <div 
        className="absolute h-1 bg-gradient-to-r from-teal-500 to-teal-600 rounded-full transition-all duration-500 ease-out"
        style={{
          top: '1.25rem',
          left: '1.5rem',
          width: currentStep === 0 ? '0' : `calc(${(currentStep / (steps.length - 1)) * 100}% - 3rem)`
        }}
      />
      
      {/* Step indicators */}
      <div className="flex justify-between">
        {steps.map((step, index) => {
          const Icon = step.icon;
          const isActive = currentStep === index;
          const isCompleted = currentStep > index;
          
          return (
            <div key={step.id} className="flex flex-col items-center relative z-10">
              <div className={`
                w-10 h-10 flex items-center justify-center rounded-full border-2 transition-all duration-300
                ${isActive 
                  ? 'bg-gradient-to-r from-teal-500 to-teal-600 text-white border-transparent shadow-lg scale-110' 
                  : isCompleted 
                    ? 'bg-teal-500 text-white border-transparent' 
                    : 'bg-white text-gray-400 border-gray-200'
                }
              `}>
                <Icon size={18} />
              </div>
              <span className={`
                text-xs font-medium mt-2 transition-colors duration-300
                ${isActive ? 'text-teal-600' : isCompleted ? 'text-teal-600' : 'text-gray-400'}
              `}>
                {step.name}
              </span>
            </div>
          );
        })}
      </div>
    </div>
  );
};

// Identity Panel
const IdentityPanel = ({ role, agent: agentData }) => {
  return (
    <div className="bg-gradient-to-r from-misty-teal to-white rounded-xl border border-teal-100 p-6">
      <h3 className="text-lg font-semibold text-deep-teal mb-4 flex items-center">
        <Users size={20} className="mr-2 text-teal-500" />
        The Identity
      </h3>
      
      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        {/* End User */}
        <div className="bg-white/80 rounded-lg p-4 border border-teal-100">
          <div className="flex items-center mb-3">
            <div className="w-10 h-10 rounded-full bg-gradient-to-br from-blue-500 to-blue-600 flex items-center justify-center text-white">
              <User size={20} />
            </div>
            <div className="ml-3">
              <div className="font-medium text-deep-teal">The End User</div>
              <div className="text-xs text-gray-500">{role.name}</div>
            </div>
          </div>
          
          <div className="space-y-2 text-sm">
            <div className="flex justify-between">
              <span className="text-gray-600">Role:</span>
              <span className="font-medium text-deep-teal">{role.name}</span>
            </div>
            <div className="flex justify-between">
              <span className="text-gray-600">Branch:</span>
              <span className="font-medium text-deep-teal">{role.branch}</span>
            </div>
            <div className="flex justify-between">
              <span className="text-gray-600">Employee ID:</span>
              <span className="font-medium text-deep-teal">{role.employeeId}</span>
            </div>
            <div className="flex justify-between">
              <span className="text-gray-600">Clearance:</span>
              <span className={`font-medium capitalize ${
                role.clearance === 'executive' ? 'text-green-600' :
                role.clearance === 'elevated' ? 'text-blue-600' : 'text-gray-600'
              }`}>
                {role.clearance}
              </span>
            </div>
          </div>
          
          <div className="mt-3 pt-3 border-t border-gray-100">
            <div className="text-xs text-gray-500 mb-1">Access Level:</div>
            <span className={`inline-block px-2 py-0.5 rounded-full text-xs font-medium ${
              role.access === 'Full Access' ? 'bg-green-100 text-green-800' :
              role.access === 'Limited Access' ? 'bg-blue-100 text-blue-800' :
              'bg-gray-100 text-gray-800'
            }`}>
              {role.access}
            </span>
          </div>
        </div>
        
        {/* AI Agent */}
        <div className="bg-white/80 rounded-lg p-4 border border-teal-100">
          <div className="flex items-center mb-3">
            <div className="w-10 h-10 rounded-full bg-gradient-to-br from-teal-500 to-teal-600 flex items-center justify-center text-white">
              <Bot size={20} />
            </div>
            <div className="ml-3">
              <div className="font-medium text-deep-teal">The Agent User</div>
              <div className="text-xs text-gray-500">{agentData.name}</div>
            </div>
          </div>
          
          <div className="space-y-2 text-sm">
            <div className="flex justify-between">
              <span className="text-gray-600">Agent:</span>
              <span className="font-medium text-deep-teal">{agentData.name}</span>
            </div>
            <div className="flex justify-between">
              <span className="text-gray-600">Version:</span>
              <span className="font-medium text-deep-teal">v{agentData.version}</span>
            </div>
            <div className="flex justify-between">
              <span className="text-gray-600">Trust Level:</span>
              <span className="font-medium text-deep-teal capitalize">{agentData.trustLevel}</span>
            </div>
          </div>
          
          <div className="mt-3 pt-3 border-t border-gray-100">
            <div className="text-xs text-gray-500 mb-2">Agent Restrictions:</div>
            <div className="space-y-1">
              <div className="text-xs text-orange-700 flex items-center">
                <AlertCircle size={10} className="mr-1" />
                Loan approval &lt; ${agentData.restrictions.maxLoanApproval.toLocaleString()}
              </div>
              <div className="text-xs text-orange-700 flex items-center">
                <AlertCircle size={10} className="mr-1" />
                Cannot view full SSN
              </div>
              <div className="text-xs text-orange-700 flex items-center">
                <AlertCircle size={10} className="mr-1" />
                Transfers require confirmation
              </div>
            </div>
          </div>
        </div>
      </div>
      
      <p className="mt-4 text-sm text-deep-teal/80 italic text-center">
        "Effective access control in AI systems must account for both human and non-human (agent) identities"
      </p>
    </div>
  );
};

// Scenario Selector
const ScenarioSelector = ({ scenarios, selectedId, onSelect, disabled }) => {
  return (
    <div className="space-y-2">
      {scenarios.map((scenario) => (
        <button
          key={scenario.id}
          onClick={() => onSelect(scenario.id)}
          disabled={disabled}
          className={`
            w-full text-left px-4 py-3 rounded-lg transition-all duration-200
            ${selectedId === scenario.id
              ? 'bg-gradient-to-r from-teal-500 to-teal-600 text-white shadow-md'
              : 'bg-white border border-gray-200 text-gray-700 hover:border-teal-400 hover:bg-teal-50'
            }
            ${disabled ? 'opacity-50 cursor-not-allowed' : 'cursor-pointer'}
          `}
        >
          <div className="font-medium text-sm">{scenario.name}</div>
          <div className={`text-xs mt-1 ${selectedId === scenario.id ? 'text-teal-100' : 'text-gray-500'}`}>
            {scenario.query}
          </div>
        </button>
      ))}
    </div>
  );
};

// Role Selector
const RoleSelector = ({ roles, selectedId, onSelect, disabled }) => {
  return (
    <div className="flex flex-wrap gap-2">
      {Object.values(roles).map((role) => (
        <button
          key={role.id}
          onClick={() => onSelect(role.id)}
          disabled={disabled}
          className={`
            px-4 py-2 rounded-lg transition-all duration-200 text-sm font-medium
            ${selectedId === role.id
              ? 'bg-gradient-to-r from-teal-500 to-teal-600 text-white shadow-md'
              : 'bg-white border border-gray-200 text-gray-700 hover:border-teal-400 hover:bg-teal-50'
            }
            ${disabled ? 'opacity-50 cursor-not-allowed' : 'cursor-pointer'}
          `}
        >
          {role.name}
        </button>
      ))}
    </div>
  );
};

// CTA Modal
const CTAModal = ({ isOpen, onClose }) => {
  if (!isOpen) return null;
  
  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-[100] animate-fadeIn">
      <div className="bg-white rounded-2xl shadow-2xl max-w-lg w-full mx-4 animate-slideUp">
        <div className="p-8">
          <div className="flex items-center justify-center mb-6">
            <div className="w-16 h-16 bg-gradient-to-r from-teal-500 to-teal-600 rounded-xl flex items-center justify-center shadow-lg">
              <Shield size={32} className="text-white" />
            </div>
          </div>
          
          <h3 className="text-2xl font-bold text-center text-deep-teal mb-4">
            Ready to Secure Your MCP Agents?
          </h3>
          
          <p className="text-center text-gray-600 mb-8">
            See how PlainID can protect your AI applications with dynamic authorization for MCP in just 30 minutes.
          </p>
          
          <div className="space-y-3">
            <button 
              onClick={() => {
                window.open('https://www.plainid.com/contact/', '_blank');
                onClose();
              }}
              className="w-full flex items-center justify-center space-x-2 px-6 py-3 bg-gradient-to-r from-teal-500 to-teal-600 text-white rounded-lg hover:shadow-lg transition-all"
            >
              <Calendar size={18} />
              <span>Schedule Live Demo</span>
            </button>
            
            <button 
              onClick={() => {
                window.open('https://go.plainid.com/hubfs/Ebooks%20and%20Whitepapers%20and%20Reports/AI%20Whitpaper%20-%20Enhancing%20Data%20Security%20with%20Dynamic%20Authorization%20A%20Guide%20to%20Mitigating%20Vulnerabilities%20in%20LLMs.pdf', '_blank');
                onClose();
              }}
              className="w-full flex items-center justify-center space-x-2 px-6 py-3 bg-white border border-gray-300 text-gray-700 rounded-lg hover:bg-gray-50 transition-all"
            >
              <Download size={18} />
              <span>Download AI Security Whitepaper</span>
            </button>
            
            <button
              onClick={onClose}
              className="w-full text-center text-sm text-gray-500 hover:text-gray-700 transition-colors py-2"
            >
              Continue Exploring
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};

// Audit Log
const AuditLog = ({ entries }) => {
  if (!entries || entries.length === 0) return null;
  
  return (
    <div className="bg-white rounded-xl border border-gray-200 p-6 mt-6">
      <h4 className="text-lg font-semibold text-deep-teal mb-4 flex items-center">
        <Activity size={20} className="mr-2 text-teal-500" />
        Authorization Audit Log
      </h4>
      
      <div className="bg-gray-50 rounded-lg p-4 max-h-64 overflow-auto">
        <div className="space-y-2 font-mono text-xs">
          {entries.map((entry, index) => (
            <div key={index} className="flex items-start">
              <span className="text-gray-400 w-28 flex-shrink-0">
                {entry.timestamp?.split('T')[1]?.split('.')[0] || '00:00:00'}
              </span>
              <span className={`w-24 flex-shrink-0 font-medium ${
                entry.event?.includes('PERMIT') || entry.event?.includes('SUCCESS') ? 'text-green-600' :
                entry.event?.includes('DENY') ? 'text-red-600' :
                entry.event?.includes('MASK') || entry.event?.includes('FILTER') ? 'text-purple-600' :
                'text-blue-600'
              }`}>
                {entry.event}
              </span>
              <span className="text-gray-700">{entry.details}</span>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
};

// Key Takeaways
const KeyTakeaways = () => {
  const takeaways = [
    {
      title: "Don't wait, act now",
      description: "Utilize MCP securely from day one, it's not an option."
    },
    {
      title: "Beyond Authentication",
      description: "Authorizations are critical, implement dynamic, policy-driven controls to ensure security and compliance."
    },
    {
      title: "Identity First",
      description: "Treat AI Agents as delegated identities, context and risk matters. Use dynamic policy to govern the AI flow."
    }
  ];
  
  return (
    <div className="bg-gradient-to-r from-deep-teal to-slate text-white rounded-xl p-8 mt-8">
      <h3 className="text-2xl font-bold mb-6 text-center">Key Takeaways</h3>
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        {takeaways.map((item, index) => (
          <div key={index} className="bg-white/10 rounded-lg p-5">
            <div className="flex items-center mb-3">
              <Check size={20} className="text-neon-green mr-2" />
              <h4 className="font-semibold">{item.title}</h4>
            </div>
            <p className="text-sm text-gray-300">{item.description}</p>
          </div>
        ))}
      </div>
    </div>
  );
};

// ============================================================================
// MAIN COMPONENT
// ============================================================================

export default function PlainIDMCPAuthorizerDemo() {
  // State
  const [selectedRole, setSelectedRole] = useState('teller');
  const [selectedScenario, setSelectedScenario] = useState('account_lookup_success');
  const [currentStep, setCurrentStep] = useState(0);
  const [isRunning, setIsRunning] = useState(false);
  const [showComparison, setShowComparison] = useState(false);
  const [showCTAModal, setShowCTAModal] = useState(false);
  const [showIncidents, setShowIncidents] = useState(false);
  const [auditLog, setAuditLog] = useState([]);
  
  // Computed values
  const role = getRoleById(selectedRole);
  const scenario = getScenarioById(selectedScenario);
  const outcome = scenario?.expectedOutcomes[selectedRole];
  
  // Gate evaluation results (computed when pipeline runs)
  const [gate1Result, setGate1Result] = useState(null);
  const [gate2Result, setGate2Result] = useState(null);
  const [gate3Result, setGate3Result] = useState(null);
  
  // Add audit entry
  const addAuditEntry = useCallback((event, details) => {
    setAuditLog(prev => [...prev, {
      timestamp: generateTimestamp(),
      event,
      details
    }]);
  }, []);
  
  // Start pipeline
  const startPipeline = useCallback(() => {
    setCurrentStep(1);
    setIsRunning(true);
    setAuditLog([]);
    setGate1Result(null);
    setGate2Result(null);
    setGate3Result(null);
    
    addAuditEntry('USER_REQUEST', `"${scenario.query}"`);
  }, [scenario, addAuditEntry]);
  
  // Reset pipeline
  const resetPipeline = useCallback(() => {
    setCurrentStep(0);
    setIsRunning(false);
    setAuditLog([]);
    setGate1Result(null);
    setGate2Result(null);
    setGate3Result(null);
  }, []);
  
  // Auto-advance through pipeline
  useEffect(() => {
    if (!isRunning || currentStep === 0 || currentStep >= PIPELINE_STEPS.length - 1) {
      return;
    }
    
    const duration = STEP_DURATIONS[currentStep];
    
    const timer = setTimeout(() => {
      const nextStep = currentStep + 1;
      
      // Execute gate logic at appropriate steps
      if (nextStep === 3) {
        // Gate 1: Tool Discovery
        const result = evaluateGate1(selectedRole);
        setGate1Result(result);
        addAuditEntry('GATE_1_EVAL', `Policy: role-based-tool-access`);
        addAuditEntry(
          outcome.gate1 === 'permit' ? 'GATE_1_PERMIT' : 'GATE_1_DENY',
          `${result.filteredCount}/${result.originalCount} tools available`
        );
      }
      
      if (nextStep === 5) {
        // Gate 2: Execution Authorization
        const result = evaluateGate2(selectedRole, scenario.tool, scenario.params);
        setGate2Result(result);
        addAuditEntry('GATE_2_EVAL', `Tool: ${scenario.tool}`);
        addAuditEntry(
          result.decision === 'PERMIT' ? 'GATE_2_PERMIT' : 'GATE_2_DENY',
          result.reason
        );
      }
      
      if (nextStep === 7 && outcome.gate2 !== 'deny') {
        // Gate 3: Response Masking
        const result = evaluateGate3(selectedRole, outcome.response || {});
        setGate3Result(result);
        addAuditEntry('GATE_3_EVAL', `Policy: pii-masking`);
        addAuditEntry(
          result.decision === 'MASK' ? 'GATE_3_MASK' : 'GATE_3_PASS',
          result.maskedFields.length > 0 
            ? `${result.maskedFields.length} fields masked` 
            : 'No masking required'
        );
      }
      
      if (nextStep === PIPELINE_STEPS.length - 1) {
        setIsRunning(false);
        addAuditEntry('COMPLETE', outcome.finalResult === 'success' ? 'Request fulfilled' : 'Request denied');
        
        // Show CTA modal after completion
        setTimeout(() => setShowCTAModal(true), 2000);
      }
      
      setCurrentStep(nextStep);
    }, duration);
    
    return () => clearTimeout(timer);
  }, [currentStep, isRunning, selectedRole, scenario, outcome, addAuditEntry]);
  
  // Skip to next step
  const skipToNext = () => {
    if (currentStep < PIPELINE_STEPS.length - 1) {
      setCurrentStep(currentStep + 1);
    }
  };

  // Render step content
  const renderStepContent = () => {
    switch (currentStep) {
      case 0:
        return (
          <div className="text-center py-12">
            <div className="inline-flex items-center justify-center w-20 h-20 bg-gradient-to-br from-teal-500 to-teal-600 rounded-2xl mb-6 shadow-xl">
              <Shield size={40} className="text-white" />
            </div>
            <h2 className="text-3xl font-bold text-deep-teal mb-4">
              Dynamic Authorization for MCP-Powered Agents
            </h2>
            <p className="text-xl text-gray-600 mb-8">
              Zero-Trust Policy-Based Access Control for the Modern Enterprise
            </p>
            <p className="text-gray-500 mb-8">
              Select a role and scenario above, then click "Start Demo" to see the authorization pipeline in action.
            </p>
          </div>
        );
        
      case 1:
        return (
          <div className="bg-gradient-to-r from-blue-50 to-white p-6 rounded-xl border border-blue-200">
            <div className="flex items-start">
              <div className="bg-gradient-to-r from-blue-500 to-blue-600 text-white p-4 rounded-xl mr-5">
                <User size={28} />
              </div>
              <div className="flex-grow">
                <h4 className="text-lg font-semibold text-deep-teal mb-2">User Request Submitted</h4>
                <div className="bg-white p-4 rounded-lg border border-blue-100 mb-4">
                  <p className="text-deep-teal font-medium">"{scenario.query}"</p>
                </div>
                <div className="grid grid-cols-2 gap-4 text-sm">
                  <div className="bg-gray-50 p-3 rounded-lg">
                    <div className="text-gray-500">User Role</div>
                    <div className="font-medium text-deep-teal">{role.name}</div>
                  </div>
                  <div className="bg-gray-50 p-3 rounded-lg">
                    <div className="text-gray-500">Branch</div>
                    <div className="font-medium text-deep-teal">{role.branch}</div>
                  </div>
                </div>
              </div>
            </div>
          </div>
        );
        
      case 2:
        return (
          <div className="bg-gradient-to-r from-amber-50 to-white p-6 rounded-xl border border-amber-200">
            <div className="flex items-start">
              <div className="bg-gradient-to-r from-amber-500 to-amber-600 text-white p-4 rounded-xl mr-5">
                <Key size={28} />
              </div>
              <div className="flex-grow">
                <h4 className="text-lg font-semibold text-deep-teal mb-2">OAuth 2.1 Authentication</h4>
                <p className="text-gray-600 mb-4">
                  MCP authorization is built on OAuth 2.1, requiring strict security measures including PKCE protection and audience-restricted tokens.
                </p>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div className="bg-white p-4 rounded-lg border border-amber-100">
                    <h5 className="font-medium text-deep-teal mb-2 flex items-center">
                      <Check size={16} className="text-green-500 mr-2" />
                      Security Flow
                    </h5>
                    <ul className="text-sm text-gray-600 space-y-1">
                      <li>• Authorization Request with PKCE</li>
                      <li>• User Authentication & Consent</li>
                      <li>• Token Request with Code Verifier</li>
                      <li>• Bearer Token (audience-restricted)</li>
                    </ul>
                  </div>
                  <div className="bg-white p-4 rounded-lg border border-amber-100">
                    <h5 className="font-medium text-deep-teal mb-2 flex items-center">
                      <Shield size={16} className="text-teal-500 mr-2" />
                      Token Validated
                    </h5>
                    <div className="text-sm text-gray-600 space-y-1">
                      <div className="flex justify-between">
                        <span>User ID:</span>
                        <span className="font-mono text-xs">{role.employeeId}</span>
                      </div>
                      <div className="flex justify-between">
                        <span>Scope:</span>
                        <span className="font-mono text-xs">mcp:tools</span>
                      </div>
                      <div className="flex justify-between">
                        <span>Audience:</span>
                        <span className="font-mono text-xs">acme-bank-mcp</span>
                      </div>
                    </div>
                  </div>
                </div>
              </div>
            </div>
          </div>
        );
        
      case 3:
        const gate1 = gate1Result || evaluateGate1(selectedRole);
        return (
          <div className="bg-gradient-to-r from-teal-50 to-white p-6 rounded-xl border-l-4 border-teal-500">
            <div className="flex items-start">
              <div className="bg-gradient-to-r from-teal-500 to-teal-600 text-white p-4 rounded-xl mr-5">
                <Filter size={28} />
              </div>
              <div className="flex-grow">
                <div className="flex items-center justify-between mb-4">
                  <h4 className="text-lg font-semibold text-deep-teal">Gate 1: Tool Discovery Filter</h4>
                  <DecisionBadge decision={outcome.gate1 === 'permit' ? 'FILTER' : 'DENY'} />
                </div>
                
                <p className="text-gray-600 mb-4">
                  PlainID filters the MCP tool list based on user role and permissions before exposing to the AI agent.
                </p>
                
                <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
                  <div>
                    <div className="text-sm font-medium text-gray-600 mb-2">MCP Server Response (All Tools)</div>
                    <JsonViewer 
                      data={{
                        jsonrpc: "2.0",
                        id: 1,
                        result: {
                          tools: getAllTools().slice(0, 5).map(t => t.name)
                        }
                      }}
                      maxHeight="150px"
                    />
                  </div>
                  <div>
                    <div className="text-sm font-medium text-gray-600 mb-2">Filtered by PlainID</div>
                    <JsonViewer 
                      data={{
                        jsonrpc: "2.0",
                        id: 1,
                        result: {
                          tools: gate1.filteredTools.map(t => t.name)
                        },
                        _plainid: {
                          filtered: gate1.removedCount,
                          policy: "role-based-tool-access"
                        }
                      }}
                      maxHeight="150px"
                    />
                  </div>
                </div>
                
                {gate1.removedTools.length > 0 && (
                  <div className="mt-4 bg-yellow-50 p-3 rounded-lg border border-yellow-200">
                    <div className="text-sm font-medium text-yellow-800 mb-1">
                      {gate1.removedCount} tools removed by policy
                    </div>
                    <div className="text-xs text-yellow-700">
                      {gate1.removedTools.slice(0, 3).map(t => t.name).join(', ')}
                      {gate1.removedTools.length > 3 && ` +${gate1.removedTools.length - 3} more`}
                    </div>
                  </div>
                )}
              </div>
            </div>
          </div>
        );
        
      case 4:
        const toolAvailable = outcome.gate1 === 'permit';
        return (
          <div className="bg-gradient-to-r from-purple-50 to-white p-6 rounded-xl border border-purple-200">
            <div className="flex items-start">
              <div className="bg-gradient-to-r from-purple-500 to-purple-600 text-white p-4 rounded-xl mr-5">
                <Bot size={28} />
              </div>
              <div className="flex-grow">
                <h4 className="text-lg font-semibold text-deep-teal mb-2">AI Agent Tool Selection</h4>
                <p className="text-gray-600 mb-4">
                  The Enterprise AI Assistant analyzes the request and selects the appropriate tool from the filtered list.
                </p>
                
                {toolAvailable ? (
                  <div className="bg-white p-4 rounded-lg border border-purple-100">
                    <div className="flex items-center justify-between mb-3">
                      <div className="flex items-center">
                        <Check size={18} className="text-green-500 mr-2" />
                        <span className="font-medium text-deep-teal">Tool Selected</span>
                      </div>
                      <span className="font-mono text-sm bg-purple-100 text-purple-800 px-2 py-1 rounded">
                        {scenario.tool}
                      </span>
                    </div>
                    <div className="text-sm text-gray-600">
                      <div className="flex justify-between py-1 border-b border-gray-100">
                        <span>Server:</span>
                        <span className="font-mono">{getToolByName(scenario.tool)?.serverName}</span>
                      </div>
                      <div className="flex justify-between py-1">
                        <span>Parameters:</span>
                        <span className="font-mono">{JSON.stringify(scenario.params)}</span>
                      </div>
                    </div>
                  </div>
                ) : (
                  <div className="bg-red-50 p-4 rounded-lg border border-red-200">
                    <div className="flex items-center text-red-700">
                      <XCircle size={18} className="mr-2" />
                      <span className="font-medium">Tool Not Available</span>
                    </div>
                    <p className="text-sm text-red-600 mt-2">
                      The requested tool "{scenario.tool}" is not in the filtered tool list for role "{role.name}".
                    </p>
                  </div>
                )}
              </div>
            </div>
          </div>
        );
        
      case 5:
        const gate2 = gate2Result || evaluateGate2(selectedRole, scenario.tool, scenario.params);
        return (
          <div className={`p-6 rounded-xl border-l-4 ${
            outcome.gate2 === 'permit' 
              ? 'bg-gradient-to-r from-blue-50 to-white border-blue-500'
              : 'bg-gradient-to-r from-red-50 to-white border-red-500'
          }`}>
            <div className="flex items-start">
              <div className={`p-4 rounded-xl mr-5 text-white ${
                outcome.gate2 === 'permit'
                  ? 'bg-gradient-to-r from-blue-500 to-blue-600'
                  : 'bg-gradient-to-r from-red-500 to-red-600'
              }`}>
                <Shield size={28} />
              </div>
              <div className="flex-grow">
                <div className="flex items-center justify-between mb-4">
                  <h4 className="text-lg font-semibold text-deep-teal">Gate 2: Execution Authorization</h4>
                  <DecisionBadge decision={outcome.gate2 === 'permit' ? 'PERMIT' : 'DENY'} />
                </div>
                
                <p className="text-gray-600 mb-4">
                  PlainID validates the specific tool call with parameter-level authorization checks.
                </p>
                
                <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
                  <div>
                    <div className="text-sm font-medium text-gray-600 mb-2">Authorization Context</div>
                    <JsonViewer 
                      data={generateAuthContext(selectedRole, scenario.tool, scenario.params)}
                      maxHeight="180px"
                    />
                  </div>
                  <div>
                    <div className="text-sm font-medium text-gray-600 mb-2">Policy Decision</div>
                    <JsonViewer 
                      data={{
                        decision: outcome.gate2 === 'permit' ? 'PERMIT' : 'DENY',
                        tool: scenario.tool,
                        policies_evaluated: [
                          {
                            policy: "role-based-tool-access",
                            result: outcome.gate1 === 'permit' ? 'PERMIT' : 'DENY'
                          },
                          {
                            policy: "branch-boundary-enforcement",
                            result: outcome.gate2 === 'permit' ? 'PERMIT' : 'DENY'
                          }
                        ],
                        reason: gate2.reason
                      }}
                      maxHeight="180px"
                    />
                  </div>
                </div>
                
                {outcome.gate2 === 'deny' && outcome.suggestion && (
                  <div className="mt-4 bg-yellow-50 p-3 rounded-lg border border-yellow-200">
                    <div className="flex items-center text-yellow-800">
                      <Info size={16} className="mr-2" />
                      <span className="text-sm font-medium">Suggestion: {outcome.suggestion}</span>
                    </div>
                  </div>
                )}
                
                {outcome.agentCheck?.triggered && (
                  <div className="mt-4 bg-orange-50 p-3 rounded-lg border border-orange-200">
                    <div className="flex items-center text-orange-800">
                      <AlertTriangle size={16} className="mr-2" />
                      <span className="text-sm font-medium">Agent Guardrail: {outcome.agentCheck.reason}</span>
                    </div>
                  </div>
                )}
              </div>
            </div>
          </div>
        );
        
      case 6:
        if (outcome.gate2 === 'deny') {
          return (
            <div className="bg-gray-100 p-6 rounded-xl border border-gray-200 text-center">
              <div className="text-gray-400 mb-4">
                <X size={48} className="mx-auto" />
              </div>
              <h4 className="text-lg font-semibold text-gray-600 mb-2">Execution Skipped</h4>
              <p className="text-gray-500">
                Tool execution was not performed due to authorization denial in Gate 2.
              </p>
            </div>
          );
        }
        
        return (
          <div className="bg-gradient-to-r from-green-50 to-white p-6 rounded-xl border border-green-200">
            <div className="flex items-start">
              <div className="bg-gradient-to-r from-green-500 to-green-600 text-white p-4 rounded-xl mr-5">
                <Server size={28} />
              </div>
              <div className="flex-grow">
                <h4 className="text-lg font-semibold text-deep-teal mb-2">MCP Server Execution</h4>
                <p className="text-gray-600 mb-4">
                  The MCP Server executes the authorized tool and returns the raw response.
                </p>
                
                <div className="bg-white p-4 rounded-lg border border-green-100">
                  <div className="flex items-center mb-3">
                    <Zap size={18} className="text-green-500 mr-2" />
                    <span className="font-medium text-deep-teal">Tool Executed Successfully</span>
                  </div>
                  <JsonViewer 
                    data={{
                      jsonrpc: "2.0",
                      id: 2,
                      result: outcome.response
                    }}
                    title="MCP Response (Raw)"
                    maxHeight="200px"
                  />
                </div>
              </div>
            </div>
          </div>
        );
        
      case 7:
        if (outcome.gate2 === 'deny') {
          return (
            <div className="bg-gray-100 p-6 rounded-xl border border-gray-200 text-center">
              <div className="text-gray-400 mb-4">
                <X size={48} className="mx-auto" />
              </div>
              <h4 className="text-lg font-semibold text-gray-600 mb-2">Response Masking Skipped</h4>
              <p className="text-gray-500">
                No response to mask due to authorization denial.
              </p>
            </div>
          );
        }
        
        const gate3 = gate3Result || evaluateGate3(selectedRole, outcome.response || {});
        return (
          <div className="bg-gradient-to-r from-purple-50 to-white p-6 rounded-xl border-l-4 border-purple-500">
            <div className="flex items-start">
              <div className="bg-gradient-to-r from-purple-500 to-purple-600 text-white p-4 rounded-xl mr-5">
                <Eye size={28} />
              </div>
              <div className="flex-grow">
                <div className="flex items-center justify-between mb-4">
                  <h4 className="text-lg font-semibold text-deep-teal">Gate 3: Response Masking</h4>
                  <DecisionBadge decision={gate3.decision} />
                </div>
                
                <p className="text-gray-600 mb-4">
                  PlainID masks sensitive data in the response based on user and agent permissions.
                </p>
                
                <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
                  <div>
                    <div className="text-sm font-medium text-gray-600 mb-2">Raw Response</div>
                    <div className="bg-red-50 rounded-lg p-4 border border-red-200">
                      <pre className="text-xs font-mono overflow-auto max-h-40">
                        {JSON.stringify(outcome.response, null, 2)}
                      </pre>
                      {gate3.maskedFields.length > 0 && (
                        <div className="mt-2 text-xs text-red-600">
                          ⚠️ Contains {gate3.maskedFields.length} sensitive field(s)
                        </div>
                      )}
                    </div>
                  </div>
                  <div>
                    <div className="text-sm font-medium text-gray-600 mb-2">Masked Response</div>
                    <div className="bg-green-50 rounded-lg p-4 border border-green-200">
                      <pre className="text-xs font-mono overflow-auto max-h-40">
                        {JSON.stringify(gate3.maskedResponse, null, 2)}
                      </pre>
                      <div className="mt-2 text-xs text-green-600">
                        ✓ Policy-compliant response
                      </div>
                    </div>
                  </div>
                </div>
                
                {gate3.maskedFields.length > 0 && (
                  <div className="mt-4 bg-purple-50 p-3 rounded-lg border border-purple-200">
                    <div className="text-sm font-medium text-purple-800 mb-2">Fields Masked:</div>
                    <div className="space-y-1">
                      {gate3.maskedFields.map((field, idx) => (
                        <div key={idx} className="text-xs text-purple-700 flex items-center">
                          <Eye size={12} className="mr-1" />
                          <span className="font-mono">{field.field}</span>: {field.reason}
                        </div>
                      ))}
                    </div>
                  </div>
                )}
              </div>
            </div>
          </div>
        );
        
      case 8:
        return (
          <div className={`p-6 rounded-xl ${
            outcome.finalResult === 'success'
              ? 'bg-gradient-to-r from-green-50 to-white border border-green-200'
              : 'bg-gradient-to-r from-red-50 to-white border border-red-200'
          }`}>
            <div className="flex items-start">
              <div className={`p-4 rounded-xl mr-5 text-white ${
                outcome.finalResult === 'success'
                  ? 'bg-gradient-to-r from-green-500 to-green-600'
                  : 'bg-gradient-to-r from-red-500 to-red-600'
              }`}>
                {outcome.finalResult === 'success' ? <Check size={28} /> : <X size={28} />}
              </div>
              <div className="flex-grow">
                <h4 className="text-lg font-semibold text-deep-teal mb-2">
                  {outcome.finalResult === 'success' ? 'Request Completed Successfully' : 'Request Denied'}
                </h4>
                
                {outcome.finalResult === 'success' ? (
                  <>
                    <p className="text-gray-600 mb-4">
                      The secure MCP authorization pipeline has completed. The response has been verified
                      and masked according to your permissions.
                    </p>
                    <div className="bg-white p-4 rounded-lg border border-green-200">
                      <div className="flex items-center mb-3">
                        <Shield size={18} className="text-teal-500 mr-2" />
                        <span className="font-medium text-deep-teal">Final Response (Policy-Compliant)</span>
                      </div>
                      <JsonViewer 
                        data={gate3Result?.maskedResponse || outcome.response}
                        maxHeight="150px"
                      />
                    </div>
                  </>
                ) : (
                  <>
                    <p className="text-gray-600 mb-4">
                      The request was denied by PlainID's authorization controls. 
                      {outcome.reason && ` Reason: ${outcome.reason}`}
                    </p>
                    <div className="bg-red-100 p-4 rounded-lg border border-red-200">
                      <div className="flex items-center">
                        <Lock size={18} className="text-red-600 mr-2" />
                        <span className="text-red-800">
                          Access denied based on role "{role.name}" and policy "{outcome.policy}"
                        </span>
                      </div>
                    </div>
                  </>
                )}
                
                {/* Summary of gates */}
                <div className="mt-6 grid grid-cols-3 gap-4">
                  <div className={`p-3 rounded-lg ${
                    outcome.gate1 === 'permit' ? 'bg-teal-100' : 'bg-red-100'
                  }`}>
                    <GateBadge gate={1} />
                    <div className={`text-sm font-medium mt-2 ${
                      outcome.gate1 === 'permit' ? 'text-teal-800' : 'text-red-800'
                    }`}>
                      {outcome.gate1 === 'permit' ? 'Passed' : 'Denied'}
                    </div>
                  </div>
                  <div className={`p-3 rounded-lg ${
                    outcome.gate2 === 'permit' ? 'bg-blue-100' : 
                    outcome.gate2 === 'skip' ? 'bg-gray-100' : 'bg-red-100'
                  }`}>
                    <GateBadge gate={2} />
                    <div className={`text-sm font-medium mt-2 ${
                      outcome.gate2 === 'permit' ? 'text-blue-800' : 
                      outcome.gate2 === 'skip' ? 'text-gray-600' : 'text-red-800'
                    }`}>
                      {outcome.gate2 === 'permit' ? 'Passed' : 
                       outcome.gate2 === 'skip' ? 'Skipped' : 'Denied'}
                    </div>
                  </div>
                  <div className={`p-3 rounded-lg ${
                    outcome.gate3 === 'mask' ? 'bg-purple-100' : 
                    outcome.gate3 === 'skip' ? 'bg-gray-100' : 'bg-green-100'
                  }`}>
                    <GateBadge gate={3} />
                    <div className={`text-sm font-medium mt-2 ${
                      outcome.gate3 === 'mask' ? 'text-purple-800' : 
                      outcome.gate3 === 'skip' ? 'text-gray-600' : 'text-green-800'
                    }`}>
                      {outcome.gate3 === 'mask' ? 'Masked' : 
                       outcome.gate3 === 'skip' ? 'Skipped' : 'Passed'}
                    </div>
                  </div>
                </div>
              </div>
            </div>
          </div>
        );
        
      default:
        return null;
    }
  };

  // Render comparison view
  const renderComparisonView = () => {
    return (
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
        {/* Without PlainID */}
        <div className="bg-white rounded-xl border border-gray-200 p-6 shadow-sm">
          <div className="flex items-center mb-6">
            <div className="rounded-full bg-red-50 p-3 mr-3">
              <Unlock className="text-red-500" size={24} />
            </div>
            <div>
              <h3 className="text-xl font-semibold text-gray-900">Without PlainID</h3>
              <p className="text-sm text-gray-500">Standard MCP - No Authorization</p>
            </div>
          </div>
          
          <div className="space-y-4">
            <div>
              <h4 className="font-medium text-gray-700 mb-2 text-sm">Query</h4>
              <div className="bg-gray-50 p-3 rounded-lg border border-gray-200">
                <p className="text-sm text-gray-900">{scenario.query}</p>
              </div>
            </div>
            
            <div>
              <h4 className="font-medium text-gray-700 mb-2 text-sm">Tool Discovery</h4>
              <div className="bg-red-50 p-3 rounded-lg border border-red-200">
                <div className="flex items-center text-red-700 mb-2">
                  <X size={14} className="mr-1" />
                  <span className="text-sm">All 12 tools exposed to all users</span>
                </div>
                <div className="text-xs text-red-600">
                  No role-based filtering applied
                </div>
              </div>
            </div>
            
            <div>
              <h4 className="font-medium text-gray-700 mb-2 text-sm">Execution</h4>
              <div className="bg-red-50 p-3 rounded-lg border border-red-200">
                <div className="flex items-center text-red-700 mb-2">
                  <X size={14} className="mr-1" />
                  <span className="text-sm">No parameter-level authorization</span>
                </div>
                <div className="text-xs text-red-600">
                  Any authenticated user can call any tool
                </div>
              </div>
            </div>
            
            <div>
              <h4 className="font-medium text-gray-700 mb-2 text-sm">Response</h4>
              <div className="bg-red-50 p-4 rounded-lg border border-red-200">
                <pre className="text-xs font-mono overflow-auto max-h-32 text-gray-800">
{JSON.stringify({
  account_id: "12345",
  customer_name: "John Smith",
  ssn: "123-45-6789",
  account_number: "9876543210",
  balance: 45230.00
}, null, 2)}
                </pre>
                <div className="mt-2 p-2 bg-red-100 border border-red-300 rounded">
                  <p className="text-red-700 text-xs flex items-center">
                    <AlertTriangle size={12} className="mr-1" />
                    SSN and full account number exposed!
                  </p>
                </div>
              </div>
            </div>
          </div>
        </div>
        
        {/* With PlainID */}
        <div className="bg-white rounded-xl border border-gray-200 p-6 shadow-sm">
          <div className="flex items-center mb-6">
            <div className="rounded-full bg-teal-50 p-3 mr-3">
              <Shield className="text-teal-500" size={24} />
            </div>
            <div>
              <h3 className="text-xl font-semibold text-gray-900 flex items-center">
                With PlainID
                <BetaTag />
              </h3>
              <p className="text-sm text-gray-500">Dynamic Authorization for MCP</p>
            </div>
          </div>
          
          <div className="space-y-4">
            <div>
              <h4 className="font-medium text-gray-700 mb-2 text-sm">Query</h4>
              <div className="bg-gray-50 p-3 rounded-lg border border-gray-200">
                <p className="text-sm text-gray-900">{scenario.query}</p>
              </div>
            </div>
            
            <div>
              <h4 className="font-medium text-gray-700 mb-2 text-sm flex items-center">
                <GateBadge gate={1} />
                <span className="ml-2">Tool Discovery</span>
              </h4>
              <div className="bg-teal-50 p-3 rounded-lg border border-teal-200">
                <div className="flex items-center text-teal-700 mb-2">
                  <Check size={14} className="mr-1" />
                  <span className="text-sm">
                    {outcome.gate1 === 'permit' 
                      ? `${evaluateGate1(selectedRole).filteredCount} tools available for ${role.name}`
                      : 'Tool not available for this role'
                    }
                  </span>
                </div>
                <div className="text-xs text-teal-600">
                  Policy: role-based-tool-access
                </div>
              </div>
            </div>
            
            <div>
              <h4 className="font-medium text-gray-700 mb-2 text-sm flex items-center">
                <GateBadge gate={2} />
                <span className="ml-2">Execution</span>
              </h4>
              <div className={`p-3 rounded-lg border ${
                outcome.gate2 === 'permit' 
                  ? 'bg-blue-50 border-blue-200' 
                  : 'bg-red-50 border-red-200'
              }`}>
                <div className={`flex items-center mb-2 ${
                  outcome.gate2 === 'permit' ? 'text-blue-700' : 'text-red-700'
                }`}>
                  {outcome.gate2 === 'permit' 
                    ? <Check size={14} className="mr-1" />
                    : <X size={14} className="mr-1" />
                  }
                  <span className="text-sm">
                    {outcome.gate2 === 'permit' 
                      ? 'Execution authorized with scope checks'
                      : outcome.reason || 'Execution denied'
                    }
                  </span>
                </div>
                <div className={`text-xs ${
                  outcome.gate2 === 'permit' ? 'text-blue-600' : 'text-red-600'
                }`}>
                  Policy: branch-boundary-enforcement
                </div>
              </div>
            </div>
            
            <div>
              <h4 className="font-medium text-gray-700 mb-2 text-sm flex items-center">
                <GateBadge gate={3} />
                <span className="ml-2">Response</span>
              </h4>
              <div className="bg-purple-50 p-4 rounded-lg border border-purple-200">
                <pre className="text-xs font-mono overflow-auto max-h-32 text-gray-800">
{JSON.stringify(outcome.response || {
  message: "Access denied",
  reason: outcome.reason
}, null, 2)}
                </pre>
                <div className="mt-2 p-2 bg-purple-100 border border-purple-300 rounded">
                  <p className="text-purple-700 text-xs flex items-center">
                    <Shield size={12} className="mr-1" />
                    {outcome.finalResult === 'success' 
                      ? 'SSN masked, policy-compliant response'
                      : 'Access denied by policy'
                    }
                  </p>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>
    );
  };

  // Render incident prevention view
  const renderIncidentView = () => {
    return (
      <div className="space-y-6">
        <div className="text-center mb-8">
          <h2 className="text-2xl font-bold text-deep-teal mb-2">
            Security Incident Prevention
          </h2>
          <p className="text-gray-600">
            See how PlainID prevents real-world MCP security incidents
          </p>
        </div>
        
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
          {incidents.map((incident) => (
            <div key={incident.id} className="bg-white rounded-xl border border-gray-200 p-6 shadow-sm hover:shadow-md transition-shadow">
              <div className={`inline-flex items-center px-2 py-1 rounded-full text-xs font-medium mb-3 ${
                incident.severity === 'critical' ? 'bg-red-100 text-red-800' :
                incident.severity === 'high' ? 'bg-orange-100 text-orange-800' :
                'bg-yellow-100 text-yellow-800'
              }`}>
                <AlertTriangle size={12} className="mr-1" />
                {incident.severity.toUpperCase()}
              </div>
              
              <h3 className="text-lg font-semibold text-deep-teal mb-2">{incident.name}</h3>
              <p className="text-sm text-gray-500 mb-3">{incident.company} • {incident.date}</p>
              <p className="text-sm text-gray-600 mb-4">{incident.description}</p>
              
              <div className="space-y-3">
                <div className="bg-red-50 p-3 rounded-lg border border-red-200">
                  <div className="text-xs font-medium text-red-800 mb-1">Without PlainID:</div>
                  <div className="text-xs text-red-700">{incident.without_plainid.outcome}</div>
                </div>
                
                <div className="bg-green-50 p-3 rounded-lg border border-green-200">
                  <div className="text-xs font-medium text-green-800 mb-1">With PlainID:</div>
                  <div className="text-xs text-green-700">{incident.with_plainid.outcome}</div>
                </div>
              </div>
            </div>
          ))}
        </div>
      </div>
    );
  };

  return (
    <div className="flex flex-col min-h-screen bg-gradient-to-br from-icy-gray via-white to-icy-gray font-sans">
      {/* Header */}
      <header className="bg-white shadow-sm border-b border-gray-100 sticky top-0 z-50">
        <div className="max-w-7xl mx-auto px-6 py-4 flex items-center justify-between">
          <div className="flex items-center">
            <div className="bg-gradient-to-r from-teal-500 to-teal-600 text-white p-2.5 rounded-lg shadow-sm">
              <Shield size={24} />
            </div>
            <div className="ml-3">
              <h1 className="text-xl font-medium text-deep-teal tracking-tight flex items-center">
                PlainID MCP Authorizer
                <BetaTag />
              </h1>
              <p className="text-xs text-gray-500">Dynamic Authorization for MCP-Powered Agents</p>
            </div>
          </div>
          <div className="flex space-x-3">
            <button
              onClick={() => { setShowIncidents(false); setShowComparison(!showComparison); }}
              className={`px-4 py-2 rounded-lg text-sm font-medium transition-all ${
                showComparison && !showIncidents
                  ? 'bg-teal-500 text-white'
                  : 'bg-white border border-gray-200 text-gray-700 hover:border-teal-400'
              }`}
            >
              {showComparison && !showIncidents ? 'Show Pipeline' : 'Compare Approaches'}
            </button>
            <button
              onClick={() => { setShowComparison(false); setShowIncidents(!showIncidents); }}
              className={`px-4 py-2 rounded-lg text-sm font-medium transition-all ${
                showIncidents
                  ? 'bg-teal-500 text-white'
                  : 'bg-white border border-gray-200 text-gray-700 hover:border-teal-400'
              }`}
            >
              {showIncidents ? 'Show Pipeline' : 'Incident Prevention'}
            </button>
          </div>
        </div>
      </header>
      
      {/* Main Content */}
      <main className="flex-grow max-w-7xl mx-auto w-full px-6 py-8">
        {showIncidents ? (
          renderIncidentView()
        ) : showComparison ? (
          renderComparisonView()
        ) : (
          <>
            {/* Configuration Panel */}
            <div className="bg-white rounded-xl shadow-sm border border-gray-100 p-6 mb-8">
              <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
                {/* Role Selection */}
                <div>
                  <h3 className="text-sm font-semibold text-deep-teal uppercase tracking-wider mb-3">
                    Select User Role
                  </h3>
                  <RoleSelector 
                    roles={roles} 
                    selectedId={selectedRole} 
                    onSelect={(id) => { setSelectedRole(id); resetPipeline(); }}
                    disabled={isRunning}
                  />
                </div>
                
                {/* Scenario Selection */}
                <div className="lg:col-span-2">
                  <h3 className="text-sm font-semibold text-deep-teal uppercase tracking-wider mb-3">
                    Select Demo Scenario
                  </h3>
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-2">
                    <ScenarioSelector 
                      scenarios={scenarios.slice(0, 3)} 
                      selectedId={selectedScenario}
                      onSelect={(id) => { setSelectedScenario(id); resetPipeline(); }}
                      disabled={isRunning}
                    />
                    <ScenarioSelector 
                      scenarios={scenarios.slice(3)} 
                      selectedId={selectedScenario}
                      onSelect={(id) => { setSelectedScenario(id); resetPipeline(); }}
                      disabled={isRunning}
                    />
                  </div>
                </div>
              </div>
            </div>
            
            {/* Identity Panel */}
            <div className="mb-8">
              <IdentityPanel role={role} agent={agent} />
            </div>
            
            {/* Pipeline Visualization */}
            <div className="bg-white rounded-xl shadow-sm border border-gray-100 p-6 mb-8">
              <div className="flex items-center justify-between mb-6">
                <div>
                  <h3 className="text-lg font-semibold text-deep-teal">MCP Authorization Pipeline</h3>
                  <p className="text-sm text-gray-500">
                    {currentStep === 0 
                      ? 'Click "Start Demo" to see the authorization flow'
                      : PIPELINE_STEPS[currentStep].description
                    }
                  </p>
                </div>
                <div className="flex space-x-3">
                  {currentStep === 0 && (
                    <button
                      onClick={startPipeline}
                      className="flex items-center px-6 py-2.5 bg-gradient-to-r from-teal-500 to-teal-600 text-white rounded-lg font-medium shadow-sm hover:shadow-md transition-all"
                    >
                      <Play size={18} className="mr-2" />
                      Start Demo
                    </button>
                  )}
                  {currentStep > 0 && currentStep < PIPELINE_STEPS.length - 1 && (
                    <button
                      onClick={skipToNext}
                      className="flex items-center px-4 py-2 bg-white border border-gray-200 text-gray-700 rounded-lg font-medium hover:border-teal-400 transition-all"
                    >
                      <ChevronRight size={18} className="mr-1" />
                      Skip
                    </button>
                  )}
                  {currentStep === PIPELINE_STEPS.length - 1 && (
                    <button
                      onClick={() => { resetPipeline(); startPipeline(); }}
                      className="flex items-center px-6 py-2.5 bg-gradient-to-r from-teal-500 to-teal-600 text-white rounded-lg font-medium shadow-sm hover:shadow-md transition-all"
                    >
                      <RotateCcw size={18} className="mr-2" />
                      Run Again
                    </button>
                  )}
                  {currentStep > 0 && (
                    <button
                      onClick={resetPipeline}
                      className="flex items-center px-4 py-2 bg-white border border-gray-200 text-gray-700 rounded-lg font-medium hover:border-teal-400 transition-all"
                    >
                      <RotateCcw size={18} className="mr-1" />
                      Reset
                    </button>
                  )}
                </div>
              </div>
              
              {/* Progress Steps */}
              <div className="mb-8">
                <ProgressSteps currentStep={currentStep} steps={PIPELINE_STEPS} />
              </div>
              
              {/* Step Content */}
              <div className="min-h-[400px]">
                {renderStepContent()}
              </div>
              
              {/* Processing Indicator */}
              {isRunning && currentStep < PIPELINE_STEPS.length - 1 && (
                <div className="flex items-center justify-center mt-6 text-teal-600">
                  <div className="flex space-x-1 mr-3">
                    <span className="w-2 h-2 bg-teal-500 rounded-full animate-bounce" />
                    <span className="w-2 h-2 bg-teal-500 rounded-full animate-bounce animation-delay-100" />
                    <span className="w-2 h-2 bg-teal-500 rounded-full animate-bounce animation-delay-200" />
                  </div>
                  <span className="text-sm font-medium">Processing...</span>
                </div>
              )}
            </div>
            
            {/* Audit Log */}
            {auditLog.length > 0 && <AuditLog entries={auditLog} />}
            
            {/* Key Takeaways */}
            {currentStep === PIPELINE_STEPS.length - 1 && <KeyTakeaways />}
          </>
        )}
      </main>
      
      {/* Footer */}
      <footer className="bg-gradient-to-r from-deep-teal to-slate text-white py-8 mt-8">
        <div className="max-w-7xl mx-auto px-6">
          <div className="flex flex-col md:flex-row justify-between items-center">
            <div className="flex items-center mb-4 md:mb-0">
              <div className="bg-gradient-to-r from-teal-500 to-teal-600 text-white p-2 rounded-lg shadow-sm">
                <Shield size={18} />
              </div>
              <div className="ml-3">
                <p className="font-medium flex items-center">
                  PlainID MCP Authorizer
                  <BetaTag />
                </p>
                <p className="text-sm text-gray-300">Zero-Trust Authorization for AI Agents</p>
              </div>
            </div>
            <div className="flex gap-3">
              <span className="text-sm px-4 py-2 bg-teal-500 bg-opacity-20 rounded-lg font-medium">
                Policy-Based Access
              </span>
              <span className="text-sm px-4 py-2 bg-teal-500 bg-opacity-20 rounded-lg font-medium">
                MCP Security
              </span>
              <span className="text-sm px-4 py-2 bg-teal-500 bg-opacity-20 rounded-lg font-medium">
                Dynamic Authorization
              </span>
            </div>
          </div>
          <div className="mt-8 pt-6 border-t border-gray-700/50 text-center">
            <p className="text-sm text-gray-400">
              Made by the{' '}
              <a 
                href="mailto:presales@plainid.com"
                className="text-gray-400 hover:text-teal-400 transition-colors underline-offset-2 hover:underline"
              >
                SE Team
              </a>
              {' '}for Demonstration Purposes
            </p>
          </div>
        </div>
      </footer>
      
      {/* CTA Modal */}
      <CTAModal isOpen={showCTAModal} onClose={() => setShowCTAModal(false)} />
    </div>
  );
}
