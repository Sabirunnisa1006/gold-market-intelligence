/**
 * SAPCleanCorePage.tsx
 * Page 2 of ComX — wraps the full SAP Clean Core ABAP Suite application.
 * All original SAPCleanCore logic is preserved; this component hosts it inside
 * the ComX top-level page navigation.
 */

import React, { useState } from 'react';
import {
  Cpu,
  Layers,
  Send,
  RefreshCw,
  FileText,
  Undo,
  Sparkles,
  Compass,
  Building2,
  Workflow,
  FileCode,
  Info,
  X,
  Code2,
  Server,
  Layout,
  Zap,
  Database,
  Shield,
  GitBranch,
  Package,
  Search
} from 'lucide-react';
// Note: Shield, GitBranch, Package, Zap, Server, X used in Install modal
import AbapReviewPanel from './AbapReviewPanel';
import { SpecificationInput } from './cleancore/SpecificationInput';
import { StandardDiscovery } from './cleancore/StandardDiscovery';
import { TechnicalSpecViewer } from './cleancore/TechnicalSpecViewer';
import { AbapCodeViewer } from './cleancore/AbapCodeViewer';
import { ExtensibilityGuide } from './cleancore/ExtensibilityGuide';
import { VisualArtifacts } from './cleancore/VisualArtifacts';

// ── Types (subset from SAPCleanCore types.ts) ────────────────────────────────
interface ChatMessage {
  id: string;
  role: 'user' | 'assistant';
  content: string;
  timestamp: string;
  isCodeImprovement?: boolean;
}

interface AnalysisResult {
  id: string;
  timestamp: string;
  businessArea: string;
  developmentObject: string;
  requirementTitle: string;
  manualRequirements: string;
  fileName?: string;
  module: string;
  sapTransactions: string[];
  impactedTables: string[];
  standardObjects: any[];
  techSpec: any;
  abapCode: any;
  extensibilityGuide?: any;
  odataRapGuide?: any;
  sandbox: any;
  visualDiagrams: {
    flowchartSvg: string;
    sequenceSvg: string;
    dataFlowSvg: string;
  };
  chatAssistantReply?: string;
}

// ─────────────────────────────────────────────────────────────────────────────

interface SAPCleanCorePageProps {
  onBack?: () => void;
}

export default function SAPCleanCorePage({ onBack }: SAPCleanCorePageProps = {}) {
  const [loading, setLoading] = useState<boolean>(false);
  const [improving, setImproving] = useState<boolean>(false);
  const [activeAnalysis, setActiveAnalysis] = useState<AnalysisResult | null>(null);
  // Top-level Page 2 mode: architect (generate from spec) | review (review existing code)
  const [pageMode, setPageMode] = useState<'architect' | 'review'>('architect');

  const [activeTab, setActiveTab] = useState<'architecture' | 'tsd' | 'abap' | 'extensibility'>('architecture');
  const [chatHistory, setChatHistory] = useState<ChatMessage[]>([]);
  const [chatInput, setChatInput] = useState<string>('');
  const [chatLoading, setChatLoading] = useState<boolean>(false);
  const [showTechInfo, setShowTechInfo] = useState<boolean>(false);
  const [showInstall, setShowInstall] = useState<boolean>(false);

  // ── Analyze handler ──────────────────────────────────────────────────────
  const handleAnalyze = async (inputs: {
    businessArea: any;
    developmentObject: any;
    manualRequirements: string;
    fileName?: string;
    fileContent?: string;
  }) => {
    setLoading(true);
    try {
      const response = await fetch('/api/analyze', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(inputs),
      });
      const data = await response.json();
      if (response.ok) {
        setActiveAnalysis(data);
        setActiveTab('architecture');
        setChatHistory([{
          id: 'init',
          role: 'assistant',
          content: `Hello! I have completed the Solution Architecture design for: **"${data.requirementTitle || 'SAP Custom Requirement'}"**.\n\nI have mapped suitable S/4HANA objects, designed a Clean Core TSD, written ABAP 7.4+ source code, and prepared unit tests. How can I help refine this design?`,
          timestamp: new Date().toLocaleTimeString(),
        }]);
      } else {
        alert(data.error || 'Failed to complete analysis.');
      }
    } catch (err: any) {
      alert('Network error connecting to S/4HANA Architect AI.');
    } finally {
      setLoading(false);
    }
  };

  // ── Chat handler ─────────────────────────────────────────────────────────
  const handleSendChatMessage = async (e?: React.FormEvent) => {
    if (e) e.preventDefault();
    if (!chatInput.trim() || !activeAnalysis) return;

    const userMsg: ChatMessage = {
      id: `user-${Date.now()}`,
      role: 'user',
      content: chatInput,
      timestamp: new Date().toLocaleTimeString(),
    };

    setChatHistory(prev => [...prev, userMsg]);
    setChatInput('');
    setChatLoading(true);

    try {
      const response = await fetch('/api/chat', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          currentAnalysis: activeAnalysis,
          chatHistory: chatHistory.concat(userMsg),
          userMessage: userMsg.content,
        }),
      });
      const data = await response.json();
      if (response.ok) {
        setActiveAnalysis(data);
        setChatHistory(prev => [...prev, {
          id: `asst-${Date.now()}`,
          role: 'assistant',
          content: data.chatAssistantReply || `Updated all technical specifications for: "${userMsg.content}". Check the tabs.`,
          timestamp: new Date().toLocaleTimeString(),
        }]);
      } else {
        alert(data.error || 'Chat processing failed.');
      }
    } catch (err: any) {
      alert('Error updating artifacts via chat.');
    } finally {
      setChatLoading(false);
    }
  };

  // ── Improve code handler ─────────────────────────────────────────────────
  const handleImproveCode = async (improvementType: string) => {
    if (!activeAnalysis) return;
    setImproving(true);
    try {
      const response = await fetch('/api/improve', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          currentCode: activeAnalysis.abapCode.code,
          currentAnalysis: activeAnalysis,
          improvementType,
        }),
      });
      const data = await response.json();
      if (response.ok) {
        setActiveAnalysis(prev => {
          if (!prev) return null;
          return {
            ...prev,
            abapCode: {
              code: data.improvedCode,
              originalCode: prev.abapCode.originalCode || prev.abapCode.code,
              cleanCoreScore: data.cleanCoreScore,
              atcComplianceChecklist: data.atcComplianceChecklist,
              s4HanaReadinessNotes: data.s4HanaReadinessNotes,
              improvementsApplied: [...(prev.abapCode.improvementsApplied || []), improvementType],
              reviewFeedback: data.reviewFeedback,
            },
          };
        });
        setChatHistory(prev => [...prev, {
          id: `imp-${Date.now()}`,
          role: 'assistant',
          content: `✅ **Applied: "${improvementType}"** — Clean Core Score boosted to **${data.cleanCoreScore}%**. View the diff in the ABAP Code tab.`,
          timestamp: new Date().toLocaleTimeString(),
          isCodeImprovement: true,
        }]);
        setActiveTab('abap');
      }
    } catch (err) {
      alert('Error improving ABAP source code.');
    } finally {
      setImproving(false);
    }
  };

  const resetProject = () => {
    if (window.confirm('Start a new solution architecture specification?')) {
      setActiveAnalysis(null);
      setChatHistory([]);
    }
  };

  // ── Render ────────────────────────────────────────────────────────────────
  return (
    <div className="min-h-screen bg-[#F4F7F9] text-[#32363A] flex flex-col font-sans">

      {/* ComX Top-Level Page Switcher Nav */}
      <div className="bg-slate-900 text-white px-6 py-2 flex items-center gap-4 text-xs font-semibold sticky top-0 z-[60]">
        <span className="text-indigo-400 font-bold tracking-wider mr-2">ComX</span>
        {onBack && (
          <button
            onClick={onBack}
            className="px-3 py-1 rounded transition-colors text-slate-300 hover:text-white"
          >
            📦 Commodity Intelligence
          </button>
        )}
        <button className="px-3 py-1 rounded bg-blue-600 text-white cursor-default">
          🔷 SAP Clean Core Suite
        </button>
        <span className="ml-auto text-slate-500 text-[10px]">v2026.7</span>
      </div>

      {/* SAP Header */}
      <header className="h-12 bg-[#0040B0] text-white flex items-center justify-between px-6 shadow-md shrink-0">
        <div className="flex items-center space-x-4">
          <div className="flex items-center gap-2.5">
            <Cpu className="w-5 h-5 text-white animate-pulse" />
            <div className="font-bold text-sm tracking-tight">
              SAP <span className="font-light text-blue-100">Clean Core ABAP Suite</span>
            </div>
          </div>
          <div className="h-4 w-px bg-blue-400 hidden sm:block" />
          <div className="text-[10px] text-blue-100 uppercase tracking-widest font-medium hidden sm:block">
            S/4HANA Extensibility Architect
          </div>
        </div>
        <div className="flex items-center space-x-3 text-xs">
          <div className="flex items-center space-x-2">
            <span className="h-2 w-2 bg-green-400 rounded-full animate-pulse" />
            <span className="text-[11px]">Connected: BTP-ABAP-ENV</span>
          </div>
          <div className="bg-white/10 px-3 py-1 rounded-md border border-white/20 text-[11px] font-mono">System: P21/100</div>
        </div>
      </header>

      {/* ── Page 2 mode switcher bar (below SAP header) ──────────────── */}
      <div className="bg-[#F4F7F9] border-b border-[#D1D9E0] px-6 flex items-center gap-1 shrink-0">
        <button
          onClick={() => setPageMode('architect')}
          className={`flex items-center gap-2 px-4 py-2.5 text-xs font-bold border-b-2 transition cursor-pointer ${
            pageMode === 'architect'
              ? 'border-[#0040B0] text-[#0040B0] bg-white'
              : 'border-transparent text-[#6A6D70] hover:text-[#32363A] hover:bg-white/60'
          }`}
        >
          <Compass className="w-3.5 h-3.5" />
          Architect — Generate from Spec
        </button>
        <button
          onClick={() => setPageMode('review')}
          className={`flex items-center gap-2 px-4 py-2.5 text-xs font-bold border-b-2 transition cursor-pointer ${
            pageMode === 'review'
              ? 'border-[#0040B0] text-[#0040B0] bg-white'
              : 'border-transparent text-[#6A6D70] hover:text-[#32363A] hover:bg-white/60'
          }`}
        >
          <Search className="w-3.5 h-3.5" />
          Review &amp; Optimize Existing Code
        </button>
      </div>

      {/* ── Tech Stack Modal ─────────────────────────────────────────── */}
      {showTechInfo && (
        <div className="fixed inset-0 z-[100] bg-black/60 backdrop-blur-sm flex items-center justify-center p-4" onClick={() => setShowTechInfo(false)}>
          <div className="bg-white rounded-2xl shadow-2xl w-full max-w-3xl max-h-[90vh] overflow-y-auto" onClick={e => e.stopPropagation()}>

            {/* Modal Header */}
            <div className="sticky top-0 bg-[#0040B0] px-6 py-4 flex items-center justify-between rounded-t-2xl">
              <div className="flex items-center gap-3">
                <Code2 className="w-5 h-5 text-blue-200" />
                <div>
                  <h2 className="text-white font-bold text-base">Tech Stack — Page 2</h2>
                  <p className="text-blue-200 text-[11px]">SAP Clean Core ABAP Suite — Full Software Reference</p>
                </div>
              </div>
              <button onClick={() => setShowTechInfo(false)} className="text-white/70 hover:text-white transition cursor-pointer">
                <X className="w-5 h-5" />
              </button>
            </div>

            <div className="p-6 space-y-6">

              {/* Frontend */}
              <section>
                <div className="flex items-center gap-2 mb-3">
                  <Layout className="w-4 h-4 text-[#0040B0]" />
                  <h3 className="text-sm font-bold text-[#32363A] uppercase tracking-wider">Frontend</h3>
                </div>
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                  {[
                    { name: 'React 19', version: 'v19.0.1', desc: 'UI component framework — hooks, state, JSX rendering', color: '#61DAFB', bg: '#e0f7fe' },
                    { name: 'TypeScript', version: '~5.8.2', desc: 'Strongly-typed JavaScript — interfaces, enums, generics', color: '#3178C6', bg: '#e8f0fb' },
                    { name: 'Vite', version: 'v6.2.3', desc: 'Lightning-fast dev server & production bundler (ESM)', color: '#646CFF', bg: '#eeeefd' },
                    { name: 'Tailwind CSS', version: 'v4.1.14', desc: 'Utility-first CSS framework — all layout & styling', color: '#06B6D4', bg: '#e0f9fb' },
                    { name: 'Lucide React', version: 'v0.546.0', desc: 'SVG icon library — all icons across the UI', color: '#F97316', bg: '#fff3e8' },
                    { name: 'Motion', version: 'v12.23.24', desc: 'Animation library for smooth UI transitions', color: '#EC4899', bg: '#fce8f3' },
                  ].map(item => (
                    <div key={item.name} className="flex items-start gap-3 p-3 rounded-lg border border-[#E5E7EB] bg-[#FAFAFB]">
                      <div className="w-8 h-8 rounded-md flex items-center justify-center text-xs font-black shrink-0" style={{ background: item.bg, color: item.color }}>{item.name[0]}</div>
                      <div>
                        <div className="flex items-center gap-2">
                          <span className="text-xs font-bold text-[#32363A]">{item.name}</span>
                          <span className="text-[10px] font-mono text-[#6A6D70] bg-[#F0F0F0] px-1.5 py-0.5 rounded">{item.version}</span>
                        </div>
                        <p className="text-[11px] text-[#6A6D70] mt-0.5">{item.desc}</p>
                      </div>
                    </div>
                  ))}
                </div>
              </section>

              <hr className="border-[#E5E7EB]" />

              {/* Backend */}
              <section>
                <div className="flex items-center gap-2 mb-3">
                  <Server className="w-4 h-4 text-[#0040B0]" />
                  <h3 className="text-sm font-bold text-[#32363A] uppercase tracking-wider">Backend</h3>
                </div>
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                  {[
                    { name: 'Node.js', version: 'v24+', desc: 'JavaScript runtime — executes server.ts', color: '#3C873A', bg: '#e8f5e9' },
                    { name: 'Express', version: 'v4.21.2', desc: 'HTTP server framework — REST API routing', color: '#333333', bg: '#F0F0F0' },
                    { name: 'tsx', version: 'v4.21.0', desc: 'TypeScript executor — runs server.ts directly', color: '#3178C6', bg: '#e8f0fb' },
                    { name: 'dotenv', version: 'v17.2.3', desc: 'Loads .env.local — GEMINI_API_KEY and config', color: '#ECD53F', bg: '#fffde7' },
                    { name: 'ExcelJS', version: 'v4.4.0', desc: 'Reads/writes Excel workbooks for industry data', color: '#1D6F42', bg: '#e8f5e9' },
                    { name: 'esbuild', version: 'v0.25.0', desc: 'Production build bundler for server.ts → .cjs', color: '#FFCF00', bg: '#fffde7' },
                  ].map(item => (
                    <div key={item.name} className="flex items-start gap-3 p-3 rounded-lg border border-[#E5E7EB] bg-[#FAFAFB]">
                      <div className="w-8 h-8 rounded-md flex items-center justify-center text-xs font-black shrink-0" style={{ background: item.bg, color: item.color }}>{item.name[0]}</div>
                      <div>
                        <div className="flex items-center gap-2">
                          <span className="text-xs font-bold text-[#32363A]">{item.name}</span>
                          <span className="text-[10px] font-mono text-[#6A6D70] bg-[#F0F0F0] px-1.5 py-0.5 rounded">{item.version}</span>
                        </div>
                        <p className="text-[11px] text-[#6A6D70] mt-0.5">{item.desc}</p>
                      </div>
                    </div>
                  ))}
                </div>
              </section>

              <hr className="border-[#E5E7EB]" />

              {/* AI / APIs */}
              <section>
                <div className="flex items-center gap-2 mb-3">
                  <Zap className="w-4 h-4 text-[#0040B0]" />
                  <h3 className="text-sm font-bold text-[#32363A] uppercase tracking-wider">AI & APIs</h3>
                </div>
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                  {[
                    { name: 'Google Gemini', version: '3.5-flash', desc: 'Primary AI model — generates ABAP code, TSD, architecture blueprints, chat refinements', color: '#4285F4', bg: '#e8f0fb' },
                    { name: 'Gemini Fallback', version: '2.0-flash', desc: 'Fallback model when primary is unavailable or rate-limited', color: '#34A853', bg: '#e8f5e9' },
                    { name: '@google/genai', version: 'v2.4.0', desc: 'Official Google Generative AI SDK — API calls to Gemini', color: '#EA4335', bg: '#fce8e6' },
                    { name: 'IBM WatsonX', version: 'granite-3-8b', desc: 'Tier-1 AI provider (when API key configured) — BOM mapping', color: '#1F70C1', bg: '#e8f0fb' },
                  ].map(item => (
                    <div key={item.name} className="flex items-start gap-3 p-3 rounded-lg border border-[#E5E7EB] bg-[#FAFAFB]">
                      <div className="w-8 h-8 rounded-md flex items-center justify-center text-xs font-black shrink-0" style={{ background: item.bg, color: item.color }}>{item.name[0]}</div>
                      <div>
                        <div className="flex items-center gap-2">
                          <span className="text-xs font-bold text-[#32363A]">{item.name}</span>
                          <span className="text-[10px] font-mono text-[#6A6D70] bg-[#F0F0F0] px-1.5 py-0.5 rounded">{item.version}</span>
                        </div>
                        <p className="text-[11px] text-[#6A6D70] mt-0.5">{item.desc}</p>
                      </div>
                    </div>
                  ))}
                </div>
              </section>

              <hr className="border-[#E5E7EB]" />

              {/* SAP Platform */}
              <section>
                <div className="flex items-center gap-2 mb-3">
                  <Database className="w-4 h-4 text-[#0040B0]" />
                  <h3 className="text-sm font-bold text-[#32363A] uppercase tracking-wider">SAP Platform & Standards</h3>
                </div>
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                  {[
                    { name: 'SAP S/4HANA', version: '2023+', desc: 'Target ERP platform — Clean Core architecture and released APIs', color: '#0040B0', bg: '#e8f0fb' },
                    { name: 'SAP BTP ABAP', version: 'Cloud', desc: 'ABAP Environment on BTP — upgrade-safe extensibility', color: '#0070F2', bg: '#e0f0ff' },
                    { name: 'RAP Framework', version: 'ABAP 7.4+', desc: 'RESTful ABAP Programming Model — Business Objects, OData V4', color: '#009245', bg: '#e8f5e9' },
                    { name: 'CDS Views', version: 'Core Data Svc', desc: 'Released I_* CDS views — standard SAP data access layer', color: '#F0AB00', bg: '#fffde7' },
                    { name: 'ABAP OData V4', version: 'OData 4.0', desc: 'Service Binding — Fiori UI consumption via OData V4 protocol', color: '#E8000D', bg: '#fce8e6' },
                    { name: 'ATC / Clean Core', version: 'Tier 1/2', desc: 'ABAP Test Cockpit compliance — upgrade-safe governance scoring', color: '#6E6E6E', bg: '#F0F0F0' },
                  ].map(item => (
                    <div key={item.name} className="flex items-start gap-3 p-3 rounded-lg border border-[#E5E7EB] bg-[#FAFAFB]">
                      <div className="w-8 h-8 rounded-md flex items-center justify-center text-xs font-black shrink-0" style={{ background: item.bg, color: item.color }}>{item.name[0]}</div>
                      <div>
                        <div className="flex items-center gap-2">
                          <span className="text-xs font-bold text-[#32363A]">{item.name}</span>
                          <span className="text-[10px] font-mono text-[#6A6D70] bg-[#F0F0F0] px-1.5 py-0.5 rounded">{item.version}</span>
                        </div>
                        <p className="text-[11px] text-[#6A6D70] mt-0.5">{item.desc}</p>
                      </div>
                    </div>
                  ))}
                </div>
              </section>

              <hr className="border-[#E5E7EB]" />

              {/* DevOps & Tooling */}
              <section>
                <div className="flex items-center gap-2 mb-3">
                  <GitBranch className="w-4 h-4 text-[#0040B0]" />
                  <h3 className="text-sm font-bold text-[#32363A] uppercase tracking-wider">DevOps & Tooling</h3>
                </div>
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                  {[
                    { name: 'Git', version: 'v2+', desc: 'Version control — source history, branching, push to GitHub', color: '#F05032', bg: '#fce8e6' },
                    { name: 'GitHub', version: 'Sabirunnisa10', desc: 'Remote repository — github.com/Sabirunnisa10/ComX', color: '#24292F', bg: '#F0F0F0' },
                    { name: 'npm', version: 'v11+', desc: 'Package manager — installs all 264 dependencies', color: '#CB3837', bg: '#fce8e6' },
                    { name: 'Windows Batch', version: 'start-comx.bat', desc: 'One-click launcher — auto npm install, opens browser', color: '#0078D4', bg: '#e0f0ff' },
                  ].map(item => (
                    <div key={item.name} className="flex items-start gap-3 p-3 rounded-lg border border-[#E5E7EB] bg-[#FAFAFB]">
                      <div className="w-8 h-8 rounded-md flex items-center justify-center text-xs font-black shrink-0" style={{ background: item.bg, color: item.color }}>{item.name[0]}</div>
                      <div>
                        <div className="flex items-center gap-2">
                          <span className="text-xs font-bold text-[#32363A]">{item.name}</span>
                          <span className="text-[10px] font-mono text-[#6A6D70] bg-[#F0F0F0] px-1.5 py-0.5 rounded">{item.version}</span>
                        </div>
                        <p className="text-[11px] text-[#6A6D70] mt-0.5">{item.desc}</p>
                      </div>
                    </div>
                  ))}
                </div>
              </section>

              <hr className="border-[#E5E7EB]" />

              {/* Architecture summary */}
              <section>
                <div className="flex items-center gap-2 mb-3">
                  <Package className="w-4 h-4 text-[#0040B0]" />
                  <h3 className="text-sm font-bold text-[#32363A] uppercase tracking-wider">Architecture Summary</h3>
                </div>
                <div className="bg-[#0040B0] text-white rounded-xl p-4 space-y-2 text-[11px] font-mono">
                  <div className="flex justify-between border-b border-white/20 pb-2"><span className="text-blue-200">App Name</span><span>ComX v2</span></div>
                  <div className="flex justify-between border-b border-white/20 pb-2"><span className="text-blue-200">Server</span><span>Express + Vite (SPA middleware)</span></div>
                  <div className="flex justify-between border-b border-white/20 pb-2"><span className="text-blue-200">Port</span><span>http://localhost:3000</span></div>
                  <div className="flex justify-between border-b border-white/20 pb-2"><span className="text-blue-200">Frontend Build</span><span>Vite 6 → React 19 SPA</span></div>
                  <div className="flex justify-between border-b border-white/20 pb-2"><span className="text-blue-200">API Routes</span><span>/api/analyze · /api/chat · /api/improve · /api/simulate</span></div>
                  <div className="flex justify-between border-b border-white/20 pb-2"><span className="text-blue-200">AI Pipeline</span><span>Gemini 3.5-flash → 2.0-flash fallback → Offline</span></div>
                  <div className="flex justify-between border-b border-white/20 pb-2"><span className="text-blue-200">Language</span><span>TypeScript (strict, ESNext, JSX)</span></div>
                  <div className="flex justify-between border-b border-white/20 pb-2"><span className="text-blue-200">Total Packages</span><span>264 npm packages</span></div>
                  <div className="flex justify-between"><span className="text-blue-200">Source Lines</span><span>~3,900 lines (server.ts) + ~400 (SAPCleanCorePage)</span></div>
                </div>
              </section>

              {/* Close button */}
              <div className="flex justify-center pt-2">
                <button
                  onClick={() => setShowTechInfo(false)}
                  className="px-8 py-2.5 bg-[#0040B0] hover:bg-[#0053CC] text-white text-xs font-bold rounded-lg transition cursor-pointer"
                >
                  Close
                </button>
              </div>

            </div>
          </div>
        </div>
      )}

      {/* Main Layout */}
      <div className="flex-1 flex flex-col lg:flex-row overflow-hidden">
        <main className="flex-1 overflow-y-auto p-6 space-y-6">

          {/* ── Review mode ─────────────────────────────────────────── */}
          {pageMode === 'review' && <AbapReviewPanel />}

          {/* ── Architect mode ──────────────────────────────────────── */}
          {pageMode === 'architect' && !activeAnalysis ? (
            <div className="max-w-4xl mx-auto space-y-6">
              {/* Intro card */}
              <div className="bg-white border border-[#D1D9E0] rounded-xl p-6 flex flex-col md:flex-row gap-6 items-center shadow-sm">
                <div className="space-y-3 flex-1">
                  <h2 className="text-2xl font-bold tracking-tight text-[#32363A]">
                    S/4HANA Clean Core Technical Governance
                  </h2>
                  <p className="text-[#6A6D70] text-xs leading-relaxed">
                    Upload your Functional Specification or type business criteria. The engine recommends
                    upgrade-safe released BAdIs / CDS Views, generates comprehensive Technical Specs,
                    and outputs production ABAP 7.4+ source classes — all clean core compliant.
                  </p>
                  <div className="flex flex-wrap gap-2 pt-1.5">
                    {['No core modifications', 'Released OData V4 Services', 'ATC Checked Source Classes'].map(tag => (
                      <span key={tag} className="bg-[#FAFAFB] border border-[#D1D9E0] text-[#515457] text-[10px] px-2.5 py-1 rounded font-medium">
                        ✓ {tag}
                      </span>
                    ))}
                  </div>
                </div>
                <div className="grid grid-cols-2 gap-3 w-full md:w-auto flex-shrink-0">
                  <div className="bg-[#FAFAFB] p-4 border border-[#D1D9E0] rounded-lg text-center shadow-sm">
                    <Building2 className="w-5 h-5 text-[#0040B0] mx-auto mb-1" />
                    <span className="text-lg font-bold font-mono block text-[#32363A]">15+</span>
                    <span className="text-[9px] text-[#6A6D70] uppercase tracking-wider block font-semibold">SAP Areas</span>
                  </div>
                  <div className="bg-[#FAFAFB] p-4 border border-[#D1D9E0] rounded-lg text-center shadow-sm">
                    <Workflow className="w-5 h-5 text-[#0070F2] mx-auto mb-1" />
                    <span className="text-lg font-bold font-mono block text-[#32363A]">100%</span>
                    <span className="text-[9px] text-[#6A6D70] uppercase tracking-wider block font-semibold">Upgrade-Safe</span>
                  </div>
                </div>
              </div>
              <SpecificationInput onAnalyze={handleAnalyze} loading={loading} />
            </div>
          ) : pageMode === 'architect' ? (
            <div className="space-y-6">
              {/* Active project bar */}
              <div className="bg-white border border-[#D1D9E0] rounded-xl p-4 flex flex-col md:flex-row justify-between items-start md:items-center gap-4 shadow-sm">
                <div className="flex items-center gap-3">
                  <div className="p-2.5 bg-[#FAFAFB] border border-[#D1D9E0] rounded-lg">
                    <Compass className="w-5 h-5 text-[#0040B0]" />
                  </div>
                  <div>
                    <span className="text-[9px] text-[#6A6D70] uppercase tracking-wider font-bold font-mono">ACTIVE S/4HANA OBJECT DESIGN</span>
                    <h2 className="text-base font-bold text-[#32363A] mt-0.5">{activeAnalysis.requirementTitle}</h2>
                  </div>
                </div>
                <div className="flex items-center gap-3 self-end md:self-auto">
                  <span className="text-xs bg-[#FAFAFB] border border-[#D1D9E0] text-[#32363A] rounded-lg px-3 py-1.5 font-medium">
                    Object: <strong className="text-[#0040B0] font-mono text-[11px] uppercase">{activeAnalysis.developmentObject}</strong>
                  </span>
                  <button
                    onClick={resetProject}
                    className="text-xs bg-white hover:bg-[#FAFAFB] hover:text-rose-600 text-[#32363A] font-semibold px-3 py-1.5 rounded-lg border border-[#D1D9E0] shadow-sm transition flex items-center gap-1 cursor-pointer"
                  >
                    <Undo className="w-3.5 h-3.5" /> New Design
                  </button>
                </div>
              </div>

              {/* KPI row */}
              <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                <div className="bg-white border border-[#D1D9E0] p-4 rounded-xl shadow-sm">
                  <div className="text-[10px] uppercase text-[#6A6D70] font-bold tracking-wider mb-1">Clean Core Score</div>
                  <div className="text-xl font-bold text-[#009245]">{activeAnalysis.abapCode?.cleanCoreScore || 95}%</div>
                </div>
                <div className="bg-white border border-[#D1D9E0] p-4 rounded-xl shadow-sm">
                  <div className="text-[10px] uppercase text-[#6A6D70] font-bold tracking-wider mb-1">Governance Tier</div>
                  <div className="text-xl font-bold text-[#0040B0]">
                    {['BADI','RAP_BO','CDS_VIEW'].includes(activeAnalysis.developmentObject) ? 'Tier 1' : 'Tier 2'}
                  </div>
                </div>
                <div className="bg-white border border-[#D1D9E0] p-4 rounded-xl shadow-sm">
                  <div className="text-[10px] uppercase text-[#6A6D70] font-bold tracking-wider mb-1">Standard APIs</div>
                  <div className="text-xl font-bold text-[#32363A]">{activeAnalysis.standardObjects?.length || 0}</div>
                </div>
                <div className="bg-white border border-[#D1D9E0] p-4 rounded-xl shadow-sm">
                  <div className="text-[10px] uppercase text-[#6A6D70] font-bold tracking-wider mb-1">Risk Rating</div>
                  <div className="text-xl font-bold text-emerald-600 flex items-center gap-1.5">
                    <span className="h-2 w-2 rounded-full bg-emerald-500 inline-block animate-pulse" />LOW
                  </div>
                </div>
              </div>

              {/* Tabs */}
              <div className="flex gap-2 overflow-x-auto bg-[#FAFAFB] p-1.5 rounded-xl border border-[#D1D9E0] shadow-inner">
                {([
                  { key: 'architecture', icon: <Compass className="w-4 h-4" />, label: '1. Architecture Blueprint' },
                  { key: 'tsd',          icon: <FileText className="w-4 h-4" />, label: '2. Technical Specs (TSD)' },
                  { key: 'abap',         icon: <FileCode className="w-4 h-4" />, label: '3. Modern ABAP Code' },
                  ...(activeAnalysis.extensibilityGuide || activeAnalysis.odataRapGuide
                    ? [{ key: 'extensibility', icon: <Layers className="w-4 h-4" />, label: '4. Extensibility & RAP' }]
                    : []),
                ] as { key: string; icon: React.ReactNode; label: string }[]).map(tab => (
                  <button
                    key={tab.key}
                    onClick={() => setActiveTab(tab.key as any)}
                    className={`py-2 px-4 text-xs font-bold whitespace-nowrap border-b-2 transition cursor-pointer flex items-center gap-2 ${
                      activeTab === tab.key
                        ? 'border-[#0040B0] text-[#0040B0] bg-white rounded-lg shadow-sm'
                        : 'border-transparent text-[#6A6D70] hover:text-[#32363A] hover:bg-[#F4F7F9] rounded-md'
                    }`}
                  >
                    {tab.icon}{tab.label}
                  </button>
                ))}
              </div>

              {/* Tab content */}
              <div>
                {activeTab === 'architecture' && (
                  <>
                    <StandardDiscovery standardObjects={activeAnalysis.standardObjects} moduleName={activeAnalysis.module} />
                    <VisualArtifacts diagrams={activeAnalysis.visualDiagrams} />
                  </>
                )}
                {activeTab === 'tsd' && <TechnicalSpecViewer techSpec={activeAnalysis.techSpec} />}
                {activeTab === 'abap' && (
                  <AbapCodeViewer abapCode={activeAnalysis.abapCode} onImproveCode={handleImproveCode} improving={improving} />
                )}
                {activeTab === 'extensibility' && (
                  <ExtensibilityGuide extensibilityGuide={activeAnalysis.extensibilityGuide} odataRapGuide={activeAnalysis.odataRapGuide} />
                )}
              </div>

              {/* Chat Co-Pilot */}
              {chatHistory.length > 0 && (
                <div className="bg-white border border-[#D1D9E0] rounded-xl shadow-sm overflow-hidden">
                  <div className="bg-[#0040B0] px-5 py-3 flex items-center gap-2">
                    <Sparkles className="w-4 h-4 text-blue-200" />
                    <span className="text-sm font-bold text-white">SAP Architect AI Co-Pilot</span>
                  </div>
                  <div className="p-4 space-y-3 max-h-64 overflow-y-auto">
                    {chatHistory.map(msg => (
                      <div key={msg.id} className={`flex ${msg.role === 'user' ? 'justify-end' : 'justify-start'}`}>
                        <div className={`max-w-[80%] text-xs px-3 py-2 rounded-lg whitespace-pre-wrap ${
                          msg.role === 'user'
                            ? 'bg-[#0040B0] text-white rounded-br-none'
                            : 'bg-[#FAFAFB] border border-[#D1D9E0] text-[#32363A] rounded-bl-none'
                        }`}>
                          {msg.content}
                        </div>
                      </div>
                    ))}
                    {chatLoading && (
                      <div className="flex justify-start">
                        <div className="bg-[#FAFAFB] border border-[#D1D9E0] text-[#6A6D70] text-xs px-3 py-2 rounded-lg flex items-center gap-2">
                          <RefreshCw className="w-3 h-3 animate-spin" /> Analyzing...
                        </div>
                      </div>
                    )}
                  </div>
                  <form onSubmit={handleSendChatMessage} className="flex border-t border-[#D1D9E0]">
                    <input
                      value={chatInput}
                      onChange={e => setChatInput(e.target.value)}
                      placeholder="Ask to refine code, add validations, convert to RAP..."
                      className="flex-1 px-4 py-3 text-xs bg-white outline-none text-[#32363A] placeholder-[#6A6D70]"
                      disabled={chatLoading}
                    />
                    <button
                      type="submit"
                      disabled={chatLoading || !chatInput.trim()}
                      className="px-4 py-3 bg-[#0040B0] hover:bg-[#0053CC] text-white text-xs font-bold flex items-center gap-1.5 transition cursor-pointer disabled:opacity-50"
                    >
                      <Send className="w-3.5 h-3.5" /> Send
                    </button>
                  </form>
                </div>
              )}
            </div>
          ) : null}
        </main>
      </div>

      {/* Footer with Install Button */}
      <footer className="border-t border-[#D1D9E0] bg-white px-6 py-6 text-center text-xs text-[#6A6D70]">
        <p>© 2026 ComX v2 — SAP Clean Core ABAP Suite. All rights reserved.</p>
        <p className="mt-1">S/4HANA Extensibility Architect · Upgrade-Safe · ATC Compliant</p>
        <div className="mt-4 inline-flex items-center gap-3">
          <button
            onClick={() => setShowInstall(true)}
            className="inline-flex items-center gap-2 px-5 py-2 bg-[#0040B0] hover:bg-[#0053CC] text-white text-xs font-bold rounded-lg transition cursor-pointer shadow-sm"
          >
            <Package className="w-3.5 h-3.5" />
            How to Install &amp; Run This App
          </button>
          <button
            onClick={() => setShowTechInfo(true)}
            className="inline-flex items-center gap-2 px-5 py-2 bg-white hover:bg-blue-50 text-[#0040B0] text-xs font-bold rounded-lg border border-[#D1D9E0] transition cursor-pointer shadow-sm"
          >
            <Info className="w-3.5 h-3.5" />
            Tech Stack
          </button>
        </div>
      </footer>

      {/* ── Install Guide Modal ───────────────────────────────────── */}
      {showInstall && (
        <div className="fixed inset-0 z-[100] bg-black/60 backdrop-blur-sm flex items-center justify-center p-4" onClick={() => setShowInstall(false)}>
          <div className="bg-white rounded-2xl shadow-2xl w-full max-w-2xl max-h-[90vh] overflow-y-auto" onClick={e => e.stopPropagation()}>

            {/* Header */}
            <div className="sticky top-0 bg-[#0040B0] px-6 py-4 flex items-center justify-between rounded-t-2xl">
              <div className="flex items-center gap-3">
                <Package className="w-5 h-5 text-blue-200" />
                <div>
                  <h2 className="text-white font-bold text-base">Installation Guide — ComX v2</h2>
                  <p className="text-blue-200 text-[11px]">Step-by-step setup from scratch to running app</p>
                </div>
              </div>
              <button onClick={() => setShowInstall(false)} className="text-white/70 hover:text-white transition cursor-pointer">
                <X className="w-5 h-5" />
              </button>
            </div>

            <div className="p-6 space-y-5">

              {/* Prerequisites */}
              <section>
                <div className="flex items-center gap-2 mb-3">
                  <Shield className="w-4 h-4 text-[#0040B0]" />
                  <h3 className="text-sm font-bold text-[#32363A] uppercase tracking-wider">Prerequisites</h3>
                </div>
                <div className="space-y-2">
                  {[
                    { label: 'Node.js v18+', note: 'Download from nodejs.org — includes npm automatically', url: 'https://nodejs.org' },
                    { label: 'Git', note: 'Download from git-scm.com for version control', url: 'https://git-scm.com' },
                    { label: 'Gemini API Key', note: 'Get a free key from aistudio.google.com/app/apikey', url: 'https://aistudio.google.com/app/apikey' },
                  ].map((item, i) => (
                    <div key={i} className="flex items-start gap-3 p-3 rounded-lg border border-[#D1D9E0] bg-[#FAFAFB]">
                      <div className="w-6 h-6 rounded-full bg-blue-100 text-[#0040B0] text-xs font-black flex items-center justify-center shrink-0 mt-0.5">{i + 1}</div>
                      <div>
                        <span className="text-xs font-bold text-[#32363A]">{item.label}</span>
                        <p className="text-[11px] text-[#6A6D70] mt-0.5">{item.note}</p>
                        <a href={item.url} target="_blank" rel="noreferrer" className="text-[10px] text-[#0040B0] font-mono hover:underline">{item.url}</a>
                      </div>
                    </div>
                  ))}
                </div>
              </section>

              <hr className="border-[#D1D9E0]" />

              {/* Steps */}
              <section>
                <div className="flex items-center gap-2 mb-3">
                  <GitBranch className="w-4 h-4 text-[#0040B0]" />
                  <h3 className="text-sm font-bold text-[#32363A] uppercase tracking-wider">Installation Steps</h3>
                </div>
                <ol className="space-y-3">
                  {[
                    { title: 'Clone the repository',           cmd: 'git clone https://github.com/Sabirunnisa10/ComX.git', note: 'Downloads all source files into a ComX folder' },
                    { title: 'Enter the project directory',    cmd: 'cd ComX',                                              note: 'All commands below must be run from inside this folder' },
                    { title: 'Install all dependencies',       cmd: 'npm install',                                          note: 'Installs 264 packages — takes ~30 seconds on first run' },
                    { title: 'Create the environment file',    cmd: 'copy .env.example .env.local',                         note: 'Windows: use copy. Mac/Linux: use cp .env.example .env.local' },
                    { title: 'Add your Gemini API key',        cmd: 'GEMINI_API_KEY=your_key_here',                         note: 'Open .env.local in any text editor and replace the placeholder' },
                    { title: 'Start the development server',   cmd: 'npm run dev',                                          note: 'Starts Express + Vite on http://localhost:3000' },
                    { title: 'Open the app in your browser',   cmd: 'http://localhost:3000',                                note: 'Page 1 = Commodity Intelligence · Page 2 = SAP Clean Core ABAP Suite' },
                  ].map((step, i) => (
                    <li key={i} className="flex items-start gap-3">
                      <div className="w-7 h-7 rounded-full bg-[#0040B0] text-white text-xs font-black flex items-center justify-center shrink-0 mt-0.5">{i + 1}</div>
                      <div className="flex-1">
                        <p className="text-xs font-bold text-[#32363A] mb-1">{step.title}</p>
                        <code className="block bg-slate-900 text-green-400 text-[11px] font-mono px-3 py-2 rounded-lg mb-1 select-all">{step.cmd}</code>
                        <p className="text-[11px] text-[#6A6D70]">{step.note}</p>
                      </div>
                    </li>
                  ))}
                </ol>
              </section>

              <hr className="border-[#D1D9E0]" />

              {/* One-click */}
              <section>
                <div className="flex items-center gap-2 mb-3">
                  <Zap className="w-4 h-4 text-[#0040B0]" />
                  <h3 className="text-sm font-bold text-[#32363A] uppercase tracking-wider">One-Click Launch (Windows)</h3>
                </div>
                <div className="bg-[#FAFAFB] border border-[#D1D9E0] rounded-lg p-4 space-y-2">
                  <p className="text-xs text-[#515457]">After setup, double-click the batch file in the ComX folder:</p>
                  <code className="block bg-slate-900 text-green-400 text-[11px] font-mono px-3 py-2 rounded-lg">start-comx.bat</code>
                  <p className="text-[11px] text-[#6A6D70]">Auto-checks node_modules, runs npm install if missing, starts the server, and opens the browser.</p>
                </div>
              </section>

              <hr className="border-[#D1D9E0]" />

              {/* Stop */}
              <section>
                <div className="flex items-center gap-2 mb-2">
                  <Server className="w-4 h-4 text-[#0040B0]" />
                  <h3 className="text-sm font-bold text-[#32363A] uppercase tracking-wider">Stopping the Server</h3>
                </div>
                <div className="bg-[#FAFAFB] border border-[#D1D9E0] rounded-lg p-3">
                  <p className="text-[11px] text-[#6A6D70]">In the terminal where the server is running, press:</p>
                  <code className="block bg-slate-900 text-yellow-400 text-[11px] font-mono px-3 py-2 rounded-lg mt-2">Ctrl + C</code>
                </div>
              </section>

              {/* Close */}
              <div className="flex justify-center pt-2">
                <button
                  onClick={() => setShowInstall(false)}
                  className="px-8 py-2.5 bg-[#0040B0] hover:bg-[#0053CC] text-white text-xs font-bold rounded-lg transition cursor-pointer"
                >
                  Close
                </button>
              </div>

            </div>
          </div>
        </div>
      )}

    </div>
  );
}
