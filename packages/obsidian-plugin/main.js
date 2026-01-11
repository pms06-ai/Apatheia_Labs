/*
Phronesis - Forensic Document Analysis for Obsidian
Built by Apatheia Labs
*/

var __defProp = Object.defineProperty;
var __getOwnPropDesc = Object.getOwnPropertyDescriptor;
var __getOwnPropNames = Object.getOwnPropertyNames;
var __hasOwnProp = Object.prototype.hasOwnProperty;
var __export = (target, all) => {
  for (var name in all)
    __defProp(target, name, { get: all[name], enumerable: true });
};
var __copyProps = (to, from, except, desc) => {
  if (from && typeof from === "object" || typeof from === "function") {
    for (let key of __getOwnPropNames(from))
      if (!__hasOwnProp.call(to, key) && key !== except)
        __defProp(to, key, { get: () => from[key], enumerable: !(desc = __getOwnPropDesc(from, key)) || desc.enumerable });
  }
  return to;
};
var __toCommonJS = (mod) => __copyProps(__defProp({}, "__esModule", { value: true }), mod);

// src/main.ts
var main_exports = {};
__export(main_exports, {
  default: () => PhronesisPlugin
});
module.exports = __toCommonJS(main_exports);
var import_obsidian4 = require("obsidian");

// src/services/api-client.ts
var import_obsidian = require("obsidian");
var PhronesisApiClient = class {
  endpoint;
  timeout;
  constructor(config) {
    this.endpoint = config.endpoint.replace(/\/$/, "");
    this.timeout = config.timeout;
  }
  /**
   * Check if server is available
   */
  async checkStatus() {
    try {
      const response = await this.request("GET", "/api/status");
      return response?.status === "ok";
    } catch {
      return false;
    }
  }
  /**
   * Get list of available engines
   */
  async getEngines() {
    const response = await this.request("GET", "/api/engines");
    return response?.engines || [];
  }
  /**
   * Analyze content for contradictions
   */
  async analyzeContradictions(content, documentIds, caseId, cascadeTypes) {
    return this.analyze("contradictions", {
      content,
      document_ids: documentIds,
      case_id: caseId,
      cascade_types: cascadeTypes
    });
  }
  /**
   * Analyze for omissions
   */
  async analyzeOmissions(content, sourceDocIds, targetDocIds, caseId) {
    return this.analyze("omissions", {
      content,
      source_document_ids: sourceDocIds,
      target_document_ids: targetDocIds,
      case_id: caseId
    });
  }
  /**
   * Analyze for bias
   */
  async analyzeBias(content, documentIds, caseId) {
    return this.analyze("bias", {
      content,
      document_ids: documentIds,
      case_id: caseId
    });
  }
  /**
   * Entity resolution
   */
  async analyzeEntities(content, documentIds, caseId) {
    return this.analyze("entities", {
      content,
      document_ids: documentIds,
      case_id: caseId
    });
  }
  /**
   * Timeline analysis
   */
  async analyzeTimeline(content, documentIds, caseId) {
    return this.analyze("timeline", {
      content,
      document_ids: documentIds,
      case_id: caseId
    });
  }
  /**
   * Run S.A.M. pipeline
   */
  async runSAMPipeline(caseId, content, documentIds, startPhase) {
    return this.analyze("sam", {
      content,
      document_ids: documentIds,
      case_id: caseId,
      start_phase: startPhase
    });
  }
  /**
   * Analyze content with any engine
   */
  async analyzeContent(engine, content, caseId) {
    return this.analyze(engine, { content, case_id: caseId });
  }
  /**
   * Generic analysis endpoint
   */
  async analyze(engine, params) {
    return this.request("POST", `/api/analyze/${engine}`, params);
  }
  /**
   * Make HTTP request
   */
  async request(method, path, body) {
    const url = `${this.endpoint}${path}`;
    const options = {
      url,
      method,
      headers: {
        "Content-Type": "application/json"
      }
    };
    if (body) {
      options.body = JSON.stringify(body);
    }
    try {
      const response = await (0, import_obsidian.requestUrl)(options);
      if (response.status >= 400) {
        const error = response.json?.error || `HTTP ${response.status}`;
        throw new Error(error);
      }
      return response.json;
    } catch (error) {
      if (error instanceof Error) {
        throw error;
      }
      throw new Error(`Request failed: ${String(error)}`);
    }
  }
};

// src/settings.ts
var import_obsidian2 = require("obsidian");
var DEFAULT_SETTINGS = {
  apiEndpoint: "http://localhost:3847",
  defaultEngines: ["contradiction", "omission", "bias"],
  inlineAnnotations: true,
  autoAnalyze: false,
  severityThreshold: "medium",
  caseId: "",
  connectionTimeout: 3e4
};
var PhronesisSettingTab = class extends import_obsidian2.PluginSettingTab {
  plugin;
  constructor(app, plugin) {
    super(app, plugin);
    this.plugin = plugin;
  }
  display() {
    const { containerEl } = this;
    containerEl.empty();
    containerEl.createEl("h2", { text: "Phronesis Settings" });
    containerEl.createEl("h3", { text: "Connection" });
    new import_obsidian2.Setting(containerEl).setName("API Endpoint").setDesc("URL of the Phronesis analysis server").addText(
      (text) => text.setPlaceholder("http://localhost:3847").setValue(this.plugin.settings.apiEndpoint).onChange(async (value) => {
        this.plugin.settings.apiEndpoint = value;
        await this.plugin.saveSettings();
      })
    );
    new import_obsidian2.Setting(containerEl).setName("Connection Timeout").setDesc("Timeout in milliseconds for API requests").addText(
      (text) => text.setPlaceholder("30000").setValue(String(this.plugin.settings.connectionTimeout)).onChange(async (value) => {
        const num = parseInt(value, 10);
        if (!isNaN(num) && num > 0) {
          this.plugin.settings.connectionTimeout = num;
          await this.plugin.saveSettings();
        }
      })
    );
    new import_obsidian2.Setting(containerEl).setName("Test Connection").setDesc("Check if the Phronesis server is running").addButton(
      (button) => button.setButtonText("Test").onClick(async () => {
        button.setButtonText("Testing...");
        const connected = await this.plugin.apiClient.checkStatus();
        button.setButtonText(connected ? "Connected!" : "Failed");
        setTimeout(() => button.setButtonText("Test"), 2e3);
      })
    );
    containerEl.createEl("h3", { text: "Case Configuration" });
    new import_obsidian2.Setting(containerEl).setName("Current Case ID").setDesc("Case identifier for storing analysis results").addText(
      (text) => text.setPlaceholder("PE23C50095").setValue(this.plugin.settings.caseId).onChange(async (value) => {
        this.plugin.settings.caseId = value;
        await this.plugin.saveSettings();
      })
    );
    containerEl.createEl("h3", { text: "Analysis" });
    new import_obsidian2.Setting(containerEl).setName("Default Engines").setDesc("Engines to run by default (comma-separated)").addText(
      (text) => text.setPlaceholder("contradiction, omission, bias").setValue(this.plugin.settings.defaultEngines.join(", ")).onChange(async (value) => {
        this.plugin.settings.defaultEngines = value.split(",").map((e) => e.trim()).filter((e) => e);
        await this.plugin.saveSettings();
      })
    );
    new import_obsidian2.Setting(containerEl).setName("Severity Threshold").setDesc("Only show findings at or above this severity").addDropdown(
      (dropdown) => dropdown.addOption("low", "Low").addOption("medium", "Medium").addOption("high", "High").addOption("critical", "Critical").setValue(this.plugin.settings.severityThreshold).onChange(async (value) => {
        this.plugin.settings.severityThreshold = value;
        await this.plugin.saveSettings();
      })
    );
    containerEl.createEl("h3", { text: "Display" });
    new import_obsidian2.Setting(containerEl).setName("Inline Annotations").setDesc("Show analysis findings as inline callouts").addToggle(
      (toggle) => toggle.setValue(this.plugin.settings.inlineAnnotations).onChange(async (value) => {
        this.plugin.settings.inlineAnnotations = value;
        await this.plugin.saveSettings();
      })
    );
    new import_obsidian2.Setting(containerEl).setName("Auto-Analyze").setDesc("Automatically analyze documents on save").addToggle(
      (toggle) => toggle.setValue(this.plugin.settings.autoAnalyze).onChange(async (value) => {
        this.plugin.settings.autoAnalyze = value;
        await this.plugin.saveSettings();
      })
    );
  }
};

// src/views/results-view.ts
var import_obsidian3 = require("obsidian");
var VIEW_TYPE_RESULTS = "phronesis-results-view";
var ResultsView = class extends import_obsidian3.ItemView {
  plugin;
  currentDocument = "";
  results = {};
  constructor(leaf, plugin) {
    super(leaf);
    this.plugin = plugin;
  }
  getViewType() {
    return VIEW_TYPE_RESULTS;
  }
  getDisplayText() {
    return "Phronesis Results";
  }
  getIcon() {
    return "search";
  }
  async onOpen() {
    const container = this.containerEl.children[1];
    container.empty();
    container.addClass("phronesis-results");
    this.renderContent(container);
  }
  async onClose() {
  }
  /**
   * Set analysis results
   */
  setResults(documentName, results) {
    this.currentDocument = documentName;
    this.results = results;
    const container = this.containerEl.children[1];
    container.empty();
    this.renderContent(container);
  }
  /**
   * Render the view content
   */
  renderContent(container) {
    const header = container.createDiv({ cls: "phronesis-header" });
    header.createEl("h4", { text: "Phronesis Analysis" });
    const statusDiv = header.createDiv({ cls: "phronesis-status" });
    this.renderStatus(statusDiv);
    if (this.currentDocument) {
      const docInfo = container.createDiv({ cls: "phronesis-doc-info" });
      docInfo.createEl("strong", { text: "Document: " });
      docInfo.createEl("span", { text: this.currentDocument });
    }
    if (Object.keys(this.results).length > 0) {
      this.renderResults(container);
    } else {
      const empty = container.createDiv({ cls: "phronesis-empty" });
      empty.createEl("p", { text: "No analysis results yet." });
      empty.createEl("p", { text: 'Use Command Palette (Ctrl/Cmd+P) and search for "Phronesis" to run analysis.' });
    }
    this.renderActions(container);
  }
  /**
   * Render server status
   */
  async renderStatus(container) {
    container.empty();
    container.createEl("span", { text: "Checking..." });
    const connected = await this.plugin.apiClient.checkStatus();
    container.empty();
    const indicator = container.createSpan({
      cls: `phronesis-status-indicator ${connected ? "connected" : "disconnected"}`
    });
    container.createEl("span", { text: connected ? "Connected" : "Disconnected" });
  }
  /**
   * Render analysis results
   */
  renderResults(container) {
    const resultsDiv = container.createDiv({ cls: "phronesis-results-list" });
    for (const [engine, result] of Object.entries(this.results)) {
      const engineDiv = resultsDiv.createDiv({ cls: "phronesis-engine-result" });
      const engineHeader = engineDiv.createDiv({ cls: "phronesis-engine-header" });
      engineHeader.createEl("strong", {
        text: this.formatEngineName(engine),
        cls: "phronesis-engine-name"
      });
      this.renderEngineSummary(engineDiv, engine, result);
      const detailsBtn = engineHeader.createEl("button", {
        text: "Details",
        cls: "phronesis-details-btn"
      });
      const detailsDiv = engineDiv.createDiv({ cls: "phronesis-engine-details" });
      const pre = detailsDiv.createEl("pre");
      pre.createEl("code", { text: JSON.stringify(result, null, 2) });
      detailsBtn.onclick = () => {
        const isVisible = detailsDiv.hasClass("visible");
        detailsDiv.toggleClass("visible", !isVisible);
        detailsBtn.textContent = isVisible ? "Details" : "Hide";
      };
    }
  }
  /**
   * Render engine-specific summary
   */
  renderEngineSummary(container, engine, result) {
    const summary = result.summary;
    if (!summary) {
      if (result.error) {
        container.createEl("p", {
          text: `Error: ${result.error}`,
          cls: "phronesis-severity-critical"
        });
      }
      return;
    }
    const summaryDiv = container.createDiv({ cls: "phronesis-summary" });
    switch (engine) {
      case "contradiction":
        this.renderContradictionSummary(summaryDiv, summary);
        break;
      case "omission":
        this.renderOmissionSummary(summaryDiv, summary);
        break;
      case "bias":
        this.renderBiasSummary(summaryDiv, summary, result);
        break;
      default:
        for (const [key, value] of Object.entries(summary)) {
          const item = summaryDiv.createDiv({ cls: "phronesis-summary-item" });
          item.createEl("span", { text: `${this.formatKey(key)}: ` });
          item.createEl("strong", { text: String(value) });
        }
    }
  }
  renderContradictionSummary(container, summary) {
    const total = summary.totalContradictions || 0;
    const critical = summary.criticalCount || 0;
    const impact = summary.credibilityImpact || "none";
    const line1 = container.createDiv({ cls: "phronesis-summary-item" });
    line1.createEl("span", { text: "Contradictions: " });
    line1.createEl("strong", { text: String(total) });
    if (critical > 0) {
      line1.createEl("span", {
        text: ` (${critical} critical)`,
        cls: "phronesis-severity-critical"
      });
    }
    const line2 = container.createDiv({ cls: "phronesis-summary-item" });
    line2.createEl("span", { text: "Credibility Impact: " });
    line2.createEl("strong", {
      text: impact,
      cls: impact === "severe" ? "phronesis-severity-critical" : impact === "moderate" ? "phronesis-severity-high" : "phronesis-severity-low"
    });
  }
  renderOmissionSummary(container, summary) {
    const total = summary.totalOmissions || 0;
    const direction = summary.overallBiasDirection || "neutral";
    const line1 = container.createDiv({ cls: "phronesis-summary-item" });
    line1.createEl("span", { text: "Omissions: " });
    line1.createEl("strong", { text: String(total) });
    const line2 = container.createDiv({ cls: "phronesis-summary-item" });
    line2.createEl("span", { text: "Bias Direction: " });
    line2.createEl("strong", {
      text: direction,
      cls: direction !== "neutral" ? "phronesis-severity-high" : "phronesis-severity-low"
    });
  }
  renderBiasSummary(container, summary, result) {
    const bias = summary.overallBias || "none";
    const direction = summary.direction || "balanced";
    const framingRatio = result.framingRatio || 1;
    const line1 = container.createDiv({ cls: "phronesis-summary-item" });
    line1.createEl("span", { text: "Framing Ratio: " });
    line1.createEl("strong", { text: `${framingRatio}:1` });
    const line2 = container.createDiv({ cls: "phronesis-summary-item" });
    line2.createEl("span", { text: "Overall Bias: " });
    line2.createEl("strong", {
      text: `${bias} (${direction})`,
      cls: bias === "strong" ? "phronesis-severity-critical" : bias === "moderate" ? "phronesis-severity-high" : "phronesis-severity-low"
    });
  }
  /**
   * Render action buttons
   */
  renderActions(container) {
    const actionsDiv = container.createDiv({ cls: "phronesis-actions" });
    const analyzeBtn = actionsDiv.createEl("button", { text: "Analyze Current Document" });
    analyzeBtn.onclick = async () => {
      const file = this.app.workspace.getActiveFile();
      if (file) {
        await this.plugin.analyzeDocument(file);
      }
    };
    const samBtn = actionsDiv.createEl("button", { text: "Run S.A.M." });
    samBtn.onclick = () => {
      this.plugin.runSAMPipeline();
    };
  }
  /**
   * Format engine name for display
   */
  formatEngineName(engine) {
    const names = {
      contradiction: "Contradiction (\u039A)",
      omission: "Omission (\u039F)",
      bias: "Bias (\u0392)",
      entity: "Entity Resolution (\u0395)",
      timeline: "Timeline (\u03A4)",
      argumentation: "Argumentation (\u0391)",
      accountability: "Accountability (\u039B)",
      professional: "Professional Tracker (\u03A0)",
      expert_witness: "Expert Witness (\u039E)",
      documentary: "Documentary (\u0394)",
      narrative: "Narrative (\u039C)",
      coordination: "Coordination (\u03A3)",
      sam_pipeline: "S.A.M. Pipeline"
    };
    return names[engine] || engine;
  }
  /**
   * Format key for display
   */
  formatKey(key) {
    return key.replace(/_/g, " ").replace(/([A-Z])/g, " $1").replace(/^./, (str) => str.toUpperCase()).trim();
  }
};

// src/main.ts
var PhronesisPlugin = class extends import_obsidian4.Plugin {
  settings;
  apiClient;
  async onload() {
    await this.loadSettings();
    this.apiClient = new PhronesisApiClient({
      endpoint: this.settings.apiEndpoint,
      timeout: this.settings.connectionTimeout
    });
    this.registerView(VIEW_TYPE_RESULTS, (leaf) => new ResultsView(leaf, this));
    this.addRibbonIcon("search", "Phronesis Analysis", () => {
      this.activateResultsView();
    });
    this.addCommand({
      id: "analyze-selection-contradictions",
      name: "Analyze selection for contradictions",
      editorCallback: (editor, view) => {
        this.analyzeSelection(editor, "contradiction");
      }
    });
    this.addCommand({
      id: "analyze-selection-omissions",
      name: "Analyze selection for omissions",
      editorCallback: (editor, view) => {
        this.analyzeSelection(editor, "omission");
      }
    });
    this.addCommand({
      id: "analyze-selection-bias",
      name: "Analyze selection for bias",
      editorCallback: (editor, view) => {
        this.analyzeSelection(editor, "bias");
      }
    });
    this.addCommand({
      id: "analyze-document-full",
      name: "Run full analysis on current document",
      callback: async () => {
        const file = this.app.workspace.getActiveFile();
        if (file) {
          await this.analyzeDocument(file);
        } else {
          new import_obsidian4.Notice("No active document");
        }
      }
    });
    this.addCommand({
      id: "run-sam-pipeline",
      name: "Run S.A.M. Pipeline",
      callback: () => {
        this.runSAMPipeline();
      }
    });
    this.addCommand({
      id: "show-results-panel",
      name: "Show Phronesis Results Panel",
      callback: () => {
        this.activateResultsView();
      }
    });
    this.addCommand({
      id: "check-server-status",
      name: "Check Phronesis Server Status",
      callback: async () => {
        const connected = await this.apiClient.checkStatus();
        new import_obsidian4.Notice(connected ? "Phronesis server connected" : "Phronesis server not available");
      }
    });
    this.addSettingTab(new PhronesisSettingTab(this.app, this));
    this.registerEvent(
      this.app.workspace.on("editor-menu", (menu, editor, view) => {
        if (editor.getSelection()) {
          menu.addItem((item) => {
            item.setTitle("Phronesis: Analyze Selection").setIcon("search").onClick(() => this.analyzeSelection(editor, "contradiction"));
          });
        }
      })
    );
    this.setupAutoAnalyze();
    console.log("Phronesis plugin loaded");
  }
  /**
   * Setup auto-analyze on file save
   */
  setupAutoAnalyze() {
    if (!this.settings.autoAnalyze) return;
    let debounceTimer = null;
    this.registerEvent(
      this.app.vault.on("modify", (file) => {
        if (!(file instanceof import_obsidian4.TFile) || file.extension !== "md") return;
        if (debounceTimer) {
          clearTimeout(debounceTimer);
        }
        debounceTimer = setTimeout(async () => {
          const activeFile = this.app.workspace.getActiveFile();
          if (activeFile && activeFile.path === file.path) {
            await this.analyzeDocument(file);
          }
        }, 2e3);
      })
    );
  }
  onunload() {
    console.log("Phronesis plugin unloaded");
  }
  async loadSettings() {
    this.settings = Object.assign({}, DEFAULT_SETTINGS, await this.loadData());
  }
  async saveSettings() {
    await this.saveData(this.settings);
    this.apiClient = new PhronesisApiClient({
      endpoint: this.settings.apiEndpoint,
      timeout: this.settings.connectionTimeout
    });
  }
  /**
   * Activate the results sidebar view
   */
  async activateResultsView() {
    const { workspace } = this.app;
    let leaf = workspace.getLeavesOfType(VIEW_TYPE_RESULTS)[0];
    if (!leaf) {
      const rightLeaf = workspace.getRightLeaf(false);
      if (rightLeaf) {
        await rightLeaf.setViewState({ type: VIEW_TYPE_RESULTS, active: true });
        leaf = rightLeaf;
      }
    }
    if (leaf) {
      workspace.revealLeaf(leaf);
    }
  }
  /**
   * Analyze selected text
   */
  async analyzeSelection(editor, engine) {
    const selection = editor.getSelection();
    if (!selection) {
      new import_obsidian4.Notice("No text selected");
      return;
    }
    new import_obsidian4.Notice(`Analyzing with ${engine} engine...`);
    try {
      const result = await this.apiClient.analyzeContent(
        engine,
        selection,
        this.settings.caseId || void 0
      );
      new AnalysisResultModal(this.app, engine, result).open();
      if (this.settings.inlineAnnotations) {
        this.insertResultAsCallout(editor, engine, result);
      }
    } catch (error) {
      new import_obsidian4.Notice(`Analysis failed: ${error.message}`);
    }
  }
  /**
   * Analyze entire document
   */
  async analyzeDocument(file) {
    new import_obsidian4.Notice(`Analyzing ${file.name}...`);
    try {
      const content = await this.app.vault.read(file);
      const results = {};
      for (const engine of this.settings.defaultEngines) {
        try {
          const result = await this.apiClient.analyzeContent(
            engine,
            content,
            this.settings.caseId || void 0
          );
          results[engine] = result;
        } catch (error) {
          results[engine] = { error: error.message };
        }
      }
      const leaves = this.app.workspace.getLeavesOfType(VIEW_TYPE_RESULTS);
      if (leaves.length > 0) {
        const view = leaves[0].view;
        view.setResults(file.name, results);
      }
      new import_obsidian4.Notice(`Analysis complete for ${file.name}`);
    } catch (error) {
      new import_obsidian4.Notice(`Analysis failed: ${error.message}`);
    }
  }
  /**
   * Run S.A.M. pipeline
   */
  async runSAMPipeline() {
    if (!this.settings.caseId) {
      new import_obsidian4.Notice("Please set a Case ID in settings first");
      return;
    }
    new import_obsidian4.Notice("Running S.A.M. Pipeline...");
    try {
      const activeFile = this.app.workspace.getActiveFile();
      let content;
      if (activeFile) {
        content = await this.app.vault.read(activeFile);
      }
      const result = await this.apiClient.runSAMPipeline(
        this.settings.caseId,
        content
      );
      new AnalysisResultModal(this.app, "S.A.M. Pipeline", result).open();
    } catch (error) {
      new import_obsidian4.Notice(`S.A.M. Pipeline failed: ${error.message}`);
    }
  }
  /**
   * Insert analysis result as callout
   */
  insertResultAsCallout(editor, engine, result) {
    const calloutType = this.getCalloutType(result);
    const summary = this.summarizeResult(result);
    const callout = `
> [!${calloutType}] Phronesis: ${engine}
> ${summary}
`;
    const cursor = editor.getCursor();
    editor.replaceRange(callout, cursor);
  }
  getCalloutType(result) {
    if ("summary" in result && result.summary) {
      const summary = result.summary;
      if ("criticalCount" in summary && summary.criticalCount > 0) return "danger";
      if ("totalContradictions" in summary && summary.totalContradictions > 0) return "warning";
      if ("criticalBreaches" in summary && summary.criticalBreaches > 0) return "danger";
      if ("overallBias" in summary && summary.overallBias === "strong") return "warning";
    }
    return "info";
  }
  summarizeResult(result) {
    if ("summary" in result && result.summary) {
      const summary = result.summary;
      const parts = [];
      if ("totalContradictions" in summary) {
        parts.push(`${summary.totalContradictions} contradictions`);
      }
      if ("totalOmissions" in summary) {
        parts.push(`${summary.totalOmissions} omissions`);
      }
      if ("overallBias" in summary) {
        parts.push(`Bias: ${summary.overallBias}`);
      }
      if ("totalBreaches" in summary) {
        parts.push(`${summary.totalBreaches} breaches`);
      }
      if ("totalEntities" in summary) {
        parts.push(`${summary.totalEntities} entities`);
      }
      if ("totalEvents" in summary) {
        parts.push(`${summary.totalEvents} events`);
      }
      return parts.join(", ") || "Analysis complete";
    }
    return "Analysis complete";
  }
};
var AnalysisResultModal = class extends import_obsidian4.Modal {
  engine;
  result;
  constructor(app, engine, result) {
    super(app);
    this.engine = engine;
    this.result = result;
  }
  onOpen() {
    const { contentEl } = this;
    contentEl.createEl("h2", { text: `Phronesis: ${this.engine}` });
    const pre = contentEl.createEl("pre");
    pre.style.maxHeight = "400px";
    pre.style.overflow = "auto";
    pre.style.padding = "10px";
    pre.style.background = "var(--background-secondary)";
    pre.style.borderRadius = "5px";
    pre.createEl("code", {
      text: JSON.stringify(this.result, null, 2)
    });
    const closeBtn = contentEl.createEl("button", { text: "Close" });
    closeBtn.style.marginTop = "10px";
    closeBtn.onclick = () => this.close();
  }
  onClose() {
    const { contentEl } = this;
    contentEl.empty();
  }
};
