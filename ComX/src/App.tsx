import React, { useState, useEffect } from "react";
import SAPCleanCorePage from "./components/SAPCleanCorePage";
import { Material, CommodityMarket, GeopoliticalRisk, Industry } from "./types";
import UploadZone from "./components/UploadZone";
import SimulationControls from "./components/SimulationControls";
import MaterialsTable from "./components/MaterialsTable";
import GeopoliticalRisks from "./components/GeopoliticalRisks";
import StrategyAdvisory from "./components/StrategyAdvisory";
import BackendSheetsView from "./components/BackendSheetsView";
import ExcelDatabaseView from "./components/ExcelDatabaseView";
import RecommendationsPanel from "./components/RecommendationsPanel";
import BPEvaluationPanel from "./components/BPEvaluationPanel";
import PTPInsightsPanel from "./components/PTPInsightsPanel";
import GlobalClientsPanel from "./components/GlobalClientsPanel";
import ProcurementScenariosPanel from "./components/ProcurementScenariosPanel";
import ScenarioRelationshipViewer from "./components/ScenarioRelationshipViewer";
import {
  BarChart3,
  Globe2,
  Sparkles,
  Calculator,
  Coins,
  ShieldAlert,
  TrendingUp,
  TrendingDown,
  FolderGit,
  HelpCircle,
  RefreshCw,
  FileSpreadsheet,
  ChevronDown,
  Building2,
  Network,
  LayoutGrid,
  X,
  Info,
  Package,
  Code2,
  Server,
  Layers,
  GitBranch,
  Zap,
  Shield,
  Database,
  Layout
} from "lucide-react";
import { ResponsiveContainer, LineChart, Line, XAxis, YAxis, Tooltip, CartesianGrid } from "recharts";

export default function App() {
  // Top-level page switcher: Page 1 = Commodity Intelligence, Page 2 = SAP Clean Core
  const [activePage, setActivePage] = useState<"commodity" | "cleancore">("commodity");

  // Modal visibility states
  const [showTechInfo, setShowTechInfo] = useState(false);
  const [showInstall, setShowInstall] = useState(false);

  // Active states
  const [activeTab, setActiveTab] = useState<"materials" | "excel_db" | "commodities" | "risks" | "strategy" | "backend_sheet" | "bp_eval" | "global_clients" | "proc_scenarios" | "scenario_map">("materials");
  const [materials, setMaterials] = useState<Material[]>([]);
  const [commodities, setCommodities] = useState<CommodityMarket[]>([]);
  const [riskCatalog, setRiskCatalog] = useState<GeopoliticalRisk[]>([]);

  // Industry list fetched from /api/industries (dynamic, not hardcoded)
  const [industries, setIndustries] = useState<Industry[]>([]);
  const [activeIndustry, setActiveIndustry] = useState<string>("automobile");
  
  // Selection and simulation states
  const [selectedMaterialId, setSelectedMaterialId] = useState<string | null>(null);
  const [selectedCommodityId, setSelectedCommodityId] = useState<string>("copper");
  const [simulationRates, setSimulationRates] = useState({
    copper: 0,
    steel: 0,
    aluminum: 0,
    nickel: 0
  });

  // AI strategy text and loaders
  const [strategyMemo, setStrategyMemo] = useState<string>("");
  const [isAnalyzing, setIsAnalyzing] = useState(false);
  const [isGenerating, setIsGenerating] = useState(false);
  const [isLoading, setIsLoading] = useState(true);

  // Fetch industry list once on mount
  useEffect(() => {
    fetch("/api/industries")
      .then((r) => r.json())
      .then((data: Industry[]) => setIndustries(data))
      .catch((err) => console.error("Failed to load industry list:", err));
  }, []);

  // Active industry object (derived from list)
  const activeIndustryObj = industries.find((i) => i.slug === activeIndustry);

  /**
   * Dynamic commodity name helper — reads from the industry's commodityKeys array.
   * Slot mapping: index 0 → "copper", 1 → "steel", 2 → "aluminum", 3 → "nickel".
   */
  const getCommodityName = (id: string): string => {
    const keyMap: Record<string, number> = { copper: 0, steel: 1, aluminum: 2, nickel: 3 };
    const idx = keyMap[id] ?? -1;
    if (idx >= 0 && activeIndustryObj?.commodityKeys[idx]) {
      return activeIndustryObj.commodityKeys[idx];
    }
    // Fallback defaults
    if (id === "copper") return "Copper (LME)";
    if (id === "steel") return "Steel HRC (NYMEX)";
    if (id === "aluminum") return "Aluminum (LME)";
    if (id === "nickel") return "Nickel (LME)";
    return id;
  };

  // Load initial datasets from the server on startup or industry change
  const refreshAllDashboardData = async (showLoader = false) => {
    try {
      if (showLoader) setIsLoading(true);
      const [materialsRes, commoditiesRes, risksRes] = await Promise.all([
        fetch(`/api/materials?industry=${activeIndustry}`),
        fetch(`/api/commodities?industry=${activeIndustry}`),
        fetch(`/api/geopolitical-risks?industry=${activeIndustry}`)
      ]);

      const materialsData = await materialsRes.json();
      const commoditiesData = await commoditiesRes.json();
      const risksData = await risksRes.json();

      setMaterials(materialsData);
      setCommodities(commoditiesData);
      setRiskCatalog(risksData);

      // Fetch initial strategic memo based on current values
      await generateStrategyMemo(materialsData, simulationRates, activeIndustry);
    } catch (err) {
      console.error("Failed to refresh dashboard data:", err);
    } finally {
      if (showLoader) setIsLoading(false);
    }
  };

  useEffect(() => {
    setSimulationRates({ copper: 0, steel: 0, aluminum: 0, nickel: 0 });
    refreshAllDashboardData(true);
  }, [activeIndustry]);

  // Fetch or re-generate strategy memo via server Gemini API
  const generateStrategyMemo = async (
    currentMaterials: Material[],
    currentRates: typeof simulationRates,
    industryToUse: string = activeIndustry
  ) => {
    try {
      setIsGenerating(true);
      const response = await fetch("/api/generate-strategy", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          materials: currentMaterials,
          simulatedRates: currentRates,
          industry: industryToUse
        })
      });

      if (!response.ok) {
        throw new Error("Sourcing Strategy report generation failed.");
      }

      const data = await response.json();
      setStrategyMemo(data.strategyMemo || "No report generated.");
    } catch (err) {
      console.error(err);
      setStrategyMemo("### Error: Strategy report generation could not connect to Gemini API. Sourcing advisor is offline.");
    } finally {
      setIsGenerating(false);
    }
  };

  // Trigger strategy re-evaluation manually
  const handleRefreshReport = async () => {
    await generateStrategyMemo(materials, simulationRates, activeIndustry);
  };

  // Callbacks when a new excel workbook is loaded
  const handleMaterialsLoaded = (loadedMaterials: Material[], source: "uploaded" | "default") => {
    setMaterials(loadedMaterials);
    // Generate strategy immediately for the new dataset
    generateStrategyMemo(loadedMaterials, simulationRates, activeIndustry);
  };

  // Update a single material composition (manual override)
  const handleUpdateMaterial = (updatedMaterial: Material) => {
    const updatedList = materials.map(m => m.id === updatedMaterial.id ? updatedMaterial : m);
    setMaterials(updatedList);
    // Re-evaluate strategy with updated manual ratios
    generateStrategyMemo(updatedList, simulationRates, activeIndustry);
  };

  // Update entire materials dataset (from spreadsheet edits)
  const handleUpdateMaterialsList = (updatedList: Material[]) => {
    setMaterials(updatedList);
    generateStrategyMemo(updatedList, simulationRates, activeIndustry);
  };

  // Calculations for KPI Cards
  let totalProcurementSpend = 0;
  let totalCopperExposure = 0;
  let totalSteelExposure = 0;
  let totalAluminumExposure = 0;
  let totalNickelExposure = 0;
  let totalTradedExposure = 0;
  let geopoliticalRiskSpend = 0;

  materials.forEach((m) => {
    const spend = m.volume * m.unitPrice;
    totalProcurementSpend += spend;
    
    const copperShare = (m.commodityWeights?.copper || 0) / 100;
    const steelShare = (m.commodityWeights?.steel || 0) / 100;
    const aluminumShare = (m.commodityWeights?.aluminum || 0) / 100;
    const nickelShare = (m.commodityWeights?.nickel || 0) / 100;

    totalCopperExposure += spend * copperShare;
    totalSteelExposure += spend * steelShare;
    totalAluminumExposure += spend * aluminumShare;
    totalNickelExposure += spend * nickelShare;

    totalTradedExposure += spend * (copperShare + steelShare + aluminumShare + nickelShare);

    // Compute geopolitical risk spend (caution or risk country vendors, e.g. risk >= 3)
    const countryRisk = riskCatalog.find(r => r.country.toLowerCase() === m.vendorCountry.toLowerCase());
    if (countryRisk && countryRisk.riskScore >= 3) {
      geopoliticalRiskSpend += spend;
    }
  });

  // Weighted exposure proportions
  const copperWeightedPercent = totalProcurementSpend > 0 ? (totalCopperExposure / totalProcurementSpend) * 100 : 0;
  const steelWeightedPercent = totalProcurementSpend > 0 ? (totalSteelExposure / totalProcurementSpend) * 100 : 0;
  const aluminumWeightedPercent = totalProcurementSpend > 0 ? (totalAluminumExposure / totalProcurementSpend) * 100 : 0;
  const nickelWeightedPercent = totalProcurementSpend > 0 ? (totalNickelExposure / totalProcurementSpend) * 100 : 0;
  
  const geopoliticalRiskRatio = totalProcurementSpend > 0 ? (geopoliticalRiskSpend / totalProcurementSpend) * 100 : 0;
  const totalExposureRatio = totalProcurementSpend > 0 ? (totalTradedExposure / totalProcurementSpend) * 100 : 0;

  // Active simulated delta addition
  const simCopperDelta = totalCopperExposure * (simulationRates.copper / 100);
  const simSteelDelta = totalSteelExposure * (simulationRates.steel / 100);
  const simAluminumDelta = totalAluminumExposure * (simulationRates.aluminum / 100);
  const simNickelDelta = totalNickelExposure * (simulationRates.nickel / 100);
  const totalSimDelta = simCopperDelta + simSteelDelta + simAluminumDelta + simNickelDelta;

  const formatUSD = (num: number) => {
    return new Intl.NumberFormat("en-US", {
      style: "currency",
      currency: "USD",
      maximumFractionDigits: 0
    }).format(num);
  };

  // Selected commodity for detailed historical LME line chart
  const activeCommodity = commodities.find(c => c.id === selectedCommodityId) || commodities[0];

  // If Page 2 is active, render SAPCleanCorePage entirely
  if (activePage === "cleancore") {
    return <SAPCleanCorePage onBack={() => setActivePage("commodity")} />;
  }

  return (
    <div className="min-h-screen bg-slate-50 text-slate-800 font-sans selection:bg-indigo-500/10">

      {/* ComX Top-Level Page Switcher Nav */}
      <div className="bg-slate-900 text-white px-6 py-2 flex items-center gap-4 text-xs font-semibold sticky top-0 z-[60]">
        <span className="text-indigo-400 font-bold tracking-wider mr-2">ComX</span>
        <button
          onClick={() => setActivePage("commodity")}
          className={`px-3 py-1 rounded transition-colors ${activePage === "commodity" ? "bg-indigo-600 text-white" : "text-slate-300 hover:text-white"}`}
        >
          📦 Commodity Intelligence
        </button>
        <button
          onClick={() => setActivePage("cleancore")}
          className={`px-3 py-1 rounded transition-colors ${activePage === "cleancore" ? "bg-blue-600 text-white" : "text-slate-300 hover:text-white"}`}
        >
          🔷 SAP Clean Core Suite
        </button>
        <span className="ml-auto text-slate-500 text-[10px]">v2026.7</span>
      </div>

      {/* Upper Navigation & Branding Header */}
      <header className="border-b border-slate-200 bg-white sticky top-8 z-50 px-6 py-4 shadow-sm" id="app-header">
        <div className="max-w-7xl mx-auto flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-lg bg-indigo-700 flex items-center justify-center text-white font-bold text-xl shadow-md">
              S
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h1 className="text-lg font-bold text-slate-900 tracking-tight">CommodityProcure <span className="text-indigo-600 font-medium">Intelligence</span></h1>
                <span className="bg-indigo-50 text-indigo-700 border border-indigo-100 text-[9px] px-2 py-0.5 rounded-full font-mono font-bold uppercase tracking-wider">
                  v2026.7
                </span>
              </div>
              <p className="text-xs text-slate-500 mt-0.5">
                Principal SAP Material Master exchange rate correlation, forecasting, and hedge strategist for {activeIndustryObj?.label ?? activeIndustry}.
              </p>
            </div>
          </div>

          <div className="flex items-center gap-6">
            <div className="flex items-center gap-2 px-3 py-1 bg-green-50 text-green-700 border border-green-200 rounded-full text-xs font-semibold">
              <span className="w-2 h-2 rounded-full bg-green-500 animate-pulse"></span>
              Exchange Feeds: Live (LME/NYMEX)
            </div>
            <div className="h-8 w-[1px] bg-slate-200 hidden md:block"></div>
            <div className="flex items-center gap-3 hidden md:flex">
              <div className="text-right">
                <p className="text-xs font-bold text-slate-800">SAP Global Consultant</p>
                <p className="text-[10px] text-slate-500">{activeIndustryObj?.label ?? activeIndustry}</p>
              </div>
              <div className="w-10 h-10 rounded-full bg-slate-100 border-2 border-white shadow-sm flex items-center justify-center text-slate-700 italic font-serif font-bold">JD</div>
            </div>
          </div>
        </div>
      </header>

      {isLoading ? (
        /* Full Page Loader */
        <div className="flex flex-col items-center justify-center py-40 text-center space-y-4">
          <RefreshCw className="w-12 h-12 text-indigo-600 animate-spin" />
          <div className="space-y-1">
            <p className="text-sm font-semibold text-slate-800">Bootstrapping SAP Intelligence Module...</p>
            <p className="text-xs text-slate-500">Parsing default Material Master logs & real-time commodity indices.</p>
          </div>
        </div>
      ) : (
        <main className="max-w-7xl mx-auto px-6 py-8 space-y-8">

          {/* Industry Context Selection Panel — dynamic dropdown from /api/industries */}
          <div className="bg-gradient-to-r from-slate-900 to-indigo-950 p-5 rounded-2xl border border-slate-800 text-white shadow-md flex flex-col md:flex-row justify-between items-start md:items-center gap-5" id="industry-selector-panel">
            <div className="space-y-1">
              <span className="text-[10px] font-mono font-bold text-indigo-400 uppercase tracking-wider">Enterprise Sourcing Domain Context</span>
              <h2 className="text-sm font-bold text-white">Active Industry Dataset Selector</h2>
              <p className="text-[11px] text-slate-300 max-w-xl">
                Switch between {industries.length || 10} active clients to dynamically swap SAP material databases, MARA/KONP condition rates, and geopolitical risks.
              </p>
            </div>

            {/* Controlled dropdown wired to /api/industries */}
            <div className="relative w-full md:w-auto min-w-[280px]">
              <div className="pointer-events-none absolute inset-y-0 right-3 flex items-center">
                <ChevronDown className="w-4 h-4 text-indigo-300" />
              </div>
              <select
                id="industry-select"
                value={activeIndustry}
                onChange={(e) => setActiveIndustry(e.target.value)}
                className="w-full appearance-none bg-slate-800/80 border border-slate-700 text-white text-sm font-semibold rounded-xl px-4 py-3 pr-10 focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500 cursor-pointer hover:bg-slate-800 transition-colors"
                aria-label="Select active industry"
              >
                {industries.length === 0 ? (
                  <option value="automobile">Loading industries...</option>
                ) : (
                  industries.map((ind) => (
                    <option key={ind.slug} value={ind.slug} disabled={!ind.available}>
                      {ind.label}{!ind.available ? " (seeding required)" : ""}
                    </option>
                  ))
                )}
              </select>
            </div>

            {/* Live-data refresh button */}
            {activeIndustryObj && (
              <button
                onClick={async () => {
                  try {
                    const r = await fetch(`/api/industry/${activeIndustry}/refresh`, { method: "POST" });
                    const d = await r.json();
                    console.log("[LiveFetch]", d);
                  } catch (e) {
                    console.error("[LiveFetch] failed:", e);
                  }
                }}
                className="flex items-center gap-2 px-4 py-2.5 bg-indigo-600 hover:bg-indigo-700 text-white text-xs font-bold rounded-xl border border-indigo-500 transition-all cursor-pointer whitespace-nowrap shadow-sm"
                title="Fetch live commodity prices and write to Excel"
              >
                <RefreshCw className="w-3.5 h-3.5" />
                Live Fetch Prices
              </button>
            )}
          </div>

          {/* Sourcing Spend KPIs Block */}
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4" id="kpi-block">
            
            {/* KPI 1: Overall Annual Spend */}
            <div className="bg-white border border-slate-200 rounded-xl p-5 relative overflow-hidden group shadow-sm transition-all hover:shadow-md">
              <div className="flex justify-between items-start">
                <div>
                  <span className="text-[10px] font-mono font-bold text-slate-400 uppercase tracking-wider">Total Annual Spend</span>
                  <div className="text-2xl font-bold text-slate-800 font-mono mt-1.5">{formatUSD(totalProcurementSpend)}</div>
                </div>
                <div className="w-8 h-8 rounded-lg bg-slate-50 flex items-center justify-center text-slate-400 group-hover:bg-indigo-50 group-hover:text-indigo-600 transition-colors">
                  <Coins className="w-4 h-4" />
                </div>
              </div>
              <p className="text-[10px] text-slate-500 mt-3 flex items-center gap-1.5 border-t border-slate-100 pt-2">
                Sourcing volume: <span className="font-mono text-slate-700 font-bold">{materials.length} standard items</span>
              </p>
            </div>

             {/* KPI 2: Weighted Primary Commodity Impact */}
            <div className="bg-white border border-slate-200 rounded-xl p-5 relative overflow-hidden group shadow-sm transition-all hover:shadow-md">
              <div className="flex justify-between items-start">
                <div>
                  <span className="text-[10px] font-mono font-bold text-slate-400 uppercase tracking-wider">Weighted {getCommodityName("copper")} Concentration</span>
                  <div className="text-2xl font-bold text-slate-800 font-mono mt-1.5">{copperWeightedPercent.toFixed(1)}%</div>
                </div>
                <div className="w-8 h-8 rounded-lg bg-slate-50 flex items-center justify-center text-slate-400 group-hover:bg-indigo-50 group-hover:text-indigo-600 transition-colors">
                  <Calculator className="w-4 h-4" />
                </div>
              </div>
              <div className="mt-3 flex items-center justify-between text-[10px] text-slate-500 font-mono border-t border-slate-100 pt-2">
                <span>Value: {formatUSD(totalCopperExposure)}</span>
                <span className="text-indigo-600 font-bold">{getCommodityName("copper")} Primary</span>
              </div>
            </div>

            {/* KPI 3: Commodity Risk Exposure */}
            <div className="bg-white border border-slate-200 rounded-xl p-5 relative overflow-hidden group shadow-sm transition-all hover:shadow-md">
              <div className="flex justify-between items-start">
                <div>
                  <span className="text-[10px] font-mono font-bold text-slate-400 uppercase tracking-wider">Traded Commodity Exposure</span>
                  <div className="text-2xl font-bold text-slate-800 font-mono mt-1.5">{totalExposureRatio.toFixed(1)}%</div>
                </div>
                <div className="w-8 h-8 rounded-lg bg-slate-50 flex items-center justify-center text-slate-400 group-hover:bg-indigo-50 group-hover:text-indigo-600 transition-colors">
                  <BarChart3 className="w-4 h-4" />
                </div>
              </div>
              <div className="mt-3 flex items-center justify-between text-[10px] text-slate-500 font-mono border-t border-slate-100 pt-2">
                <span>Active Exposure: {formatUSD(totalTradedExposure)}</span>
                {totalSimDelta !== 0 && (
                  <span className={`font-bold ${totalSimDelta > 0 ? "text-rose-600" : "text-emerald-600"}`}>
                    Sim: {totalSimDelta > 0 ? "+" : ""}{simulationRates.copper > 0 || simulationRates.steel > 0 ? `${((totalSimDelta / totalProcurementSpend) * 100).toFixed(1)}%` : ""}
                  </span>
                )}
              </div>
            </div>

            {/* KPI 4: Sourcing Geopolitical Risks */}
            <div className="bg-white border border-slate-200 rounded-xl p-5 relative overflow-hidden group shadow-sm transition-all hover:shadow-md">
              <div className="flex justify-between items-start">
                <div>
                  <span className="text-[10px] font-mono font-bold text-slate-400 uppercase tracking-wider">Geopolitical Risk Ratio</span>
                  <div className="text-2xl font-bold text-slate-800 font-mono mt-1.5">{geopoliticalRiskRatio.toFixed(1)}%</div>
                </div>
                <div className="w-8 h-8 rounded-lg bg-slate-50 flex items-center justify-center text-slate-400 group-hover:bg-indigo-50 group-hover:text-indigo-600 transition-colors">
                  <ShieldAlert className="w-4 h-4" />
                </div>
              </div>
              <p className="text-[10px] text-slate-500 mt-3 flex items-center gap-1.5 border-t border-slate-100 pt-2">
                Caution Sourcing: <span className="font-mono text-slate-700 font-bold">{formatUSD(geopoliticalRiskSpend)}</span>
              </p>
            </div>

          </div>

          {/* Recommendations Panel — below KPIs, above Upload Zone */}
          <RecommendationsPanel industry={activeIndustry} />

          {/* BP Evaluation Panel — below Recommendations */}
          <BPEvaluationPanel industry={activeIndustry} />

          {/* SAP PTP Insights Panel — surfaces EBAN/EKKO/EKBE/EKET/EORD etc. */}
          <PTPInsightsPanel activeIndustry={activeIndustry} />

          {/* Upload Zone */}
          <UploadZone
            onMaterialsLoaded={handleMaterialsLoaded}
            onStartAnalysis={() => setIsAnalyzing(true)}
            onEndAnalysis={() => setIsAnalyzing(false)}
            isAnalyzing={isAnalyzing}
          />

          {/* Interactive Simulation Panel */}
          <SimulationControls
            materials={materials}
            commodities={commodities}
            rates={simulationRates}
            onRateChange={(newRates) => {
              setSimulationRates(newRates);
              // Recalculate AI strategies when sliders adjust
              generateStrategyMemo(materials, newRates, activeIndustry);
            }}
            commodityLabels={activeIndustryObj?.commodityKeys}
          />

          {/* Main Dashboard Interactive Tabs */}
          <div className="space-y-4">
            <div className="flex border-b border-slate-200 gap-1 overflow-x-auto pb-px" id="main-navigation-tabs">
              <button
                onClick={() => setActiveTab("materials")}
                className={`px-5 py-3.5 text-xs font-semibold border-b-2 transition-all flex items-center gap-2 whitespace-nowrap cursor-pointer ${
                  activeTab === "materials"
                    ? "border-indigo-600 text-indigo-600 bg-indigo-50/40"
                    : "border-transparent text-slate-500 hover:text-slate-800"
                }`}
                id="tab-btn-materials"
              >
                <FolderGit className="w-4 h-4" />
                SAP Materials & BOM Allocation
              </button>

              <button
                onClick={() => setActiveTab("excel_db")}
                className={`px-5 py-3.5 text-xs font-semibold border-b-2 transition-all flex items-center gap-2 whitespace-nowrap cursor-pointer ${
                  activeTab === "excel_db"
                    ? "border-emerald-600 text-emerald-600 bg-emerald-50/40 font-bold"
                    : "border-transparent text-slate-500 hover:text-slate-800"
                }`}
                id="tab-btn-excel-db"
              >
                <FileSpreadsheet className="w-4 h-4 text-emerald-600" />
                SAP Excel Databases (Page 2)
              </button>

              <button
                onClick={() => setActiveTab("commodities")}
                className={`px-5 py-3.5 text-xs font-semibold border-b-2 transition-all flex items-center gap-2 whitespace-nowrap cursor-pointer ${
                  activeTab === "commodities"
                    ? "border-indigo-600 text-indigo-600 bg-indigo-50/40"
                    : "border-transparent text-slate-500 hover:text-slate-800"
                }`}
                id="tab-btn-commodities"
              >
                <Coins className="w-4 h-4" />
                Commodity Exchanges Desk
              </button>

              <button
                onClick={() => setActiveTab("risks")}
                className={`px-5 py-3.5 text-xs font-semibold border-b-2 transition-all flex items-center gap-2 whitespace-nowrap cursor-pointer ${
                  activeTab === "risks"
                    ? "border-indigo-600 text-indigo-600 bg-indigo-50/40"
                    : "border-transparent text-slate-500 hover:text-slate-800"
                }`}
                id="tab-btn-risks"
              >
                <Globe2 className="w-4 h-4" />
                Sourcing Geopolitical Risks
              </button>

              <button
                onClick={() => setActiveTab("strategy")}
                className={`px-5 py-3.5 text-xs font-semibold border-b-2 transition-all flex items-center gap-2 whitespace-nowrap cursor-pointer ${
                  activeTab === "strategy"
                    ? "border-indigo-600 text-indigo-600 bg-indigo-50/40"
                    : "border-transparent text-slate-500 hover:text-indigo-600"
                }`}
                id="tab-btn-strategy"
              >
                <Sparkles className="w-4 h-4 text-indigo-600 animate-pulse" />
                Strategic AI Advisory Memo
              </button>

              <button
                onClick={() => setActiveTab("backend_sheet")}
                className={`px-5 py-3.5 text-xs font-semibold border-b-2 transition-all flex items-center gap-2 whitespace-nowrap cursor-pointer ${
                  activeTab === "backend_sheet"
                    ? "border-indigo-600 text-indigo-600 bg-indigo-50/40"
                    : "border-transparent text-slate-500 hover:text-slate-800"
                }`}
                id="tab-btn-backend-sheet"
              >
                <FileSpreadsheet className="w-4 h-4 text-emerald-600" />
                Unified ERP & Commodity Sheet
              </button>

              <button
                onClick={() => setActiveTab("bp_eval")}
                className={`px-5 py-3.5 text-xs font-semibold border-b-2 transition-all flex items-center gap-2 whitespace-nowrap cursor-pointer ${
                  activeTab === "bp_eval"
                    ? "border-purple-600 text-purple-600 bg-purple-50/40 font-bold"
                    : "border-transparent text-slate-500 hover:text-slate-800"
                }`}
                id="tab-btn-bp-eval"
              >
                <ShieldAlert className="w-4 h-4 text-purple-600" />
                BP Vendor Evaluation
              </button>

              <button
                onClick={() => setActiveTab("global_clients")}
                className={`px-5 py-3.5 text-xs font-semibold border-b-2 transition-all flex items-center gap-2 whitespace-nowrap cursor-pointer ${
                  activeTab === "global_clients"
                    ? "border-indigo-600 text-indigo-600 bg-indigo-50/40 font-bold"
                    : "border-transparent text-slate-500 hover:text-slate-800"
                }`}
                id="tab-btn-global-clients"
              >
                <Building2 className="w-4 h-4 text-indigo-600" />
                Global Clients
              </button>

              <button
                onClick={() => setActiveTab("proc_scenarios")}
                className={`px-5 py-3.5 text-xs font-semibold border-b-2 transition-all flex items-center gap-2 whitespace-nowrap cursor-pointer ${
                  activeTab === "proc_scenarios"
                    ? "border-emerald-600 text-emerald-600 bg-emerald-50/40 font-bold"
                    : "border-transparent text-slate-500 hover:text-slate-800"
                }`}
                id="tab-btn-proc-scenarios"
              >
                <LayoutGrid className="w-4 h-4 text-emerald-600" />
                Procurement Scenarios
              </button>

              <button
                onClick={() => setActiveTab("scenario_map")}
                className={`px-5 py-3.5 text-xs font-semibold border-b-2 transition-all flex items-center gap-2 whitespace-nowrap cursor-pointer ${
                  activeTab === "scenario_map"
                    ? "border-slate-700 text-slate-700 bg-slate-50/60 font-bold"
                    : "border-transparent text-slate-500 hover:text-slate-800"
                }`}
                id="tab-btn-scenario-map"
              >
                <Network className="w-4 h-4 text-slate-600" />
                Scenario Flow Map
              </button>
            </div>

            {/* Tab Renderers */}
            <div>
              {activeTab === "materials" && (
                <MaterialsTable
                  materials={materials}
                  onUpdateMaterial={handleUpdateMaterial}
                  selectedMaterialId={selectedMaterialId}
                  onSelectMaterial={setSelectedMaterialId}
                />
              )}

              {activeTab === "excel_db" && (
                <ExcelDatabaseView
                  activeIndustry={activeIndustry}
                  onTriggerDataRefresh={() => refreshAllDashboardData(false)}
                />
              )}

              {activeTab === "commodities" && (
                <div className="bg-white border border-slate-200 rounded-xl p-6 shadow-sm animate-fade-in" id="commodities-exchanges-panel">
                  <div className="grid grid-cols-1 lg:grid-cols-12 gap-8">
                    {/* Commodity Cards Selection (4 cols) */}
                    <div className="lg:col-span-4 space-y-3.5">
                      <h3 className="text-xs font-bold text-slate-400 uppercase tracking-wider mb-4">Exchange Index Markets</h3>
                      
                      {commodities.map((c) => {
                        const isSelected = selectedCommodityId === c.id;
                        const isUp = c.change24h > 0;
                        const weight = c.id === "copper" ? copperWeightedPercent 
                                    : c.id === "steel" ? steelWeightedPercent 
                                    : c.id === "aluminum" ? aluminumWeightedPercent 
                                    : nickelWeightedPercent;

                        return (
                          <div
                            key={c.id}
                            onClick={() => setSelectedCommodityId(c.id)}
                            className={`p-4 rounded-xl border transition-all cursor-pointer shadow-sm ${
                              isSelected
                                ? "bg-indigo-50/50 border-indigo-500 ring-1 ring-indigo-500/20"
                                : "bg-white border-slate-200 hover:border-slate-300 hover:bg-slate-50/40"
                            }`}
                          >
                            <div className="flex justify-between items-start">
                              <div>
                                <span className="text-[10px] font-mono font-bold text-slate-400 uppercase tracking-wider">{c.symbol}</span>
                                <h4 className="text-sm font-semibold text-slate-800 mt-0.5">{c.name}</h4>
                              </div>
                              <span className={`text-[11px] font-mono font-bold flex items-center gap-0.5 ${isUp ? "text-emerald-600" : "text-rose-600"}`}>
                                {isUp ? <TrendingUp className="w-3.5 h-3.5" /> : <TrendingDown className="w-3.5 h-3.5" />}
                                {isUp ? "+" : ""}{c.change24h}%
                              </span>
                            </div>

                            <div className="flex justify-between items-baseline mt-4 pt-3 border-t border-slate-100">
                              <span className="text-base font-bold text-slate-800 font-mono">{c.currentPrice.toLocaleString()} <span className="text-[10px] text-slate-500 font-normal">{c.unit}</span></span>
                              <span className="text-[10px] text-slate-400 font-mono">Weighted Impact: <strong className="text-slate-600">{weight.toFixed(0)}%</strong></span>
                            </div>
                          </div>
                        );
                      })}
                    </div>

                    {/* Commodity Details & Chart (8 cols) */}
                    <div className="lg:col-span-8 flex flex-col justify-between">
                      <div className="bg-slate-50 p-5 rounded-xl border border-slate-200 h-full flex flex-col justify-between space-y-6">
                        
                        {/* Header details */}
                        <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-2 pb-4 border-b border-slate-200">
                          <div>
                            <span className="text-[10px] font-mono font-bold text-indigo-600">{activeCommodity.symbol}</span>
                            <h3 className="text-base font-bold text-slate-800 mt-0.5">{activeCommodity.name} Traded History</h3>
                          </div>
                          
                          <div className="flex gap-4 font-mono text-[10px] text-slate-500">
                            <div>
                              <span className="text-slate-400">Exchange Standard:</span>
                              <p className="text-slate-700 mt-0.5">LME / CME Physical Deliverable</p>
                            </div>
                            <div>
                              <span className="text-slate-400">Price Volatility Index:</span>
                              <p className={`font-bold mt-0.5 ${
                                activeCommodity.volatility === "High" ? "text-purple-600" : activeCommodity.volatility === "Medium" ? "text-amber-600" : "text-emerald-600"
                              }`}>{activeCommodity.volatility}</p>
                            </div>
                          </div>
                        </div>

                        {/* Interactive Recharts Line chart */}
                        <div className="h-[250px] w-full">
                          <ResponsiveContainer width="100%" height="100%">
                            <LineChart data={activeCommodity.history}>
                              <CartesianGrid strokeDasharray="3 3" stroke="#e2e8f0" />
                              <XAxis dataKey="date" stroke="#64748b" fontSize={10} />
                              <YAxis stroke="#64748b" fontSize={10} domain={["auto", "auto"]} tickFormatter={(val) => val.toLocaleString()} />
                              <Tooltip
                                contentStyle={{ background: "#ffffff", border: "1px solid #e2e8f0", borderRadius: "8px", fontSize: "11px", color: "#1e293b" }}
                                formatter={(val) => [`$${Number(val).toLocaleString()}`, "Price"]}
                              />
                              <Line
                                type="monotone"
                                dataKey="price"
                                stroke="#4f46e5"
                                strokeWidth={2.5}
                                dot={{ fill: "#4f46e5", r: 3 }}
                                activeDot={{ r: 5 }}
                              />
                            </LineChart>
                          </ResponsiveContainer>
                        </div>

                        {/* Forecast Quarter timeline */}
                        <div className="space-y-3">
                          <h4 className="text-[10px] font-mono font-bold text-slate-400 uppercase tracking-wider">Exchange Futures Outlook (LME Q-Forecasts)</h4>
                          
                          <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
                            {activeCommodity.forecast.map((fc, i) => {
                              const isBull = fc.signal === "up";
                              return (
                                <div key={i} className="bg-white p-3 rounded-lg border border-slate-200 flex flex-col justify-between shadow-sm">
                                  <span className="text-[10px] text-slate-400 font-bold">{fc.period}</span>
                                  <div className="flex justify-between items-baseline mt-2">
                                    <span className="text-xs font-bold text-slate-800 font-mono">${fc.price.toLocaleString()}</span>
                                    <span className={`text-[9px] font-bold font-mono flex items-center ${isBull ? "text-emerald-600" : "text-rose-600"}`}>
                                      {isBull ? "+" : ""}{fc.change}%
                                    </span>
                                  </div>
                                </div>
                              );
                            })}
                          </div>
                        </div>

                      </div>
                    </div>
                  </div>
                </div>
              )}

              {activeTab === "risks" && (
                <GeopoliticalRisks
                  materials={materials}
                  riskCatalog={riskCatalog}
                />
              )}

              {activeTab === "strategy" && (
                <StrategyAdvisory
                  materials={materials}
                  rates={simulationRates}
                  onRefreshReport={handleRefreshReport}
                  strategyMemo={strategyMemo}
                  isGenerating={isGenerating}
                />
              )}

              {activeTab === "backend_sheet" && (
                <BackendSheetsView
                  materials={materials}
                  commodities={commodities}
                  onUpdateMaterials={handleUpdateMaterialsList}
                  activeIndustry={activeIndustry}
                />
              )}

              {activeTab === "bp_eval" && (
                <BPEvaluationPanel industry={activeIndustry} expanded />
              )}

              {activeTab === "global_clients" && (
                <GlobalClientsPanel />
              )}

              {activeTab === "proc_scenarios" && (
                <ProcurementScenariosPanel />
              )}

              {activeTab === "scenario_map" && (
                <ScenarioRelationshipViewer />
              )}
            </div>
          </div>
        </main>
      )}

      {/* ── Tech Stack Modal ─────────────────────────────────────────────── */}
      {showTechInfo && (
        <div className="fixed inset-0 z-[200] bg-black/60 backdrop-blur-sm flex items-center justify-center p-4" onClick={() => setShowTechInfo(false)}>
          <div className="bg-white rounded-2xl shadow-2xl w-full max-w-3xl max-h-[90vh] overflow-y-auto" onClick={e => e.stopPropagation()}>
            <div className="sticky top-0 bg-indigo-700 px-6 py-4 flex items-center justify-between rounded-t-2xl">
              <div className="flex items-center gap-3">
                <Code2 className="w-5 h-5 text-indigo-200" />
                <div>
                  <h2 className="text-white font-bold text-base">Tech Stack — Page 1</h2>
                  <p className="text-indigo-200 text-[11px]">SAP Commodity Procurement Intelligence — Full Software Reference</p>
                </div>
              </div>
              <button onClick={() => setShowTechInfo(false)} className="text-white/70 hover:text-white transition cursor-pointer">
                <X className="w-5 h-5" />
              </button>
            </div>
            <div className="p-6 space-y-6 text-sm">

              {/* Frontend */}
              <section>
                <div className="flex items-center gap-2 mb-3">
                  <Layout className="w-4 h-4 text-indigo-600" />
                  <h3 className="text-xs font-bold text-slate-500 uppercase tracking-wider">Frontend</h3>
                </div>
                <div className="grid grid-cols-2 gap-3">
                  {[
                    { name: "React 19", desc: "UI framework with hooks & concurrent mode" },
                    { name: "TypeScript 5.8", desc: "Full static typing across all components" },
                    { name: "Vite 6", desc: "Lightning-fast HMR dev server & bundler" },
                    { name: "Tailwind CSS 4", desc: "Utility-first responsive styling" },
                    { name: "Recharts 3.9", desc: "LME/NYMEX commodity line charts" },
                    { name: "Lucide React", desc: "Icon system (546+ SVG icons)" },
                  ].map(t => (
                    <div key={t.name} className="bg-indigo-50 rounded-lg p-3 border border-indigo-100">
                      <p className="font-bold text-indigo-800 text-xs">{t.name}</p>
                      <p className="text-[11px] text-slate-500 mt-0.5">{t.desc}</p>
                    </div>
                  ))}
                </div>
              </section>

              {/* Backend */}
              <section>
                <div className="flex items-center gap-2 mb-3">
                  <Server className="w-4 h-4 text-indigo-600" />
                  <h3 className="text-xs font-bold text-slate-500 uppercase tracking-wider">Backend</h3>
                </div>
                <div className="grid grid-cols-2 gap-3">
                  {[
                    { name: "Express 4.21", desc: "Node.js REST API server on port 3000" },
                    { name: "tsx (TypeScript)", desc: "Zero-config TS execution for server.ts" },
                    { name: "ExcelJS 4.4", desc: "Reads SAP industry Excel workbooks" },
                    { name: "xlsx 0.18", desc: "Secondary XLS parsing for material master" },
                    { name: "dotenv 17", desc: "Secure .env.local config injection" },
                    { name: "esbuild", desc: "Production CJS bundle builder" },
                  ].map(t => (
                    <div key={t.name} className="bg-slate-50 rounded-lg p-3 border border-slate-200">
                      <p className="font-bold text-slate-800 text-xs">{t.name}</p>
                      <p className="text-[11px] text-slate-500 mt-0.5">{t.desc}</p>
                    </div>
                  ))}
                </div>
              </section>

              {/* AI */}
              <section>
                <div className="flex items-center gap-2 mb-3">
                  <Zap className="w-4 h-4 text-indigo-600" />
                  <h3 className="text-xs font-bold text-slate-500 uppercase tracking-wider">AI / Intelligence</h3>
                </div>
                <div className="grid grid-cols-2 gap-3">
                  {[
                    { name: "Google Gemini 2.0 Flash", desc: "Strategy advisor & BOM commodity mapping" },
                    { name: "IBM WatsonX (Granite)", desc: "Enterprise fallback AI for procurement" },
                    { name: "Yahoo Finance API", desc: "Live LME/NYMEX price refresh (no key)" },
                    { name: "Offline Fallback Mode", desc: "Static data when API quota exceeded" },
                  ].map(t => (
                    <div key={t.name} className="bg-yellow-50 rounded-lg p-3 border border-yellow-100">
                      <p className="font-bold text-yellow-800 text-xs">{t.name}</p>
                      <p className="text-[11px] text-slate-500 mt-0.5">{t.desc}</p>
                    </div>
                  ))}
                </div>
              </section>

              {/* Data */}
              <section>
                <div className="flex items-center gap-2 mb-3">
                  <Database className="w-4 h-4 text-indigo-600" />
                  <h3 className="text-xs font-bold text-slate-500 uppercase tracking-wider">Data Layer</h3>
                </div>
                <div className="grid grid-cols-2 gap-3">
                  {[
                    { name: "10 Industry Workbooks", desc: "Excel master_data.xlsx per SAP client" },
                    { name: "48 Client Profiles", desc: "Enterprise procurement scenario configs" },
                    { name: "SAP Material Master", desc: "MARA/KONP/MARC table simulation" },
                    { name: "Geopolitical Risk Catalog", desc: "Country-level risk scoring engine" },
                  ].map(t => (
                    <div key={t.name} className="bg-emerald-50 rounded-lg p-3 border border-emerald-100">
                      <p className="font-bold text-emerald-800 text-xs">{t.name}</p>
                      <p className="text-[11px] text-slate-500 mt-0.5">{t.desc}</p>
                    </div>
                  ))}
                </div>
              </section>

              <div className="flex justify-center pt-2">
                <button onClick={() => setShowTechInfo(false)} className="px-8 py-2.5 bg-indigo-600 hover:bg-indigo-700 text-white text-xs font-bold rounded-lg transition cursor-pointer">
                  Close
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* ── How to Install Modal ──────────────────────────────────────────── */}
      {showInstall && (
        <div className="fixed inset-0 z-[200] bg-black/60 backdrop-blur-sm flex items-center justify-center p-4" onClick={() => setShowInstall(false)}>
          <div className="bg-white rounded-2xl shadow-2xl w-full max-w-2xl max-h-[90vh] overflow-y-auto" onClick={e => e.stopPropagation()}>
            <div className="sticky top-0 bg-indigo-700 px-6 py-4 flex items-center justify-between rounded-t-2xl">
              <div className="flex items-center gap-3">
                <Package className="w-5 h-5 text-indigo-200" />
                <div>
                  <h2 className="text-white font-bold text-base">How to Install &amp; Run</h2>
                  <p className="text-indigo-200 text-[11px]">ComX v2 — SAP Commodity Intelligence · Page 1</p>
                </div>
              </div>
              <button onClick={() => setShowInstall(false)} className="text-white/70 hover:text-white transition cursor-pointer">
                <X className="w-5 h-5" />
              </button>
            </div>
            <div className="p-6 space-y-5 text-sm">

              <section>
                <div className="flex items-center gap-2 mb-2">
                  <Shield className="w-4 h-4 text-indigo-600" />
                  <h3 className="text-xs font-bold text-slate-500 uppercase tracking-wider">Prerequisites</h3>
                </div>
                <div className="bg-slate-50 border border-slate-200 rounded-lg p-3 space-y-1 text-[12px] text-slate-600">
                  <p>• <strong>Node.js</strong> v18 or higher</p>
                  <p>• <strong>npm</strong> v9 or higher</p>
                  <p>• A <strong>Google Gemini API key</strong> (free tier available at ai.google.dev)</p>
                </div>
              </section>

              {[
                { n: "1", title: "Clone or unzip the project", cmd: "cd C:\\Users\\Sabirunnisa\\NEWAPP\\gold-market-intelligence\\ComX" },
                { n: "2", title: "Install dependencies", cmd: "npm install" },
                { n: "3", title: "Create environment file", cmd: "copy .env.example .env.local\n# Then edit .env.local and set your GEMINI_API_KEY" },
                { n: "4", title: "Start the development server", cmd: "npm run dev" },
                { n: "5", title: "Open in browser", cmd: "http://localhost:3000" },
                { n: "6", title: "(Optional) Seed industry data", cmd: "npx tsx scripts/seedIndustryData.ts" },
              ].map(step => (
                <section key={step.n}>
                  <div className="flex items-center gap-2 mb-2">
                    <span className="w-5 h-5 rounded-full bg-indigo-600 text-white text-[10px] font-bold flex items-center justify-center flex-shrink-0">{step.n}</span>
                    <h3 className="text-xs font-bold text-slate-700">{step.title}</h3>
                  </div>
                  <pre className="bg-slate-900 text-green-400 text-[11px] font-mono px-4 py-3 rounded-lg overflow-x-auto whitespace-pre-wrap">{step.cmd}</pre>
                </section>
              ))}

              <section>
                <div className="flex items-center gap-2 mb-2">
                  <Server className="w-4 h-4 text-indigo-600" />
                  <h3 className="text-xs font-bold text-slate-500 uppercase tracking-wider">Stopping the Server</h3>
                </div>
                <div className="bg-slate-50 border border-slate-200 rounded-lg p-3">
                  <p className="text-[11px] text-slate-500">In the terminal where the server is running, press:</p>
                  <code className="block bg-slate-900 text-yellow-400 text-[11px] font-mono px-3 py-2 rounded-lg mt-2">Ctrl + C</code>
                </div>
              </section>

              <div className="flex justify-center pt-2">
                <button onClick={() => setShowInstall(false)} className="px-8 py-2.5 bg-indigo-600 hover:bg-indigo-700 text-white text-xs font-bold rounded-lg transition cursor-pointer">
                  Close
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Footer credits and information */}
      <footer className="border-t border-slate-200 bg-white px-6 py-8 text-center text-xs text-slate-500">
        <p>© 2026 SAP Supply Chain Commodity Integration Module. All rights reserved.</p>
        <p className="mt-1">
          Designed for principal SAP material master analysis, weight estimations, and hedge forecasting. {activeIndustryObj?.label ?? activeIndustry} industry simulation mode active.
        </p>
        {/* Footer action buttons */}
        <div className="flex items-center justify-center gap-3 mt-5">
          <button
            onClick={() => setShowInstall(true)}
            className="flex items-center gap-2 px-5 py-2.5 bg-indigo-600 hover:bg-indigo-700 text-white text-xs font-bold rounded-xl shadow transition cursor-pointer"
          >
            <Package className="w-4 h-4" />
            How to Install &amp; Run This App
          </button>
          <button
            onClick={() => setShowTechInfo(true)}
            className="flex items-center gap-2 px-5 py-2.5 bg-white hover:bg-indigo-50 text-indigo-700 text-xs font-semibold border border-indigo-200 rounded-xl shadow-sm transition cursor-pointer"
          >
            <Info className="w-4 h-4" />
            Tech Stack
          </button>
        </div>
      </footer>

    </div>
  );
}
