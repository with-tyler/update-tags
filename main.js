/*
  Update Tags - Obsidian plugin (compact, single-file)
  - Commands: Add tags, Remove tags, Replace tags
  - Dry-run preview and simple scope (folder / explicit files / vault)
  - Loads `styles.css` if present next to `main.js`
*/

// Resolve Obsidian API if available
let _obs = null;
if (typeof require === 'function') {
  try { _obs = require('obsidian'); } catch (e) { _obs = null; }
}
if (!_obs && typeof globalThis !== 'undefined') _obs = globalThis.obsidian || null;

const PluginBase = _obs ? _obs.Plugin : (typeof globalThis !== 'undefined' ? globalThis.Plugin : class {});
const ModalBase = _obs ? _obs.Modal : (typeof globalThis !== 'undefined' ? globalThis.Modal : class {});
const NoticeCtor = _obs ? _obs.Notice : (typeof globalThis !== 'undefined' ? globalThis.Notice : class {});
const SettingCtor = _obs ? _obs.Setting : null;
const PluginSettingTabCtor = _obs ? _obs.PluginSettingTab : null;

class UpdateTagsPlugin extends PluginBase {
  async onload() {
    await this.loadSettings();
    this.injectStyles();

    this.addCommand({ id: 'update-tags-modify', name: 'Modify Tags', callback: () => new ModifyTagsModal(this.app, this).open() });

    // Add ribbon icon if enabled
    if (this.settings.showRibbonIcon) {
      this.ribbonIcon = this.addRibbonIcon('tag', 'Modify Tags', () => {
        new ModifyTagsModal(this.app, this).open();
      });
    }

    if (PluginSettingTabCtor && SettingCtor) {
      try { this.addSettingTab(new UpdateTagsSettingTab(this.app, this)); } catch (e) { /* ignore */ }
    }
  }

  onunload() {
    if (this.ribbonIcon) {
      this.ribbonIcon.remove();
    }
  }

  async loadSettings() {
    const defaults = { allowRootChanges: false, requireScope: true, dryRunByDefault: true, debugMode: false, showRibbonIcon: true };
    try { this.settings = Object.assign({}, defaults, await this.loadData() || {}); } catch (e) { this.settings = defaults; }
  }
  async saveSettings() { try { await this.saveData(this.settings || {}); } catch (e) {} }

  injectStyles() {
    try {
      // Use vault adapter to read styles.css directly
      const adapter = this.app?.vault?.adapter;
      if (adapter && adapter.read) {
        adapter.read('.obsidian/plugins/update-tags/styles.css')
          .then(css => {
            const s = document.createElement('style');
            s.setAttribute('data-update-tags','1');
            s.textContent = css;
            document.head.appendChild(s);
            if (this.settings?.debugMode) console.log('[Update Tags] Styles loaded successfully');
          })
          .catch((e) => {
            if (this.settings?.debugMode) console.log('[Update Tags] Could not load styles.css:', e);
          });
      }
    } catch (e) {
      console.error('Error in injectStyles:', e);
    }
  }
}

class UpdateTagsSettingTab extends (PluginSettingTabCtor || class {}) {
  constructor(app, plugin) { super(app, plugin); this.plugin = plugin; }
  display() {
    const { containerEl } = this; try { containerEl.empty(); } catch (e) { containerEl.innerHTML = ''; }
    containerEl.createEl('h2', { text: 'Update Tags Settings' });
    
    const desc = containerEl.createEl('p', { cls: 'setting-item-description' });
    desc.innerHTML = 'Configure safety settings to prevent accidental vault-wide tag changes. <strong>Recommended:</strong> Keep both options enabled for safety.';
    desc.style.marginBottom = '20px';
    desc.style.color = 'var(--text-muted)';
    
    try {
      new SettingCtor(containerEl)
        .setName('Require scope')
        .setDesc('Require a folder or file to be specified before running. Prevents accidental vault-wide operations.')
        .addToggle(t => t.setValue(this.plugin.settings.requireScope).onChange(async (v) => { this.plugin.settings.requireScope = v; await this.plugin.saveSettings(); }));
      
      new SettingCtor(containerEl)
        .setName('Allow root changes')
        .setDesc('Allow operations on entire vault when no folder/file is specified. \u26a0\ufe0f Use with caution - this can modify all files in your vault.')
        .addToggle(t => t.setValue(this.plugin.settings.allowRootChanges).onChange(async (v) => { this.plugin.settings.allowRootChanges = v; await this.plugin.saveSettings(); }));
      
      new SettingCtor(containerEl)
        .setName('Dry-run by default')
        .setDesc('Enable dry-run mode by default when opening the Modify Tags dialog. Dry-run shows a preview without making changes.')
        .addToggle(t => t.setValue(this.plugin.settings.dryRunByDefault).onChange(async (v) => { this.plugin.settings.dryRunByDefault = v; await this.plugin.saveSettings(); }));
      
      new SettingCtor(containerEl)
        .setName('Debug mode')
        .setDesc('Enable console logging for debugging. Useful for troubleshooting issues with the plugin.')
        .addToggle(t => t.setValue(this.plugin.settings.debugMode).onChange(async (v) => { this.plugin.settings.debugMode = v; await this.plugin.saveSettings(); }));
      
      new SettingCtor(containerEl)
        .setName('Show ribbon icon')
        .setDesc('Display a ribbon icon in the left sidebar to quickly open Modify Tags. Reload required after changing.')
        .addToggle(t => t.setValue(this.plugin.settings.showRibbonIcon).onChange(async (v) => { this.plugin.settings.showRibbonIcon = v; await this.plugin.saveSettings(); }));
    } catch (e) {
      const p = containerEl.createEl('div', { cls: 'setting-item' }); 
      p.style.marginBottom = '16px';
      const label1 = p.createEl('label', { text: 'Require scope' }); 
      label1.style.fontWeight = '500';
      label1.style.display = 'block';
      label1.style.marginBottom = '4px';
      const desc1 = p.createEl('div', { text: 'Require a folder or file to be specified before running.' });
      desc1.style.fontSize = '0.9em';
      desc1.style.color = 'var(--text-muted)';
      desc1.style.marginBottom = '8px';
      const i = p.createEl('input'); 
      i.type='checkbox'; 
      i.checked = !!this.plugin.settings.requireScope; 
      i.addEventListener('change', async () => { this.plugin.settings.requireScope = i.checked; await this.plugin.saveSettings(); });
      
      const p2 = containerEl.createEl('div', { cls: 'setting-item' }); 
      p2.style.marginBottom = '16px';
      const label2 = p2.createEl('label', { text: 'Allow root changes' }); 
      label2.style.fontWeight = '500';
      label2.style.display = 'block';
      label2.style.marginBottom = '4px';
      const desc2 = p2.createEl('div', { text: '\u26a0\ufe0f Allow operations on entire vault. Use with caution.' });
      desc2.style.fontSize = '0.9em';
      desc2.style.color = 'var(--text-muted)';
      desc2.style.marginBottom = '8px';
      const i2 = p2.createEl('input'); 
      i2.type='checkbox'; 
      i2.checked = !!this.plugin.settings.allowRootChanges; 
      i2.addEventListener('change', async () => { this.plugin.settings.allowRootChanges = i2.checked; await this.plugin.saveSettings(); });
      
      const p3 = containerEl.createEl('div', { cls: 'setting-item' }); 
      p3.style.marginBottom = '16px';
      const label3 = p3.createEl('label', { text: 'Dry-run by default' }); 
      label3.style.fontWeight = '500';
      label3.style.display = 'block';
      label3.style.marginBottom = '4px';
      const desc3 = p3.createEl('div', { text: 'Enable dry-run mode by default. Dry-run shows a preview without making changes.' });
      desc3.style.fontSize = '0.9em';
      desc3.style.color = 'var(--text-muted)';
      desc3.style.marginBottom = '8px';
      const i3 = p3.createEl('input'); 
      i3.type='checkbox'; 
      i3.checked = !!this.plugin.settings.dryRunByDefault; 
      i3.addEventListener('change', async () => { this.plugin.settings.dryRunByDefault = i3.checked; await this.plugin.saveSettings(); });
      
      const p4 = containerEl.createEl('div', { cls: 'setting-item' }); 
      p4.style.marginBottom = '16px';
      const label4 = p4.createEl('label', { text: 'Debug mode' }); 
      label4.style.fontWeight = '500';
      label4.style.display = 'block';
      label4.style.marginBottom = '4px';
      const desc4 = p4.createEl('div', { text: 'Enable console logging for debugging.' });
      desc4.style.fontSize = '0.9em';
      desc4.style.color = 'var(--text-muted)';
      desc4.style.marginBottom = '8px';
      const i4 = p4.createEl('input'); 
      i4.type='checkbox'; 
      i4.checked = !!this.plugin.settings.debugMode; 
      i4.addEventListener('change', async () => { this.plugin.settings.debugMode = i4.checked; await this.plugin.saveSettings(); });
      
      const p5 = containerEl.createEl('div', { cls: 'setting-item' }); 
      p5.style.marginBottom = '16px';
      const label5 = p5.createEl('label', { text: 'Show ribbon icon' }); 
      label5.style.fontWeight = '500';
      label5.style.display = 'block';
      label5.style.marginBottom = '4px';
      const desc5 = p5.createEl('div', { text: 'Display a ribbon icon in the left sidebar. Reload required after changing.' });
      desc5.style.fontSize = '0.9em';
      desc5.style.color = 'var(--text-muted)';
      desc5.style.marginBottom = '8px';
      const i5 = p5.createEl('input'); 
      i5.type='checkbox'; 
      i5.checked = !!this.plugin.settings.showRibbonIcon; 
      i5.addEventListener('change', async () => { this.plugin.settings.showRibbonIcon = i5.checked; await this.plugin.saveSettings(); });
    }
  }
}

function createRow(container, cls) { const r = container.createEl('div'); if (cls) r.classList.add(cls); return r; }

class ModifyTagsModal extends (ModalBase || class {}) {
  constructor(app, plugin) { super(app); this.plugin = plugin; this._suggTimer = null; this._activeIndex = -1; this._previewTimer = null; this._abortController = null; this.operation = 'add'; this.replaceAll = false; }
  
  onOpen() {
    const { contentEl } = this; contentEl.empty(); contentEl.classList.add('ut-modal-content');
    contentEl.createEl('h2', { text: 'Modify Tags' });

    // Operation selector
    contentEl.createEl('label', { text: 'Operation:' });
    const opRow = createRow(contentEl, 'ut-operation-row');
    this.opSelect = opRow.createEl('select'); this.opSelect.classList.add('ut-operation-select');
    const addOpt = this.opSelect.createEl('option'); addOpt.value = 'add'; addOpt.text = 'Add tags';
    const removeOpt = this.opSelect.createEl('option'); removeOpt.value = 'remove'; removeOpt.text = 'Remove tags';
    const replaceOpt = this.opSelect.createEl('option'); replaceOpt.value = 'replace'; replaceOpt.text = 'Replace tags';
    this.opSelect.addEventListener('change', () => { this.operation = this.opSelect.value; this.updateUI(); this.debouncedPreview(); });

    // Tags inputs
    this.tagsLabel = contentEl.createEl('label', { text: 'Tags (comma-separated):' });
    this.tagsInput = contentEl.createEl('input'); this.tagsInput.classList.add('ut-tags-input'); 
    this.tagsInput.placeholder = this.getTagPlaceholder();

    // Replace-specific inputs (hidden by default)
    this.findLabel = contentEl.createEl('label', { text: 'Find (comma-separated):' }); this.findLabel.style.display = 'none';
    this.findInput = contentEl.createEl('input'); this.findInput.classList.add('ut-find-input'); 
    this.findInput.placeholder = this.getTagPlaceholder('find');
    this.findInput.style.display = 'none';
    
    this.replaceLabel = contentEl.createEl('label', { text: 'Replace with (comma-separated):' }); this.replaceLabel.style.display = 'none';
    this.replaceInput = contentEl.createEl('input'); this.replaceInput.classList.add('ut-replace-input'); 
    this.replaceInput.placeholder = this.getTagPlaceholder('replace');
    this.replaceInput.style.display = 'none';

    // Replace All option (hidden by default)
    const replaceAllWrap = createRow(contentEl, 'ut-replace-all-wrap');
    replaceAllWrap.style.display = 'none';
    this.replaceAllWrap = replaceAllWrap;
    this.replaceAllCheck = replaceAllWrap.createEl('input'); 
    this.replaceAllCheck.type = 'checkbox'; 
    this.replaceAllCheck.checked = false;
    replaceAllWrap.createEl('label', { text: ' Replace all tags (removes all existing tags and replaces with new ones)' });
    this.replaceAllCheck.addEventListener('change', () => this.debouncedPreview());

    contentEl.createEl('label', { text: 'Folder or File (optional):' });
    const folderWrap = contentEl.createEl('div'); 
    folderWrap.style.position='relative';
    folderWrap.style.width='100%';
    this.folderInput = folderWrap.createEl('input'); this.folderInput.classList.add('ut-folder-input');
    this.folderInput.placeholder = 'Start typing folder or file path...';
    this.folderSuggest = folderWrap.createEl('div'); this.folderSuggest.classList.add('ut-sugg-box'); this.folderSuggest.style.display='none';

    contentEl.createEl('label', { text: 'Files (optional, comma/newline):' });
    this.filesInput = contentEl.createEl('textarea'); this.filesInput.classList.add('ut-files-input'); this.filesInput.placeholder = 'path/to/file1.md\npath/to/file2.md';

    const dry = createRow(contentEl, 'ut-dryrun-wrap'); this.dryCheck = dry.createEl('input'); this.dryCheck.type = 'checkbox'; this.dryCheck.checked = this.plugin.settings.dryRunByDefault; dry.createEl('label', { text: ' Dry-run (preview only)' });

    this.warning = contentEl.createEl('div'); this.warning.classList.add('ut-warning'); this.warning.style.display = 'none';
    
    this.status = contentEl.createEl('div'); this.status.classList.add('ut-status-line'); this.status.textContent = 'Enter tags to preview';

    const btns = createRow(contentEl, 'ut-buttons'); 
    this.runBtn = btns.createEl('button', { text: 'Add' }); this.runBtn.classList.add('ut-run-btn'); this.runBtn.addEventListener('click', () => this.run()); 
    btns.createEl('button', { text: 'Cancel' }).addEventListener('click', () => this.close());

    // Event listeners
    this.tagsInput.addEventListener('input', () => { this.debouncedPreview(); this.updateScopeWarning(); });
    this.findInput.addEventListener('input', () => { this.debouncedPreview(); this.updateScopeWarning(); });
    this.replaceInput.addEventListener('input', () => this.debouncedPreview());
    this.folderInput.addEventListener('input', () => { this.debouncedPreview(); this.debouncedUpdateSuggestions(); this.updateScopeWarning(); });
    this.folderInput.addEventListener('focus', () => this.updateFolderSuggestions());
    this.folderInput.addEventListener('keydown', (e) => this.handleFolderKeyDown(e));
    this.filesInput.addEventListener('input', () => { this.debouncedPreview(); this.updateScopeWarning(); });
    this.dryCheck.addEventListener('change', () => this.updateScopeWarning());

    this._docClick = (e) => { try { if (!this.folderSuggest.contains(e.target) && e.target !== this.folderInput) this.clearSuggestions(); } catch (err) {} };
    document.addEventListener('click', this._docClick);

    this.updateUI();
    this.updateScopeWarning();
  }

  updateUI() {
    if (this.operation === 'replace') {
      this.tagsLabel.style.display = 'none';
      this.tagsInput.style.display = 'none';
      this.findLabel.style.display = 'block';
      this.findInput.style.display = 'block';
      this.replaceLabel.style.display = 'block';
      this.replaceInput.style.display = 'block';
      this.replaceAllWrap.style.display = 'flex';
      this.runBtn.textContent = 'Replace';
    } else {
      this.tagsLabel.style.display = 'block';
      this.tagsInput.style.display = 'block';
      this.findLabel.style.display = 'none';
      this.findInput.style.display = 'none';
      this.replaceLabel.style.display = 'none';
      this.replaceInput.style.display = 'none';
      this.replaceAllWrap.style.display = 'none';
      this.runBtn.textContent = this.operation === 'add' ? 'Add' : 'Remove';
    }
  }

  debouncedPreview() {
    if (this._previewTimer) clearTimeout(this._previewTimer);
    this._previewTimer = setTimeout(() => { this.preview(); }, 300);
  }

  updateScopeWarning() {
    const folder = (this.folderInput.value || '').trim();
    const filesRaw = (this.filesInput.value || '').trim();
    const hasScope = !!(folder || filesRaw);
    const settings = this.plugin.settings || {};
    
    if (!hasScope && settings.requireScope && !settings.allowRootChanges) {
      this.warning.style.display = 'block';
      this.warning.innerHTML = '⚠️ <strong>Scope required:</strong> Please specify a folder/file or disable "Require scope" in settings to process entire vault.';
      this.status.textContent = 'Waiting for folder or file path...';
    } else if (!hasScope && !settings.allowRootChanges) {
      this.warning.style.display = 'block';
      this.warning.innerHTML = '⚠️ <strong>Warning:</strong> No scope specified. This will affect the entire vault. Enable "Allow root changes" in settings to proceed.';
      this.status.textContent = 'Vault-wide operation blocked by settings';
    } else {
      this.warning.style.display = 'none';
      const hasInput = this.operation === 'replace' ? this.findInput.value.trim() : this.tagsInput.value.trim();
      if (!hasInput) {
        this.status.textContent = this.operation === 'replace' ? 'Enter tags to find' : 'Enter tags to preview';
      }
    }
  }

  async preview() {
    const folder = (this.folderInput.value || '').trim(); 
    const filesRaw = (this.filesInput.value || '').trim(); 
    const filesList = filesRaw ? filesRaw.split(/[,\n]+/).map(s=>s.trim()).filter(Boolean) : null;
    
    if (this.plugin.settings?.debugMode) {
      console.log('[Update Tags] Preview called - folder:', folder, 'filesRaw:', filesRaw, 'operation:', this.operation);
    }
    
    if (this._abortController) this._abortController.abort();
    this._abortController = new AbortController();
    const signal = this._abortController.signal;
    
    this.status.textContent = 'Calculating...';
    
    try {
      let res;
      if (this.operation === 'replace') {
        const findTags = (this.findInput.value||'').split(',').map(s=>s.trim()).filter(Boolean);
        const replaceTags = (this.replaceInput.value||'').split(',').map(s=>s.trim()).filter(Boolean);
        if (!findTags.length) { this.status.textContent='Enter tags to find'; return; }
        const replaceAll = !!this.replaceAllCheck.checked;
        res = await processReplaceTags(this.app, folder, findTags, replaceTags, true, filesList, signal, replaceAll);
      } else {
        const tags = (this.tagsInput.value || '').split(',').map(s=>s.trim()).filter(Boolean);
        if (!tags.length) { this.status.textContent = 'Enter tags to preview'; return; }
        const isRemove = this.operation === 'remove';
        res = await processFiles(this.app, tags, folder, isRemove, true, filesList, signal);
      }
      
      if (this.plugin.settings?.debugMode) {
        console.log('[Update Tags] Preview result:', res);
      }
      
      if (!signal.aborted) {
        let scopeText = '';
        if (folder) {
          // Show shortened folder path for better readability
          const folderDisplay = folder.length > 40 ? '...' + folder.slice(-37) : folder;
          scopeText = ` in "${folderDisplay}"`;
        } else if (filesRaw) {
          const fileCount = filesList ? filesList.length : 0;
          scopeText = ` in ${fileCount} specified file${fileCount !== 1 ? 's' : ''}`;
        } else {
          scopeText = ' (entire vault)';
        }
        this.status.textContent = `✓ ${res.changed.length} of ${res.considered || 0} files would change${scopeText}`;
      }
    } catch (e) {
      console.error('[Update Tags] Preview error:', e);
      if (!signal.aborted) {
        this.status.textContent = 'Preview error: ' + (e.message || 'Unknown error');
      }
    }
  }

  async run() {
    const folder = (this.folderInput.value || '').trim(); 
    const filesRaw = (this.filesInput.value || '').trim(); 
    const filesList = filesRaw ? filesRaw.split(/[,\n]+/).map(s=>s.trim()).filter(Boolean) : null;
    const dry = !!this.dryCheck.checked;
    const settings = this.plugin.settings || {};
    const hasScope = !!(folder || filesRaw);
    
    // Validation
    if (this.operation === 'replace') {
      const findTags = (this.findInput.value||'').split(',').map(s=>s.trim()).filter(Boolean);
      if (!findTags.length) { new NoticeCtor('❌ No find tags provided'); return; }
    } else {
      const tags = (this.tagsInput.value || '').split(',').map(s=>s.trim()).filter(Boolean);
      if (!tags.length) { new NoticeCtor('❌ No tags provided'); return; }
    }
    
    if (!hasScope && settings.requireScope && !settings.allowRootChanges) {
      new NoticeCtor('❌ Scope required: Please specify a folder or file, or change settings');
      return;
    }
    if (!hasScope && !settings.allowRootChanges && !dry) {
      new NoticeCtor('❌ Vault-wide changes not allowed. Enable "Allow root changes" in settings or specify a scope.');
      return;
    }
    
    try {
      let res;
      let params = null;
      
      if (this.operation === 'replace') {
        const findTags = (this.findInput.value||'').split(',').map(s=>s.trim()).filter(Boolean);
        const replaceTags = (this.replaceInput.value||'').split(',').map(s=>s.trim()).filter(Boolean);
        const replaceAll = !!this.replaceAllCheck.checked;
        res = await processReplaceTags(this.app, folder, findTags, replaceTags, dry, filesList, null, replaceAll);
        
        if (dry) {
          params = {
            operation: 'replace',
            folder: folder,
            findTags: findTags,
            replaceTags: replaceTags,
            filesList: filesList,
            replaceAll: replaceAll
          };
        }
      } else {
        const tags = (this.tagsInput.value || '').split(',').map(s=>s.trim()).filter(Boolean);
        const isRemove = this.operation === 'remove';
        res = await processFiles(this.app, tags, folder, isRemove, dry, filesList);
        
        if (dry) {
          params = {
            operation: this.operation,
            tags: tags,
            folder: folder,
            filesList: filesList
          };
        }
      }
      
      new ResultsModal(this.app, res, dry, params, this.plugin).open();
      if (!dry) {
        new NoticeCtor(`✓ ${res.changed.length} file${res.changed.length !== 1 ? 's' : ''} updated`);
      } else {
        new NoticeCtor(`🔍 ${res.changed.length} file${res.changed.length !== 1 ? 's' : ''} would be changed (dry-run)`);
      }
    } catch (e) {
      console.error('[Update Tags] Run error:', e);
      new NoticeCtor('❌ Error: ' + (e.message || 'Unknown error'));
    }
    this.close();
  }

  debouncedUpdateSuggestions() {
    if (this._suggTimer) clearTimeout(this._suggTimer);
    this._suggTimer = setTimeout(() => { this.updateFolderSuggestions(); }, 220);
  }

  async updateFolderSuggestions() {
    const q = (this.folderInput.value || '').trim();
    if (this.plugin.settings?.debugMode) {
      console.log('[Update Tags] updateFolderSuggestions called, query:', q);
    }
    try {
      const items = await ModifyTagsModal.getFolderSuggestions(this.app, q);
      if (this.plugin.settings?.debugMode) {
        console.log('[Update Tags] Got suggestions:', items ? items.length : 0);
      }
      this.folderSuggest.innerHTML = '';
      if (!items || !items.length) { 
        if (this.plugin.settings?.debugMode) {
          console.log('[Update Tags] No items, hiding suggestions');
        }
        this.folderSuggest.style.display = 'none'; 
        this._activeIndex = -1; 
        return; 
      }
      for (let i=0;i<items.length;i++){ const it = items[i];
        const fullPath = it.path || '';
        // Truncate at beginning if path is too long (show end with ... prefix)
        const maxLen = 60;
        const displayText = fullPath.length > maxLen ? '...' + fullPath.slice(-(maxLen - 3)) : fullPath;
        const icon = it.isFile ? '📄 ' : '📁 ';
        if (typeof this.folderSuggest.createEl === 'function') {
          const d = this.folderSuggest.createEl('div'); d.classList.add('ut-sugg-item'); d.textContent = icon + displayText; d.dataset.path = fullPath; d.addEventListener('click', () => { this.selectSuggestion(i); });
        } else {
          const d = document.createElement('div'); d.className = 'ut-sugg-item'; d.textContent = icon + displayText; d.dataset.path = fullPath; d.addEventListener('click', () => { this.selectSuggestion(i); }); this.folderSuggest.appendChild(d);
        }
      }
      if (this.plugin.settings?.debugMode) {
        console.log('[Update Tags] Showing suggestion box');
      }
      this.folderSuggest.style.display = 'block'; this._activeIndex = -1;
    } catch (e) { 
      console.error('[Update Tags] Error in updateFolderSuggestions:', e);
      this.folderSuggest.style.display='none'; 
    }
  }

  clearSuggestions() { try { this.folderSuggest.innerHTML=''; this.folderSuggest.style.display='none'; this._activeIndex = -1; } catch (e) {} }

  onClose() { 
    try { 
      if (this._docClick) document.removeEventListener('click', this._docClick); 
      if (this._previewTimer) clearTimeout(this._previewTimer);
      if (this._suggTimer) clearTimeout(this._suggTimer);
      if (this._abortController) this._abortController.abort();
    } catch (e) {} 
  }

  selectSuggestion(index) {
    const nodes = Array.from(this.folderSuggest.querySelectorAll('.ut-sugg-item'));
    const n = nodes[index]; if (!n) return; const path = n.dataset.path || ''; this.folderInput.value = path; this.clearSuggestions(); this.debouncedPreview();
  }

  handleFolderKeyDown(e) {
    const nodes = Array.from(this.folderSuggest.querySelectorAll('.ut-sugg-item'));
    if (!nodes.length) return;
    if (e.key === 'ArrowDown') { e.preventDefault(); this._activeIndex = Math.min(this._activeIndex+1, nodes.length-1); this.updateActive(nodes); }
    else if (e.key === 'ArrowUp') { e.preventDefault(); this._activeIndex = Math.max(this._activeIndex-1, 0); this.updateActive(nodes); }
    else if (e.key === 'Enter') { if (this._activeIndex>=0 && this._activeIndex<nodes.length) { e.preventDefault(); this.selectSuggestion(this._activeIndex); } }
  }

  updateActive(nodes){ nodes.forEach((n,idx)=> n.classList.toggle('active', idx===this._activeIndex)); if (this._activeIndex>=0 && nodes[this._activeIndex]) nodes[this._activeIndex].scrollIntoView({ block:'nearest' }); }

  getTagPlaceholder(type = 'default') {
    // Gather existing tags from vault files to provide contextual examples
    const allFiles = this.app.vault.getFiles ? this.app.vault.getFiles() : [];
    const tagCounts = new Map();
    
    for (const file of allFiles) {
      if (!file.path.endsWith('.md')) continue;
      try {
        const cache = this.app.metadataCache?.getFileCache(file);
        if (cache?.frontmatter?.tags) {
          const tags = Array.isArray(cache.frontmatter.tags) 
            ? cache.frontmatter.tags 
            : [cache.frontmatter.tags];
          
          for (const tag of tags) {
            const tagStr = String(tag).trim().toLowerCase(); // Normalize to lowercase
            if (tagStr) {
              tagCounts.set(tagStr, (tagCounts.get(tagStr) || 0) + 1);
            }
          }
        }
      } catch (e) {
        // Skip files that can't be read
      }
    }
    
    // Get top 3 unique most common tags
    const uniqueTags = Array.from(tagCounts.entries())
      .sort((a, b) => b[1] - a[1])
      .map(([tag]) => tag);
    
    // Remove duplicates and limit to 3
    const uniqueSet = new Set();
    const selectedTags = [];
    for (const tag of uniqueTags) {
      const normalized = tag.toLowerCase();
      if (!uniqueSet.has(normalized) && selectedTags.length < 3) {
        uniqueSet.add(normalized);
        selectedTags.push(tag);
      }
    }
    
    if (selectedTags.length === 0) {
      // No tags found, provide generic placeholders based on type
      if (type === 'find') return 'e.g., old-tag';
      if (type === 'replace') return 'e.g., new-tag';
      return 'e.g., tag1';
    }
    
    // Join tags with comma and limit total length
    const examples = selectedTags.join(', ');
    const maxLength = 50;
    if (examples.length > maxLength) {
      return `e.g., ${examples.substring(0, maxLength - 7)}...`;
    }
    return `e.g., ${examples}`;
  }

  static async getFolderSuggestions(app, query){
    const all = app.vault.getFiles ? app.vault.getFiles() : [];
    const q = (query||'').toLowerCase().trim();
    const folders = new Map();
    const files = [];
    
    // Build folder list from all files - collect ALL ancestor folders
    for (const f of all) {
      if (!f.path || !f.path.endsWith('.md')) continue;
      const mtime = (f.stat && f.stat.mtime) ? f.stat.mtime : (f.stat && f.stat.ctime ? f.stat.ctime : 0);
      
      // Extract all ancestor folders from the path
      const parts = f.path.split('/');
      let currentPath = '';
      for (let i = 0; i < parts.length - 1; i++) {
        if (i > 0) currentPath += '/';
        currentPath += parts[i];
        const prev = folders.get(currentPath) || 0;
        if (mtime > prev) folders.set(currentPath, mtime);
      }
      
      // Add files that match query
      if (q && f.path.toLowerCase().includes(q)) {
        files.push({ path: f.path, score: mtime, isFile: true });
      }
    }
    
    // Filter folders by query - match folder name segments more flexibly
    let folderArr = Array.from(folders.keys())
      .filter(p => {
        if (!q) return true;
        const pathLower = p.toLowerCase();
        
        // Direct match in full path
        if (pathLower.includes(q)) return true;
        
        // Check individual folder segments (split by /)
        const segments = p.split('/');
        for (const seg of segments) {
          const segLower = seg.toLowerCase();
          // Match if segment starts with query or contains it
          if (segLower.includes(q)) return true;
        }
        
        // Check if query matches the end portion (last folder name)
        const lastFolder = segments[segments.length - 1];
        if (lastFolder && lastFolder.toLowerCase().includes(q)) return true;
        
        return false;
      })
      .map(p=>({ path: p, score: folders.get(p)||0, isFile: false }));
    
    let arr = folderArr.concat(files);
    
    // Sort: prioritize best matches based on query
    arr.sort((a,b)=> {
      if (q) {
        const aPathLower = (a.path || '').toLowerCase();
        const bPathLower = (b.path || '').toLowerCase();
        const aSegments = (a.path || '').split('/');
        const bSegments = (b.path || '').split('/');
        const aLast = (aSegments[aSegments.length - 1] || '').toLowerCase();
        const bLast = (bSegments[bSegments.length - 1] || '').toLowerCase();
        
        // Exact match of full path (highest priority)
        const aFullExact = aPathLower === q || aPathLower === q + '/';
        const bFullExact = bPathLower === q || bPathLower === q + '/';
        if (aFullExact && !bFullExact) return -1;
        if (!aFullExact && bFullExact) return 1;
        
        // Full path starts with query (second priority)
        const aFullStarts = aPathLower.startsWith(q);
        const bFullStarts = bPathLower.startsWith(q);
        if (aFullStarts && !bFullStarts) return -1;
        if (!aFullStarts && bFullStarts) return 1;
        
        // Exact match of last segment (third priority)
        const aExactMatch = aLast === q;
        const bExactMatch = bLast === q;
        if (aExactMatch && !bExactMatch) return -1;
        if (!aExactMatch && bExactMatch) return 1;
        
        // Last segment starts with query (fourth priority)
        const aStartsWith = aLast.startsWith(q);
        const bStartsWith = bLast.startsWith(q);
        if (aStartsWith && !bStartsWith) return -1;
        if (!aStartsWith && bStartsWith) return 1;
        
        // Contains query in full path (fifth priority)
        const aFullContains = aPathLower.includes(q);
        const bFullContains = bPathLower.includes(q);
        if (aFullContains && !bFullContains) return -1;
        if (!aFullContains && bFullContains) return 1;
      }
      
      // Folders before files
      if (a.isFile !== b.isFile) return a.isFile ? 1 : -1;
      
      // Then by recency
      if (b.score !== a.score) return b.score - a.score;
      
      // Finally alphabetically
      return (a.path||'').localeCompare(b.path||''); 
    }); 
    return arr.slice(0,10);
  }


}

class ResultsModal extends (ModalBase || class {}) {
  constructor(app, results, dry, params, plugin) { 
    super(app); 
    this.results = results; 
    this.dry = dry;
    this.params = params; // { operation, tags, findTags, replaceTags, folder, filesList }
    this.plugin = plugin;
  }
  
  onOpen() { 
    const { contentEl } = this; 
    contentEl.empty(); 
    contentEl.classList.add('ut-modal-content'); 
    
    contentEl.createEl('h3', { text: this.dry ? 'Dry-run Results' : 'Results' });
    
    if (!this.results || !this.results.changed || !this.results.changed.length) { 
      contentEl.createEl('div', { text: 'No files would be changed.' });
      if (this.dry) {
        const btnRow = contentEl.createEl('div', { cls: 'ut-buttons' });
        btnRow.style.marginTop = '20px';
        btnRow.createEl('button', { text: 'Close' }).addEventListener('click', () => this.close());
      }
      return; 
    }
    
    const summary = contentEl.createEl('div', { cls: 'ut-summary' });
    summary.style.marginBottom = '16px';
    summary.style.padding = '12px';
    summary.style.backgroundColor = 'var(--background-secondary)';
    summary.style.borderRadius = '4px';
    summary.textContent = this.dry 
      ? `${this.results.changed.length} file${this.results.changed.length !== 1 ? 's' : ''} will be modified`
      : `${this.results.changed.length} file${this.results.changed.length !== 1 ? 's' : ''} ${this.results.changed.length === 1 ? 'was' : 'were'} modified`;
    
    const ul = contentEl.createEl('ul');
    ul.style.maxHeight = '300px';
    ul.style.overflowY = 'auto';
    
    for (const it of this.results.changed) { 
      const li = ul.createEl('li'); 
      li.style.marginBottom = '12px';
      li.createEl('strong', { text: it.path });
      li.createEl('div', { text: 'Old: ' + (it.oldTags && it.oldTags.length ? it.oldTags.join(', ') : '(none)') });
      li.createEl('div', { text: 'New: ' + (it.newTags && it.newTags.length ? it.newTags.join(', ') : '(none)') });
    }
    
    // Add buttons
    const btnRow = contentEl.createEl('div', { cls: 'ut-buttons' });
    btnRow.style.marginTop = '20px';
    
    if (this.dry && this.params) {
      const runBtn = btnRow.createEl('button', { text: 'Run Operation' });
      runBtn.classList.add('ut-run-btn');
      runBtn.addEventListener('click', () => this.runOperation());
    }
    
    const newOpBtn = btnRow.createEl('button', { text: 'New Operation' });
    newOpBtn.addEventListener('click', () => {
      this.close();
      new ModifyTagsModal(this.app, this.plugin).open();
    });
    
    btnRow.createEl('button', { text: 'Close' }).addEventListener('click', () => this.close());
  }
  
  async runOperation() {
    if (!this.params) return;
    
    try {
      let res;
      if (this.params.operation === 'replace') {
        res = await processReplaceTags(
          this.app, 
          this.params.folder, 
          this.params.findTags, 
          this.params.replaceTags, 
          false, // not dry-run
          this.params.filesList,
          null,
          this.params.replaceAll || false
        );
      } else {
        const isRemove = this.params.operation === 'remove';
        res = await processFiles(
          this.app, 
          this.params.tags, 
          this.params.folder, 
          isRemove, 
          false, // not dry-run
          this.params.filesList
        );
      }
      
      new NoticeCtor(`✓ ${res.changed.length} file${res.changed.length !== 1 ? 's' : ''} updated`);
      this.close();
      
      // Show results modal
      new ResultsModal(this.app, res, false, null, this.plugin).open();
    } catch (e) {
      console.error('[Update Tags] Run operation error:', e);
      new NoticeCtor('❌ Error: ' + (e.message || 'Unknown error'));
    }
  }
}

// Processing functions
async function processReplaceTags(app, folder, findTags, replaceTags, dryRun, filesList, signal, replaceAll = false) {
  const all = app.vault.getFiles(); let targets = [];
  const folderPrefix = folder ? folder.replace(/^\/+/, '').replace(/\/+$/, '') : '';
  if (filesList && filesList.length) { const map = new Map(all.map(f=>[f.path,f])); for (const p of filesList) { const np = p.replace(/^\/+/, '').replace(/\/+$/, ''); const f = map.get(np); if (f) targets.push(f); } } else if (folderPrefix) { 
    // Check if folderPrefix is a file or folder
    const exactFile = all.find(f => f.path === folderPrefix || f.path === folderPrefix + '.md');
    if (exactFile) { targets = [exactFile]; } else { targets = all.filter(f=>f.path.endsWith('.md') && f.path.startsWith(folderPrefix)); }
  } else { targets = all.filter(f=>f.path.endsWith('.md')); }
  
  if (targets.length === 0) {
    throw new Error('No files found matching criteria');
  }
  
  const changed = []; const considered = targets.length;
  for (const file of targets) {
    if (signal && signal.aborted) break;
    
    try {
      const content = await app.vault.read(file);
      const parsed = splitFrontmatter(content);
      const front = parsed.frontmatter || {};
      let tags = [];
      if (front.tags) { if (Array.isArray(front.tags)) tags = front.tags.map(t=>String(t).trim()).filter(Boolean); else tags = [String(front.tags).trim()]; }
      
      let changedTags;
      let did = false;
      
      if (replaceAll) {
        // Replace All mode: check if any findTags exist, then replace ALL tags with replaceTags
        const hasMatch = findTags.some(f => tags.some(t => t.toLowerCase() === f.toLowerCase()));
        if (hasMatch) {
          changedTags = replaceTags.slice();
          did = true;
        } else {
          continue;
        }
      } else {
        // One-to-one replacement mode (original behavior)
        changedTags = tags.slice();
        for (let i=0;i<findTags.length;i++){
          const f=findTags[i]; const r = replaceTags[i] || (replaceTags.length===1 ? replaceTags[0] : null);
          for (let j=0;j<changedTags.length;j++){ if (changedTags[j].toLowerCase()===f.toLowerCase()){ if (r==null){ changedTags.splice(j,1); j--; did=true } else { changedTags[j]=r; did=true } } }
        }
      }
      
      changedTags = Array.from(new Set(changedTags));
      if (!did) continue;
      const newFront = Object.assign({}, front); if (changedTags.length===0) delete newFront.tags; else newFront.tags = changedTags;
      const newContent = joinFrontmatter(newFront, parsed.body);
      if (!dryRun) await app.vault.modify(file, newContent);
      changed.push({ path: file.path, oldTags: tags, newTags: changedTags });
    } catch (e) {
      console.error(`[Update Tags] Error processing file ${file.path}:`, e);
      // Continue with other files
    }
  }
  return { changed, considered };
}

async function processFiles(app, tags, folder, isRemove, dryRun, filesList, signal) {
  const all = app.vault.getFiles(); let targets = [];
  const folderPrefix = folder ? folder.replace(/^\/+/, '').replace(/\/+$/, '') : '';
  if (filesList && filesList.length) { const map = new Map(all.map(f=>[f.path,f])); for (const p of filesList) { const np = p.replace(/^\/+/, '').replace(/\/+$/, ''); const f = map.get(np); if (f) targets.push(f); } } else if (folderPrefix) { 
    // Check if folderPrefix is a file or folder
    const exactFile = all.find(f => f.path === folderPrefix || f.path === folderPrefix + '.md');
    if (exactFile) { targets = [exactFile]; } else { targets = all.filter(f=>f.path.endsWith('.md') && f.path.startsWith(folderPrefix)); }
  } else { targets = all.filter(f=>f.path.endsWith('.md')); }
  
  if (targets.length === 0) {
    throw new Error('No files found matching criteria');
  }
  
  const changed = []; const considered = targets.length;
  for (const file of targets) {
    if (signal && signal.aborted) break;
    
    try {
      const content = await app.vault.read(file);
      const parsed = splitFrontmatter(content);
      let front = parsed.frontmatter || {};
      try { if (app.metadataCache && app.metadataCache.getFileCache) { const cache = app.metadataCache.getFileCache(file); if (cache && cache.frontmatter) front = cache.frontmatter; } } catch (e) {}
      let existing = [];
      if (front && front.tags) { if (Array.isArray(front.tags)) existing = front.tags.map(t=>String(t).trim()).filter(Boolean); else existing = [String(front.tags).trim()]; }
      const normalized = Array.from(new Set(existing)); const lower = normalized.map(t=>t.toLowerCase());
      if (isRemove) {
        const remove = tags.map(t=>t.toLowerCase()); const newTags = normalized.filter(t=>remove.indexOf(t.toLowerCase())===-1);
        if (arraysEqual(normalized,newTags)) continue;
        const newFront = Object.assign({}, front); if (newTags.length===0) delete newFront.tags; else newFront.tags=newTags;
        const newContent = joinFrontmatter(newFront, parsed.body);
        if (!dryRun) await app.vault.modify(file, newContent);
        changed.push({ path: file.path, oldTags: normalized, newTags });
      } else {
        const toAdd = tags.map(t=>t.trim()).filter(Boolean);
        const newSet = Array.from(new Set(normalized.concat(toAdd)));
        const added = toAdd.filter(t=>lower.indexOf(t.toLowerCase())===-1);
        if (added.length===0 && normalized.length>0) continue;
        const newFront = Object.assign({}, front); newFront.tags = newSet; const newContent = joinFrontmatter(newFront, parsed.body);
        if (!dryRun) await app.vault.modify(file, newContent);
        changed.push({ path: file.path, oldTags: normalized, newTags: newSet });
      }
    } catch (e) {
      console.error(`[Update Tags] Error processing file ${file.path}:`, e);
      // Continue with other files
    }
  }
  return { changed, considered };
}

// Frontmatter helpers
function splitFrontmatter(content) { const fm = /^---\n([\s\S]*?)\n---\n?/; const m = content.match(fm); if (!m) return { frontmatter: null, body: content }; const yaml = m[1]; const body = content.slice(m[0].length); const front = parseYamlLike(yaml); return { frontmatter: front, body }; }
function joinFrontmatter(front, body) { if (!front || Object.keys(front).length===0) return body; const yaml = serializeYamlLike(front); return '---\n'+yaml+'\n---\n'+body; }
function parseYamlLike(txt) { const lines = txt.split(/\r?\n/); const out = {}; let key = null; for (let line of lines) { if (/^\s*-\s+/.test(line)) { const v=line.replace(/^\s*-\s+/,'').trim(); if (key){ if(!Array.isArray(out[key])) out[key]=[]; out[key].push(unquote(v)); } } else if (/^\s*$/.test(line)) continue; else { const m=line.match(/^\s*([^:]+):\s*(.*)$/); if (m){ key=m[1].trim(); const rest=m[2].trim(); if (rest==='') out[key]=[]; else if (/^\[.*\]$/.test(rest)){ const inner=rest.slice(1,-1); out[key]=inner.split(',').map(s=>unquote(s.trim())).filter(Boolean); } else out[key]=unquote(rest); } } } return out; }
function serializeYamlLike(obj){ const lines=[]; for(const k of Object.keys(obj)){ const v=obj[k]; if(Array.isArray(v)){ lines.push(k+':'); for(const it of v) lines.push('- '+String(it)); } else lines.push(k+': '+String(v)); } return lines.join('\n'); }
function unquote(s){ if(s==null) return s; s=String(s); if((s.startsWith('"')&&s.endsWith('"'))||(s.startsWith("'")&&s.endsWith("'"))) return s.slice(1,-1); return s; }
function arraysEqual(a,b){ if(!a&&!b) return true; if(!a||!b) return false; if(a.length!==b.length) return false; for(let i=0;i<a.length;i++) if(a[i]!==b[i]) return false; return true; }

// Export plugin class
if (typeof module !== 'undefined' && module.exports) module.exports = UpdateTagsPlugin;
else if (typeof exports !== 'undefined') exports.default = UpdateTagsPlugin;
else if (typeof globalThis !== 'undefined') globalThis.UpdateTagsPlugin = UpdateTagsPlugin;
