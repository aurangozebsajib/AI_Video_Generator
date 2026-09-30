import React, { useState } from 'react';
import {
  X,
  Copy,
  Check,
  Play,
  FileCode,
  ShieldCheck,
  TrendingUp,
  Terminal,
  Sparkles,
  Sliders,
  Info,
  ShieldAlert,
  Loader2,
} from 'lucide-react';
import { executeSystemPromptTest } from '../services/api';

interface SystemPromptTemplate {
  id: string;
  title: string;
  badge: string;
  category: string;
  icon: React.ComponentType<{ className?: string }>;
  temperatureRange: string;
  recommendedTemp: number;
  description: string;
  systemPrompt: string;
  sampleInput: string;
}

const SYSTEM_PROMPT_TEMPLATES: SystemPromptTemplate[] = [
  {
    id: 'json_generator',
    title: '1. Structured JSON Data Generator',
    badge: 'Zero-Markdown JSON',
    category: 'Data & Schema',
    icon: FileCode,
    temperatureRange: '0.0 - 0.2',
    recommendedTemp: 0.1,
    description: 'Forces Gemini to output clean, schema-compliant JSON without markdown wrappers or conversational intro text.',
    systemPrompt: `You are a strict JSON data extraction engine.
Rules:
1. Output ONLY valid JSON.
2. Do NOT include markdown code blocks (e.g., no \`\`\`json).
3. Do NOT include any conversational text, introductory statements, or trailing notes.
4. Ensure all quotes are properly escaped and schema types (string, integer, array) are adhered to strictly.
5. If data for a requested field is missing, use null.`,
    sampleInput: `Extract user profile data:
Sarah Connor, Lead AI Architect at Cyberdyne Tech (sarah.c@cyberdyne.io). Skilled in Python, TypeScript, and PyTorch. Location: Austin, TX. Years of experience: 9.`,
  },
  {
    id: 'code_reviewer',
    title: '2. Deep Technical Code Reviewer & Refactorer',
    badge: 'Security & Refactor',
    category: 'Engineering & QA',
    icon: ShieldCheck,
    temperatureRange: '0.1 - 0.2',
    recommendedTemp: 0.1,
    description: 'Principal engineer persona for thorough code quality inspection, security audit, and production refactoring.',
    systemPrompt: `You are a Principal Software Engineer and Security Auditor. Your goal is to review, refactor, and optimize code provided by the user.
Instructions:
For every code snippet submitted, respond with the following distinct sections:
1. Executive Summary: A concise 2-sentence breakdown of overall code quality and critical issues.
2. Security & Performance Vulnerabilities: Bulleted list of bugs, memory leaks, security risks, or edge-case failures.
3. Refactored Code: Clean, production-ready implementation adhering to modern best practices and design patterns.
4. Key Changes & Justifications: Bullet points explaining why specific improvements were made.`,
    sampleInput: `function fetchUserData(userId) {
  var sql = "SELECT * FROM users WHERE id = '" + userId + "'";
  return db.query(sql);
}`,
  },
  {
    id: 'market_analyst',
    title: '3. Comprehensive Market & Business Analyst',
    badge: 'VC Strategic Briefing',
    category: 'Strategy & Growth',
    icon: TrendingUp,
    temperatureRange: '0.7 - 0.9',
    recommendedTemp: 0.7,
    description: 'Lead venture capital analyst evaluation of sector growth, unit economics, supply chains, and market roadmaps.',
    systemPrompt: `You are a Lead Venture Capital Analyst specializing in emerging markets and sector-specific business opportunities.
Task:
Analyze the sector or topic requested by the user and produce a structured strategic briefing.
Required Format:
* Market Overview: Current scope, value driver, and target demographics.
* Primary Business Models: Monetization strategy, supply chain, and key operations.
* Key Challenges & Risks: Regulatory hurdles, capital requirements, and operational bottlenecks.
* Strategic Roadmap: Actionable steps to validate and scale the business opportunity.`,
    sampleInput: `AI-powered automated video generation and vernacular voiceover localization for South Asian digital media and education.`,
  },
  {
    id: 'api_test_generator',
    title: '4. API & Integration Test Case Generator',
    badge: 'QA Test Matrix',
    category: 'Testing & Automation',
    icon: Terminal,
    temperatureRange: '0.2 - 0.4',
    recommendedTemp: 0.2,
    description: 'Lead QA automation engineer generating exhaustive test suites across happy path, edge cases, error handling, and security.',
    systemPrompt: `You are a Lead QA Automation Engineer. Generate exhaustive test suites for API specifications or endpoint descriptions provided by the user.
Coverage Guidelines:
* Happy Path scenarios (200 OK responses with standard payloads)
* Edge Cases (null fields, boundary value limits, large payloads)
* Error Handling (400 Bad Request, 401/403 Auth, 404 Not Found, 500 Server Errors)
* Security Testing (SQL injection vectors, payload tampering, unauthorized access)

Format the response as a clear markdown table with columns: \`Test Case ID\`, \`Scenario\`, \`Request Payload / Headers\`, \`Expected Status Code\`, \`Expected Assertion\`.`,
    sampleInput: `POST /api/videos/synthesize
Headers: Authorization: Bearer <TOKEN>, Content-Type: application/json
Payload: { "prompt": "Bengali village in morning mist", "voice": "bn-BD-NabanitaNeural", "resolution": "1080p", "duration_sec": 5 }`,
  },
];

interface SystemPromptsModalProps {
  isOpen: boolean;
  onClose: () => void;
}

export const SystemPromptsModal: React.FC<SystemPromptsModalProps> = ({
  isOpen,
  onClose,
}) => {
  const [selectedPromptId, setSelectedPromptId] = useState<string>('json_generator');
  const [copiedId, setCopiedId] = useState<string | null>(null);

  // Live testing state
  const [userInput, setUserInput] = useState<string>(SYSTEM_PROMPT_TEMPLATES[0].sampleInput);
  const [testOutput, setTestOutput] = useState<string | null>(null);
  const [isExecuting, setIsExecuting] = useState<boolean>(false);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);

  if (!isOpen) return null;

  const currentPrompt =
    SYSTEM_PROMPT_TEMPLATES.find((p) => p.id === selectedPromptId) ||
    SYSTEM_PROMPT_TEMPLATES[0];

  const handleSelect = (template: SystemPromptTemplate) => {
    setSelectedPromptId(template.id);
    setUserInput(template.sampleInput);
    setTestOutput(null);
    setErrorMsg(null);
  };

  const handleCopyPrompt = async () => {
    try {
      await navigator.clipboard.writeText(currentPrompt.systemPrompt);
      setCopiedId(currentPrompt.id);
      setTimeout(() => setCopiedId(null), 2500);
    } catch (e) {
      console.error(e);
    }
  };

  const handleRunLiveTest = async () => {
    if (!userInput.trim()) return;
    try {
      setIsExecuting(true);
      setErrorMsg(null);
      setTestOutput(null);
      const res = await executeSystemPromptTest(
        currentPrompt.systemPrompt,
        userInput,
        currentPrompt.recommendedTemp
      );
      setTestOutput(res);
    } catch (err: any) {
      setErrorMsg(err.message || 'Execution failed');
    } finally {
      setIsExecuting(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 sm:p-6 bg-slate-950/80 backdrop-blur-md animate-in fade-in duration-200">
      <div className="relative w-full max-w-5xl bg-slate-900 border border-slate-800 rounded-2xl shadow-2xl overflow-hidden flex flex-col max-h-[92vh]">
        {/* Header */}
        <div className="flex items-center justify-between px-6 py-4 border-b border-slate-800 bg-slate-950/60">
          <div className="flex items-center gap-3">
            <div className="flex items-center justify-center w-9 h-9 rounded-xl bg-indigo-500/10 border border-indigo-500/20 text-indigo-400">
              <Sparkles className="w-5 h-5" />
            </div>
            <div>
              <h2 className="text-base font-bold text-white flex items-center gap-2">
                <span>Google AI Studio System Prompts & Workflow Templates</span>
                <span className="text-[10px] px-2 py-0.5 rounded-full bg-emerald-500/20 text-emerald-300 border border-emerald-500/30">
                  Ready to Use
                </span>
              </h2>
              <p className="text-xs text-slate-400">
                Tailored system instructions, temperature configs, and live Gemini test suites
              </p>
            </div>
          </div>

          <button
            onClick={onClose}
            className="p-1.5 rounded-lg text-slate-400 hover:text-white hover:bg-slate-800 transition-colors"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Content Body: Left = Selector & Rules, Right = Live Tester & Output */}
        <div className="flex-1 overflow-y-auto p-6 space-y-6">
          {/* Top Quick Tip Box */}
          <div className="rounded-xl border border-indigo-500/20 bg-indigo-950/30 p-4 text-xs text-slate-300 flex flex-col sm:flex-row sm:items-center justify-between gap-3">
            <div className="flex items-start gap-2.5">
              <Info className="w-4 h-4 text-indigo-400 shrink-0 mt-0.5" />
              <div>
                <p className="font-semibold text-white">Google AI Studio Setup Tips:</p>
                <p className="text-slate-400 text-[11px] mt-0.5">
                  Paste these roles directly into the <strong>System Instructions</strong> box (not the chat input). Set Temperature to <strong>0.0 – 0.2</strong> for strict JSON/code, or <strong>0.7 – 0.9</strong> for market strategy.
                </p>
              </div>
            </div>
          </div>

          {/* Prompt Template Selector Grid */}
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3">
            {SYSTEM_PROMPT_TEMPLATES.map((tpl) => {
              const Icon = tpl.icon;
              const isSelected = tpl.id === selectedPromptId;
              return (
                <button
                  key={tpl.id}
                  onClick={() => handleSelect(tpl)}
                  className={`p-3.5 rounded-xl border text-left transition-all relative ${
                    isSelected
                      ? 'bg-indigo-950/40 border-indigo-500/80 shadow-lg shadow-indigo-500/15'
                      : 'bg-slate-950/60 border-slate-800 hover:border-slate-700 text-slate-400'
                  }`}
                >
                  <div className="flex items-center justify-between mb-2">
                    <div className={`p-1.5 rounded-lg ${isSelected ? 'bg-indigo-500/20 text-indigo-300' : 'bg-slate-800 text-slate-400'}`}>
                      <Icon className="w-4 h-4" />
                    </div>
                    <span className="text-[10px] font-mono font-medium px-2 py-0.5 rounded bg-slate-800 text-slate-300">
                      Temp: {tpl.recommendedTemp}
                    </span>
                  </div>
                  <h3 className={`text-xs font-bold leading-snug line-clamp-1 ${isSelected ? 'text-white' : 'text-slate-200'}`}>
                    {tpl.title.split('. ')[1] || tpl.title}
                  </h3>
                  <p className="text-[11px] text-slate-400 line-clamp-2 mt-1">
                    {tpl.badge}
                  </p>
                </button>
              );
            })}
          </div>

          {/* Main Inspection & Live Execution Grid */}
          <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 items-start">
            {/* Left Column (6 cols): System Prompt Instructions */}
            <div className="lg:col-span-6 space-y-3">
              <div className="flex items-center justify-between">
                <span className="text-xs font-semibold text-slate-300 flex items-center gap-1.5">
                  <Sliders className="w-3.5 h-3.5 text-indigo-400" />
                  <span>System Instructions:</span>
                </span>
                <button
                  onClick={handleCopyPrompt}
                  className="flex items-center gap-1.5 px-3 py-1 rounded-lg text-xs font-medium bg-slate-800 hover:bg-slate-700 text-indigo-300 border border-indigo-500/30 transition-all"
                >
                  {copiedId === currentPrompt.id ? (
                    <>
                      <Check className="w-3.5 h-3.5 text-emerald-400" />
                      <span className="text-emerald-400">Copied!</span>
                    </>
                  ) : (
                    <>
                      <Copy className="w-3.5 h-3.5" />
                      <span>Copy System Prompt</span>
                    </>
                  )}
                </button>
              </div>

              <div className="rounded-xl border border-slate-800 bg-slate-950 p-4 font-mono text-xs text-slate-200 leading-relaxed max-h-72 overflow-y-auto whitespace-pre-wrap select-all">
                {currentPrompt.systemPrompt}
              </div>

              <div className="p-3 rounded-xl bg-slate-950/60 border border-slate-800/80 text-[11px] text-slate-400 space-y-1">
                <div className="flex items-center justify-between">
                  <span className="text-slate-300 font-medium">Recommended Temperature:</span>
                  <span className="font-mono text-indigo-400 font-bold">{currentPrompt.temperatureRange}</span>
                </div>
                <p>{currentPrompt.description}</p>
              </div>
            </div>

            {/* Right Column (6 cols): Live Interactive Test Bench */}
            <div className="lg:col-span-6 space-y-3">
              <div className="flex items-center justify-between">
                <span className="text-xs font-semibold text-slate-300 flex items-center gap-1.5">
                  <Play className="w-3.5 h-3.5 text-emerald-400" />
                  <span>Live Test with Gemini (gemini-2.5-flash):</span>
                </span>
                <span className="text-[10px] text-slate-500 font-mono">
                  Temp: {currentPrompt.recommendedTemp}
                </span>
              </div>

              <div className="space-y-2">
                <textarea
                  value={userInput}
                  onChange={(e) => setUserInput(e.target.value)}
                  rows={3}
                  className="w-full bg-slate-950 border border-slate-800 rounded-xl p-3 text-xs text-slate-200 font-mono focus:border-indigo-500 focus:outline-none focus:ring-1 focus:ring-indigo-500"
                  placeholder="Enter sample input for this prompt..."
                />

                <div className="flex items-center justify-between">
                  <button
                    onClick={() => setUserInput(currentPrompt.sampleInput)}
                    className="text-[11px] text-slate-400 hover:text-indigo-400 transition-colors"
                  >
                    Reset to sample input
                  </button>

                  <button
                    onClick={handleRunLiveTest}
                    disabled={isExecuting || !userInput.trim()}
                    className="flex items-center gap-2 px-4 py-1.5 rounded-xl bg-indigo-600 hover:bg-indigo-500 text-white text-xs font-semibold shadow-md shadow-indigo-600/20 transition-all disabled:opacity-50"
                  >
                    {isExecuting ? (
                      <>
                        <Loader2 className="w-3.5 h-3.5 animate-spin" />
                        <span>Generating...</span>
                      </>
                    ) : (
                      <>
                        <Play className="w-3.5 h-3.5" />
                        <span>Execute Prompt</span>
                      </>
                    )}
                  </button>
                </div>
              </div>

              {/* Output Console */}
              <div className="space-y-1">
                <span className="text-[11px] text-slate-400 font-medium">Gemini Output:</span>
                <div className="h-44 rounded-xl bg-slate-950 border border-slate-800 p-3 text-xs font-mono text-slate-300 overflow-y-auto whitespace-pre-wrap">
                  {errorMsg ? (
                    <span className="text-rose-400 flex items-center gap-1.5">
                      <ShieldAlert className="w-4 h-4 shrink-0" />
                      <span>{errorMsg}</span>
                    </span>
                  ) : testOutput ? (
                    testOutput
                  ) : (
                    <span className="text-slate-600 italic">
                      Click "Execute Prompt" to run this prompt with Gemini and inspect the response.
                    </span>
                  )}
                </div>
              </div>
            </div>
          </div>
        </div>

        {/* Footer */}
        <div className="px-6 py-3 border-t border-slate-800 bg-slate-950/80 flex items-center justify-between text-xs text-slate-500">
          <span>Files saved in brain/personas/system_prompts/</span>
          <button
            onClick={onClose}
            className="px-4 py-1.5 rounded-lg bg-slate-800 hover:bg-slate-700 text-slate-200 font-medium transition-colors"
          >
            Close
          </button>
        </div>
      </div>
    </div>
  );
};
