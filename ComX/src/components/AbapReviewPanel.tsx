/**
 * AbapReviewPanel.tsx
 * Page 2 — ABAP Code Review & Optimization Engine
 * Upload or paste existing ABAP source code for comprehensive AI-powered analysis.
 */

import React, { useState, useRef, useCallback } from 'react';
import {
  Upload, FileCode, Clipboard, RefreshCw, Download, AlertTriangle,
  CheckCircle, XCircle, ShieldCheck, Zap, BarChart3, FileText,
  ChevronDown, ChevronRight, Copy, Check, ArrowLeftRight, X, Search,
  TrendingUp, Code2, BookOpen, Wrench, Info
} from 'lucide-react';

// ── Types ─────────────────────────────────────────────────────────────────────

interface AtcFinding {
  id: string;
  severity: 'error' | 'warning' | 'info' | 'performance';
  rule: string;
  location: string;
  description: string;
  recommendation: string;
  autoFixed: boolean;
}

interface ChangeEntry {
  category: 'performance' | 'syntax' | 'database' | 'cleancode' | 'cleancore' | 'security' | 'readability';
  original: string;
  optimized: string;
  explanation: string;
}

interface ReviewReport {
  title: string;
  qualityScore: number;
  performanceScore: number;
  maintainabilityScore: number;
  securityScore: number;
  cleanCoreScore: number;
  atcStatus: 'Compliant' | 'Warnings' | 'Errors';
  cleanCoreStatus: 'Compliant' | 'Partial' | 'Non-Compliant';
  estimatedSpeedImprovement: string;
  securityObservations: string[];
  summary: string;
}

interface ReviewResult {
  originalCode: string;
  optimizedCode: string;
  documentedCode: string;
  report: ReviewReport;
  changes: ChangeEntry[];
  atcFindings: AtcFinding[];
}

// ── Color maps ────────────────────────────────────────────────────────────────

const SEVERITY_STYLE: Record<string, string> = {
  error:       'bg-red-50 border-red-200 text-red-700',
  warning:     'bg-yellow-50 border-yellow-200 text-yellow-700',
  info:        'bg-blue-50 border-blue-200 text-blue-700',
  performance: 'bg-purple-50 border-purple-200 text-purple-700',
};
const SEVERITY_ICON: Record<string, React.ReactNode> = {
  error:       <XCircle className="w-3.5 h-3.5 flex-shrink-0" />,
  warning:     <AlertTriangle className="w-3.5 h-3.5 flex-shrink-0" />,
  info:        <Info className="w-3.5 h-3.5 flex-shrink-0" />,
  performance: <Zap className="w-3.5 h-3.5 flex-shrink-0" />,
};

const CHANGE_COLOR: Record<string, string> = {
  performance: 'bg-purple-50 border-purple-200',
  syntax:      'bg-blue-50 border-blue-200',
  database:    'bg-orange-50 border-orange-200',
  cleancode:   'bg-emerald-50 border-emerald-200',
  cleancore:   'bg-cyan-50 border-cyan-200',
  security:    'bg-red-50 border-red-200',
  readability: 'bg-slate-50 border-slate-200',
};
const CHANGE_BADGE: Record<string, string> = {
  performance: 'bg-purple-100 text-purple-700',
  syntax:      'bg-blue-100 text-blue-700',
  database:    'bg-orange-100 text-orange-700',
  cleancode:   'bg-emerald-100 text-emerald-700',
  cleancore:   'bg-cyan-100 text-cyan-700',
  security:    'bg-red-100 text-red-700',
  readability: 'bg-slate-200 text-slate-700',
};

// ── Score ring ────────────────────────────────────────────────────────────────

const ScoreRing: React.FC<{ score: number; label: string; color: string }> = ({ score, label, color }) => {
  const r = 22; const circ = 2 * Math.PI * r;
  const fill = circ * (1 - score / 100);
  return (
    <div className="flex flex-col items-center gap-1">
      <svg width="60" height="60" viewBox="0 0 60 60">
        <circle cx="30" cy="30" r={r} fill="none" stroke="#E5E7EB" strokeWidth="5" />
        <circle cx="30" cy="30" r={r} fill="none" stroke={color} strokeWidth="5"
          strokeDasharray={circ} strokeDashoffset={fill}
          strokeLinecap="round" transform="rotate(-90 30 30)" />
        <text x="30" y="34" textAnchor="middle" fontSize="11" fontWeight="700" fill="#32363A">{score}</text>
      </svg>
      <span className="text-[10px] text-[#6A6D70] font-semibold text-center leading-tight">{label}</span>
    </div>
  );
};

// ── Syntax-highlighted code block (reuses ABAP tokenizer colors) ──────────────

const ABAP_COLORS: Record<string, { color: string; bold?: boolean; italic?: boolean }> = {
  comment:   { color: '#5C6370', italic: true },
  string:    { color: '#98C379' },
  template:  { color: '#56B6C2' },
  number:    { color: '#D19A66' },
  hostvar:   { color: '#E5C07B' },
  fieldsym:  { color: '#61AFEF' },
  pragma:    { color: '#BE5046' },
  typename:  { color: '#E06C75', bold: true },
  keyword:   { color: '#C678DD', bold: true },
  operator:  { color: '#ABB2BF' },
  default:   { color: '#ABB2BF' },
};

const KW = new Set([
  'SELECT','FROM','INTO','WHERE','AND','OR','NOT','ON','INNER','OUTER','LEFT','RIGHT','JOIN',
  'GROUP','BY','HAVING','ORDER','ASCENDING','DESCENDING','UNION','DISTINCT','FOR','ALL',
  'ENTRIES','UP','ROWS','SINGLE','DATA','VALUE','NEW','REDUCE','FILTER','CORRESPONDING','BASE',
  'LOOP','AT','ASSIGNING','FIELD-SYMBOL','ENDLOOP','IF','ELSE','ELSEIF','ENDIF','CASE','WHEN',
  'ENDCASE','WHILE','ENDWHILE','DO','ENDDO','TRY','CATCH','FINALLY','ENDTRY','CLASS',
  'DEFINITION','IMPLEMENTATION','ENDCLASS','INTERFACE','ENDINTERFACE','PUBLIC','PROTECTED',
  'PRIVATE','FINAL','ABSTRACT','SECTION','METHODS','METHOD','ENDMETHOD','RAISING','EXCEPTIONS',
  'CREATE','OBJECT','CALL','FUNCTION','INCLUDE','REPORT','APPEND','INSERT','MODIFY','DELETE',
  'READ','WRITE','CLEAR','FREE','SORT','CHECK','EXIT','RETURN','CONTINUE','COMMIT','ROLLBACK',
  'PERFORM','RAISE','ASSIGN','CONCATENATE','SPLIT','TRANSLATE','CONDENSE',
]);
const TYPENAME = new Set(['TYPE','TYPES','LIKE','STRUCTURE','TABLE','OF','REF','TO','STANDARD',
  'SORTED','HASHED','STRING','INTEGER','BOOLEAN','ABAP_BOOL','I','F','P','C','N','X','D','T']);

function tokeniseLine(line: string): React.ReactNode[] {
  const trimmed = line.trimStart();
  if (trimmed.startsWith('*') || (trimmed.startsWith('"') && !trimmed.startsWith('"|'))) {
    return [<span key={0} style={{ color: ABAP_COLORS.comment.color, fontStyle: 'italic' }}>{line}</span>];
  }
  const nodes: React.ReactNode[] = [];
  let rest = line; let pos = 0;
  const rules: { type: string; re: RegExp }[] = [
    { type: 'string',   re: /('(?:[^'\\]|\\.)*'|`(?:[^`\\]|\\.)*`)/ },
    { type: 'template', re: /(\|[^|]*\|)/ },
    { type: 'number',   re: /\b(\d+(?:\.\d+)?)\b/ },
    { type: 'hostvar',  re: /(@\w+)/ },
    { type: 'fieldsym', re: /(<[\w-]+>)/ },
    { type: 'pragma',   re: /(##\w+)/ },
    { type: 'word',     re: /([A-Za-z_][\w-]*)/ },
    { type: 'operator', re: /([=<>!&+\-*/{}[\]().,;:])/ },
    { type: 'ws',       re: /(\s+)/ },
  ];
  while (rest.length > 0) {
    let matched = false;
    for (const rule of rules) {
      const m = rest.match(rule.re);
      if (m && m.index === 0) {
        const tok = m[0];
        let type = rule.type;
        if (type === 'word') {
          const up = tok.toUpperCase();
          type = KW.has(up) ? 'keyword' : TYPENAME.has(up) ? 'typename' : 'default';
        }
        const s = ABAP_COLORS[type] ?? ABAP_COLORS.default;
        nodes.push(<span key={pos} style={{ color: s.color, fontWeight: s.bold ? '700' : undefined, fontStyle: s.italic ? 'italic' : undefined }}>{tok}</span>);
        rest = rest.slice(tok.length); pos += tok.length; matched = true; break;
      }
    }
    if (!matched) { nodes.push(<span key={pos} style={{ color: ABAP_COLORS.default.color }}>{rest[0]}</span>); rest = rest.slice(1); pos++; }
  }
  return nodes;
}

const HighlightedCode: React.FC<{ code: string; maxH?: string }> = ({ code, maxH = '500px' }) => {
  const [copied, setCopied] = useState(false);
  const lines = (code || '').split('\n');
  return (
    <div className="relative rounded-xl overflow-hidden border border-[#3E4452]">
      <button onClick={() => { navigator.clipboard.writeText(code); setCopied(true); setTimeout(() => setCopied(false), 2000); }}
        className="absolute top-2 right-2 z-10 bg-[#2C313C] hover:bg-[#3E4452] text-[#ABB2BF] px-2.5 py-1 rounded text-[10px] flex items-center gap-1 transition cursor-pointer border border-[#3E4452]">
        {copied ? <><Check className="w-3 h-3 text-green-400" />Copied</> : <><Copy className="w-3 h-3" />Copy</>}
      </button>
      <div className="bg-[#1E222B] font-mono text-xs leading-relaxed overflow-x-auto overflow-y-auto p-4" style={{ maxHeight: maxH }}>
        {lines.map((line, i) => (
          <div key={i} className="hover:bg-[#2C313C] flex min-h-[1.4em] transition-colors duration-75">
            <span className="select-none text-right pr-4 shrink-0 font-sans" style={{ color: '#4B5263', fontSize: '10px', width: '2.6rem', lineHeight: '1.6', paddingTop: '1px' }}>{i + 1}</span>
            <span className="flex-1 whitespace-pre">{tokeniseLine(line)}</span>
          </div>
        ))}
      </div>
    </div>
  );
};

// ── Download helper ───────────────────────────────────────────────────────────

function downloadText(content: string, filename: string) {
  const blob = new Blob([content], { type: 'text/plain' });
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a'); a.href = url; a.download = filename; a.click();
  URL.revokeObjectURL(url);
}

function buildReport(result: ReviewResult): string {
  const r = result.report;
  return `SAP ABAP Code Review Report
Generated: ${new Date().toISOString()}
=====================================================

TITLE: ${r.title}

SCORES
------
Quality Score:         ${r.qualityScore}/100
Performance Score:     ${r.performanceScore}/100
Maintainability Score: ${r.maintainabilityScore}/100
Security Score:        ${r.securityScore}/100
Clean Core Score:      ${r.cleanCoreScore}/100
ATC Status:            ${r.atcStatus}
Clean Core Status:     ${r.cleanCoreStatus}
Est. Speed Improvement:${r.estimatedSpeedImprovement}

EXECUTIVE SUMMARY
-----------------
${r.summary}

SECURITY OBSERVATIONS
---------------------
${r.securityObservations.map((o, i) => `${i + 1}. ${o}`).join('\n')}

ATC FINDINGS (${result.atcFindings.length})
----------------
${result.atcFindings.map(f =>
  `[${f.severity.toUpperCase()}] ${f.rule}\n  Location: ${f.location}\n  Issue: ${f.description}\n  Fix: ${f.recommendation}\n  Auto-Fixed: ${f.autoFixed ? 'Yes' : 'No (manual action required)'}`
).join('\n\n')}

CHANGES APPLIED (${result.changes.length})
-----------------
${result.changes.map((c, i) =>
  `${i + 1}. [${c.category.toUpperCase()}]\n   Original: ${c.original}\n   Optimized: ${c.optimized}\n   Reason: ${c.explanation}`
).join('\n\n')}
`;
}

// ── Main component ────────────────────────────────────────────────────────────

const AbapReviewPanel: React.FC = () => {
  const [mode, setMode] = useState<'paste' | 'upload'>('paste');
  const [code, setCode] = useState<string>('');
  const [fileName, setFileName] = useState<string>('');
  const [loading, setLoading] = useState(false);
  const [result, setResult] = useState<ReviewResult | null>(null);
  const [activeTab, setActiveTab] = useState<'report' | 'optimized' | 'documented' | 'changes' | 'atc' | 'diff'>('report');
  const [error, setError] = useState<string>('');
  const [expandedFindings, setExpandedFindings] = useState<Set<string>>(new Set());
  const fileRef = useRef<HTMLInputElement>(null);

  const handleFile = useCallback((file: File) => {
    setFileName(file.name);
    const reader = new FileReader();
    reader.onload = e => setCode(e.target?.result as string ?? '');
    reader.readAsText(file);
  }, []);

  const handleDrop = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    const file = e.dataTransfer.files[0];
    if (file) { setMode('upload'); handleFile(file); }
  }, [handleFile]);

  const handleAnalyze = async () => {
    if (!code.trim()) { setError('Please paste or upload ABAP source code first.'); return; }
    setError('');
    setLoading(true);
    setResult(null);
    try {
      const resp = await fetch('/api/review-abap', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ code, fileName }),
      });
      const data = await resp.json();
      if (!resp.ok) throw new Error(data.error || 'Review failed');
      setResult(data);
      setActiveTab('report');
    } catch (err: any) {
      setError(err.message || 'Analysis failed. Please try again.');
    } finally {
      setLoading(false);
    }
  };

  const toggleFinding = (id: string) =>
    setExpandedFindings(prev => { const s = new Set(prev); s.has(id) ? s.delete(id) : s.add(id); return s; });

  const lineCount = code.split('\n').length;

  // ── Render ────────────────────────────────────────────────────────────────

  return (
    <div className="space-y-6">

      {/* ── Header banner ─────────────────────────────────────────────────── */}
      <div className="bg-gradient-to-r from-[#0040B0] to-[#0070F2] rounded-xl p-5 text-white shadow-md">
        <div className="flex items-start justify-between gap-4">
          <div className="space-y-1.5">
            <div className="flex items-center gap-2">
              <Search className="w-5 h-5 text-blue-200" />
              <h2 className="text-lg font-bold tracking-tight">ABAP Code Review &amp; Optimization Engine</h2>
            </div>
            <p className="text-blue-100 text-xs leading-relaxed max-w-2xl">
              Upload or paste existing ABAP source code for comprehensive AI-powered analysis — syntax quality,
              performance bottlenecks, Clean Core compliance, ATC findings, and automatic code optimization with full documentation.
            </p>
            <div className="flex flex-wrap gap-2 pt-1">
              {['ATC Analysis','Clean Core Check','Performance Optimization','Auto Documentation','Change Summary'].map(t => (
                <span key={t} className="bg-white/15 text-white text-[9px] font-semibold px-2.5 py-0.5 rounded-full border border-white/20">{t}</span>
              ))}
            </div>
          </div>
        </div>
      </div>

      {/* ── Input area ────────────────────────────────────────────────────── */}
      {!result && (
        <div className="bg-white border border-[#D1D9E0] rounded-xl shadow-sm overflow-hidden">
          {/* Mode switcher */}
          <div className="flex border-b border-[#D1D9E0] bg-[#FAFAFB]">
            {(['paste', 'upload'] as const).map(m => (
              <button key={m} onClick={() => setMode(m)}
                className={`flex-1 py-3 text-xs font-bold flex items-center justify-center gap-2 transition cursor-pointer ${
                  mode === m ? 'bg-white text-[#0040B0] border-b-2 border-[#0040B0]' : 'text-[#6A6D70] hover:text-[#32363A]'
                }`}>
                {m === 'paste' ? <><Clipboard className="w-4 h-4" />Paste Code</> : <><Upload className="w-4 h-4" />Upload File</>}
              </button>
            ))}
          </div>

          <div className="p-5 space-y-4">
            {mode === 'paste' ? (
              <div className="space-y-2">
                <label className="text-xs font-bold text-[#32363A] flex items-center gap-2">
                  <Code2 className="w-3.5 h-3.5 text-[#0040B0]" />
                  Paste ABAP Source Code
                  {code && <span className="ml-auto text-[#6A6D70] font-normal">{lineCount} lines</span>}
                </label>
                <textarea
                  value={code}
                  onChange={e => setCode(e.target.value)}
                  placeholder={`*----------------------------------------------------------------------*\n* Paste your ABAP source code here...\n* Supports: Reports, Classes, Function Modules, BAdIs, CDS, RAP BOs\n*----------------------------------------------------------------------*\nCLASS zcl_example DEFINITION PUBLIC FINAL.\n  ...\nENDCLASS.`}
                  rows={16}
                  className="w-full font-mono text-xs bg-[#1E222B] text-[#ABB2BF] border border-[#3E4452] rounded-xl p-4 resize-y outline-none focus:border-[#0040B0] focus:ring-1 focus:ring-[#0040B0] placeholder-[#4B5263] leading-relaxed"
                  spellCheck={false}
                />
              </div>
            ) : (
              <div
                onDrop={handleDrop}
                onDragOver={e => e.preventDefault()}
                onClick={() => fileRef.current?.click()}
                className="border-2 border-dashed border-[#D1D9E0] hover:border-[#0040B0] rounded-xl p-10 text-center cursor-pointer transition-colors group"
              >
                <input ref={fileRef} type="file" accept=".abap,.txt,.cls,.prog,.fugr" className="hidden"
                  onChange={e => { const f = e.target.files?.[0]; if (f) handleFile(f); }} />
                <Upload className="w-10 h-10 text-[#D1D9E0] group-hover:text-[#0040B0] mx-auto mb-3 transition-colors" />
                {fileName ? (
                  <div className="space-y-1">
                    <p className="text-sm font-bold text-[#0040B0]">{fileName}</p>
                    <p className="text-xs text-[#6A6D70]">{lineCount} lines loaded · Click to change file</p>
                  </div>
                ) : (
                  <div className="space-y-1">
                    <p className="text-sm font-semibold text-[#32363A]">Drop your ABAP file here</p>
                    <p className="text-xs text-[#6A6D70]">or click to browse · Supports .abap .txt .cls .prog .fugr</p>
                  </div>
                )}
              </div>
            )}

            {/* Preview if file uploaded */}
            {mode === 'upload' && code && (
              <div className="space-y-1.5">
                <p className="text-[10px] font-bold text-[#6A6D70] uppercase tracking-wider">Preview</p>
                <HighlightedCode code={code} maxH="220px" />
              </div>
            )}

            {error && (
              <div className="flex items-center gap-2 bg-red-50 border border-red-200 text-red-700 text-xs px-4 py-3 rounded-lg">
                <AlertTriangle className="w-4 h-4 flex-shrink-0" />{error}
              </div>
            )}

            <div className="flex items-center justify-between pt-1">
              <p className="text-[10px] text-[#6A6D70]">AI-powered · Gemini 3.5 Flash · Clean Core + ABAP 7.4+ ruleset</p>
              <button
                onClick={handleAnalyze}
                disabled={loading || !code.trim()}
                className="flex items-center gap-2 px-6 py-2.5 bg-[#0040B0] hover:bg-[#0053CC] disabled:opacity-50 text-white text-xs font-bold rounded-xl shadow transition cursor-pointer"
              >
                {loading ? <><RefreshCw className="w-4 h-4 animate-spin" />Analyzing…</> : <><Search className="w-4 h-4" />Analyze Code</>}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* ── Loading state ─────────────────────────────────────────────────── */}
      {loading && (
        <div className="bg-white border border-[#D1D9E0] rounded-xl p-12 text-center shadow-sm">
          <RefreshCw className="w-10 h-10 text-[#0040B0] animate-spin mx-auto mb-4" />
          <p className="text-sm font-bold text-[#32363A]">Running Full ABAP Analysis…</p>
          <p className="text-xs text-[#6A6D70] mt-1">Checking syntax · ATC rules · Performance · Clean Core compliance · Generating optimized code</p>
        </div>
      )}

      {/* ── Results ───────────────────────────────────────────────────────── */}
      {result && !loading && (
        <div className="space-y-5">

          {/* Result header bar */}
          <div className="bg-white border border-[#D1D9E0] rounded-xl p-4 flex flex-col md:flex-row justify-between items-start md:items-center gap-3 shadow-sm">
            <div className="flex items-center gap-3">
              <div className="p-2.5 bg-emerald-50 border border-emerald-100 rounded-lg">
                <CheckCircle className="w-5 h-5 text-emerald-600" />
              </div>
              <div>
                <span className="text-[9px] text-[#6A6D70] uppercase tracking-wider font-bold">ANALYSIS COMPLETE</span>
                <h3 className="text-sm font-bold text-[#32363A] mt-0.5">{result.report.title}</h3>
              </div>
            </div>
            <div className="flex flex-wrap items-center gap-2 self-end md:self-auto">
              {/* Download menu */}
              <div className="flex flex-wrap gap-1.5">
                {[
                  { label: 'Optimized Code',  fn: () => downloadText(result.optimizedCode,  'optimized_abap.abap') },
                  { label: 'Documented Code', fn: () => downloadText(result.documentedCode, 'documented_abap.abap') },
                  { label: 'Full Report',     fn: () => downloadText(buildReport(result),    'abap_review_report.txt') },
                  { label: 'ATC Findings',    fn: () => downloadText(result.atcFindings.map(f => `[${f.severity.toUpperCase()}] ${f.rule}\n${f.description}\nFix: ${f.recommendation}\nAuto-Fixed: ${f.autoFixed}`).join('\n\n---\n\n'), 'atc_findings.txt') },
                ].map(btn => (
                  <button key={btn.label} onClick={btn.fn}
                    className="flex items-center gap-1 px-2.5 py-1.5 text-[10px] font-bold text-[#0040B0] border border-[#D1D9E0] bg-white hover:bg-blue-50 rounded-lg transition cursor-pointer">
                    <Download className="w-3 h-3" />{btn.label}
                  </button>
                ))}
              </div>
              <button onClick={() => { setResult(null); setCode(''); setFileName(''); }}
                className="flex items-center gap-1 px-3 py-1.5 text-xs font-semibold text-[#6A6D70] hover:text-rose-600 border border-[#D1D9E0] rounded-lg transition cursor-pointer">
                <X className="w-3.5 h-3.5" />New Review
              </button>
            </div>
          </div>

          {/* Score ring row */}
          <div className="bg-white border border-[#D1D9E0] rounded-xl p-5 shadow-sm">
            <div className="flex flex-wrap items-center justify-around gap-4">
              <ScoreRing score={result.report.qualityScore}         label="Quality"         color="#0040B0" />
              <ScoreRing score={result.report.performanceScore}     label="Performance"     color="#C678DD" />
              <ScoreRing score={result.report.maintainabilityScore} label="Maintainability" color="#56B6C2" />
              <ScoreRing score={result.report.securityScore}        label="Security"        color="#E06C75" />
              <ScoreRing score={result.report.cleanCoreScore}       label="Clean Core"      color="#009245" />
              <div className="flex flex-col items-center gap-2">
                <div className={`px-3 py-1 rounded-full text-xs font-bold ${result.report.atcStatus === 'Compliant' ? 'bg-emerald-100 text-emerald-700' : result.report.atcStatus === 'Warnings' ? 'bg-yellow-100 text-yellow-700' : 'bg-red-100 text-red-700'}`}>
                  ATC: {result.report.atcStatus}
                </div>
                <div className={`px-3 py-1 rounded-full text-xs font-bold ${result.report.cleanCoreStatus === 'Compliant' ? 'bg-cyan-100 text-cyan-700' : result.report.cleanCoreStatus === 'Partial' ? 'bg-yellow-100 text-yellow-700' : 'bg-red-100 text-red-700'}`}>
                  {result.report.cleanCoreStatus}
                </div>
                <span className="text-[10px] text-[#6A6D70] font-semibold text-center leading-tight">Speed +{result.report.estimatedSpeedImprovement}</span>
              </div>
            </div>
          </div>

          {/* Tabs */}
          <div className="flex gap-1 overflow-x-auto bg-[#FAFAFB] p-1.5 rounded-xl border border-[#D1D9E0] shadow-inner">
            {([
              { key: 'report',     icon: <BarChart3 className="w-3.5 h-3.5" />,      label: 'Analysis Report' },
              { key: 'optimized',  icon: <Zap className="w-3.5 h-3.5" />,            label: 'Optimized Code' },
              { key: 'documented', icon: <BookOpen className="w-3.5 h-3.5" />,        label: 'Documented Code' },
              { key: 'changes',    icon: <Wrench className="w-3.5 h-3.5" />,          label: `Changes (${result.changes.length})` },
              { key: 'atc',        icon: <ShieldCheck className="w-3.5 h-3.5" />,     label: `ATC Findings (${result.atcFindings.length})` },
              { key: 'diff',       icon: <ArrowLeftRight className="w-3.5 h-3.5" />,  label: 'Side-by-Side Diff' },
            ] as { key: typeof activeTab; icon: React.ReactNode; label: string }[]).map(tab => (
              <button key={tab.key} onClick={() => setActiveTab(tab.key)}
                className={`py-2 px-3 text-xs font-bold whitespace-nowrap rounded-lg transition cursor-pointer flex items-center gap-1.5 ${
                  activeTab === tab.key
                    ? 'bg-white text-[#0040B0] shadow-sm border border-[#D1D9E0]'
                    : 'text-[#6A6D70] hover:text-[#32363A] hover:bg-[#F4F7F9]'
                }`}>
                {tab.icon}{tab.label}
              </button>
            ))}
          </div>

          {/* ── Tab content ─────────────────────────────────────────────── */}
          <div className="space-y-4">

            {/* REPORT TAB */}
            {activeTab === 'report' && (
              <div className="space-y-5">
                {/* Summary */}
                <div className="bg-white border border-[#D1D9E0] rounded-xl p-5 shadow-sm space-y-3">
                  <h4 className="text-xs font-bold text-[#32363A] uppercase tracking-wider flex items-center gap-2">
                    <FileText className="w-4 h-4 text-[#0040B0]" />Executive Summary
                  </h4>
                  <p className="text-xs text-[#515457] leading-relaxed whitespace-pre-wrap">{result.report.summary}</p>
                </div>
                {/* Security */}
                {result.report.securityObservations.length > 0 && (
                  <div className="bg-white border border-[#D1D9E0] rounded-xl p-5 shadow-sm space-y-3">
                    <h4 className="text-xs font-bold text-[#32363A] uppercase tracking-wider flex items-center gap-2">
                      <ShieldCheck className="w-4 h-4 text-rose-500" />Security Observations
                    </h4>
                    <ul className="space-y-2">
                      {result.report.securityObservations.map((obs, i) => (
                        <li key={i} className="flex items-start gap-2 text-xs text-[#515457]">
                          <span className="w-5 h-5 rounded-full bg-rose-100 text-rose-700 text-[9px] font-bold flex items-center justify-center flex-shrink-0 mt-0.5">{i+1}</span>
                          {obs}
                        </li>
                      ))}
                    </ul>
                  </div>
                )}
                {/* Metrics grid */}
                <div className="grid grid-cols-2 md:grid-cols-3 gap-3">
                  {[
                    { label: 'ATC Status',         value: result.report.atcStatus,               icon: <ShieldCheck className="w-4 h-4" /> },
                    { label: 'Clean Core Status',   value: result.report.cleanCoreStatus,          icon: <CheckCircle className="w-4 h-4" /> },
                    { label: 'Performance Boost',   value: `+${result.report.estimatedSpeedImprovement}`, icon: <TrendingUp className="w-4 h-4" /> },
                    { label: 'ATC Findings',        value: `${result.atcFindings.length} issues`,  icon: <AlertTriangle className="w-4 h-4" /> },
                    { label: 'Changes Applied',     value: `${result.changes.length} optimizations`, icon: <Wrench className="w-4 h-4" /> },
                    { label: 'Code Lines',          value: `${lineCount} lines reviewed`,          icon: <Code2 className="w-4 h-4" /> },
                  ].map(m => (
                    <div key={m.label} className="bg-[#FAFAFB] border border-[#D1D9E0] rounded-xl p-4 flex items-center gap-3 shadow-sm">
                      <div className="p-2 bg-white border border-[#D1D9E0] rounded-lg text-[#0040B0]">{m.icon}</div>
                      <div>
                        <p className="text-[9px] text-[#6A6D70] uppercase tracking-wider font-bold">{m.label}</p>
                        <p className="text-sm font-bold text-[#32363A]">{m.value}</p>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            )}

            {/* OPTIMIZED CODE TAB */}
            {activeTab === 'optimized' && (
              <div className="space-y-3">
                <div className="flex items-center justify-between">
                  <h4 className="text-xs font-bold text-[#32363A] flex items-center gap-2"><Zap className="w-4 h-4 text-[#C678DD]" />Optimized ABAP Code</h4>
                  <button onClick={() => downloadText(result.optimizedCode, 'optimized_abap.abap')}
                    className="flex items-center gap-1.5 px-3 py-1.5 text-[10px] font-bold text-[#0040B0] border border-[#D1D9E0] rounded-lg hover:bg-blue-50 transition cursor-pointer">
                    <Download className="w-3 h-3" />Download .abap
                  </button>
                </div>
                <HighlightedCode code={result.optimizedCode} maxH="600px" />
              </div>
            )}

            {/* DOCUMENTED CODE TAB */}
            {activeTab === 'documented' && (
              <div className="space-y-3">
                <div className="flex items-center justify-between">
                  <h4 className="text-xs font-bold text-[#32363A] flex items-center gap-2"><BookOpen className="w-4 h-4 text-[#56B6C2]" />Documented ABAP Code</h4>
                  <button onClick={() => downloadText(result.documentedCode, 'documented_abap.abap')}
                    className="flex items-center gap-1.5 px-3 py-1.5 text-[10px] font-bold text-[#0040B0] border border-[#D1D9E0] rounded-lg hover:bg-blue-50 transition cursor-pointer">
                    <Download className="w-3 h-3" />Download .abap
                  </button>
                </div>
                <HighlightedCode code={result.documentedCode} maxH="600px" />
              </div>
            )}

            {/* CHANGES TAB */}
            {activeTab === 'changes' && (
              <div className="space-y-3">
                <h4 className="text-xs font-bold text-[#32363A] flex items-center gap-2"><Wrench className="w-4 h-4 text-[#D19A66]" />{result.changes.length} Changes Applied</h4>
                {result.changes.map((c, i) => (
                  <div key={i} className={`rounded-xl border p-4 space-y-3 ${CHANGE_COLOR[c.category] || 'bg-slate-50 border-slate-200'}`}>
                    <div className="flex items-start justify-between gap-3">
                      <span className={`text-[9px] font-black uppercase tracking-wider px-2.5 py-1 rounded-full ${CHANGE_BADGE[c.category]}`}>{c.category}</span>
                      <p className="text-xs text-[#515457] leading-relaxed flex-1">{c.explanation}</p>
                    </div>
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                      <div className="space-y-1">
                        <p className="text-[9px] font-bold text-red-600 uppercase tracking-wider flex items-center gap-1"><XCircle className="w-2.5 h-2.5" />Original</p>
                        <pre className="bg-[#1E222B] text-red-300 text-[10px] font-mono p-3 rounded-lg overflow-x-auto whitespace-pre-wrap">{c.original}</pre>
                      </div>
                      <div className="space-y-1">
                        <p className="text-[9px] font-bold text-emerald-600 uppercase tracking-wider flex items-center gap-1"><CheckCircle className="w-2.5 h-2.5" />Optimized</p>
                        <pre className="bg-[#1E222B] text-emerald-300 text-[10px] font-mono p-3 rounded-lg overflow-x-auto whitespace-pre-wrap">{c.optimized}</pre>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            )}

            {/* ATC FINDINGS TAB */}
            {activeTab === 'atc' && (
              <div className="space-y-3">
                <div className="flex items-center justify-between">
                  <h4 className="text-xs font-bold text-[#32363A] flex items-center gap-2"><ShieldCheck className="w-4 h-4 text-[#0040B0]" />ATC Analysis — {result.atcFindings.length} Findings</h4>
                  <div className="flex gap-2 text-[10px]">
                    {(['error','warning','performance','info'] as const).map(s => {
                      const count = result.atcFindings.filter(f => f.severity === s).length;
                      return count > 0 ? (
                        <span key={s} className={`px-2 py-0.5 rounded-full font-bold border ${SEVERITY_STYLE[s]}`}>{count} {s}</span>
                      ) : null;
                    })}
                  </div>
                </div>
                {result.atcFindings.map(f => (
                  <div key={f.id} className={`rounded-xl border shadow-sm overflow-hidden ${SEVERITY_STYLE[f.severity]}`}>
                    <button
                      onClick={() => toggleFinding(f.id)}
                      className="w-full flex items-center justify-between gap-3 p-3.5 text-left cursor-pointer"
                    >
                      <div className="flex items-center gap-2.5 flex-1 min-w-0">
                        {SEVERITY_ICON[f.severity]}
                        <div className="min-w-0">
                          <p className="text-xs font-bold truncate">{f.rule}</p>
                          <p className="text-[10px] opacity-70 font-mono truncate">{f.location}</p>
                        </div>
                      </div>
                      <div className="flex items-center gap-2 flex-shrink-0">
                        {f.autoFixed
                          ? <span className="text-[9px] bg-emerald-100 text-emerald-700 border border-emerald-200 px-2 py-0.5 rounded-full font-bold">Auto-Fixed</span>
                          : <span className="text-[9px] bg-orange-100 text-orange-700 border border-orange-200 px-2 py-0.5 rounded-full font-bold">Manual</span>}
                        {expandedFindings.has(f.id) ? <ChevronDown className="w-3.5 h-3.5 opacity-60" /> : <ChevronRight className="w-3.5 h-3.5 opacity-60" />}
                      </div>
                    </button>
                    {expandedFindings.has(f.id) && (
                      <div className="px-4 pb-4 space-y-2 border-t border-current/10">
                        <p className="text-xs leading-relaxed pt-2">{f.description}</p>
                        <div className="flex items-start gap-2 bg-white/60 rounded-lg p-2.5">
                          <Wrench className="w-3.5 h-3.5 flex-shrink-0 mt-0.5 opacity-70" />
                          <p className="text-xs font-medium">{f.recommendation}</p>
                        </div>
                      </div>
                    )}
                  </div>
                ))}
              </div>
            )}

            {/* DIFF TAB */}
            {activeTab === 'diff' && (
              <div className="space-y-3">
                <div className="flex items-center justify-between">
                  <h4 className="text-xs font-bold text-[#32363A] flex items-center gap-2"><ArrowLeftRight className="w-4 h-4 text-[#61AFEF]" />Side-by-Side Comparison</h4>
                  <button onClick={() => downloadText(`ORIGINAL:\n${'='.repeat(60)}\n${result.originalCode}\n\nOPTIMIZED:\n${'='.repeat(60)}\n${result.optimizedCode}`, 'comparison.txt')}
                    className="flex items-center gap-1.5 px-3 py-1.5 text-[10px] font-bold text-[#0040B0] border border-[#D1D9E0] rounded-lg hover:bg-blue-50 transition cursor-pointer">
                    <Download className="w-3 h-3" />Download Comparison
                  </button>
                </div>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div className="space-y-1.5">
                    <p className="text-[10px] font-bold text-red-600 uppercase tracking-wider flex items-center gap-1.5"><XCircle className="w-3 h-3" />Original Code</p>
                    <HighlightedCode code={result.originalCode} maxH="480px" />
                  </div>
                  <div className="space-y-1.5">
                    <p className="text-[10px] font-bold text-emerald-600 uppercase tracking-wider flex items-center gap-1.5"><CheckCircle className="w-3 h-3" />Optimized Code</p>
                    <HighlightedCode code={result.optimizedCode} maxH="480px" />
                  </div>
                </div>
              </div>
            )}

          </div>
        </div>
      )}
    </div>
  );
};

export default AbapReviewPanel;
