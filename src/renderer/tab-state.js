(function exposeTabState(root) {
  function createTabState() {
    return { openTabs: [], activeTabId: null, nextTabId: 1 };
  }

  function fileNameFromPath(filePath) {
    return String(filePath || "").split(/[\\/]/).pop() || "Dosya";
  }

  function cloneState(state) {
    return {
      openTabs: state.openTabs.map(tab => ({ ...tab })),
      activeTabId: state.activeTabId,
      nextTabId: state.nextTabId || 1
    };
  }

  function getActiveTab(state) {
    return state.openTabs.find(tab => tab.id === state.activeTabId) || null;
  }

  function openLoadingTab(state, filePath) {
    const nextState = cloneState(state);
    const existing = nextState.openTabs.find(tab => tab.filePath === filePath);

    if (existing) {
      nextState.activeTabId = existing.id;
      return { state: nextState, tab: existing, reused: true };
    }

    const tab = {
      id: `tab-${nextState.nextTabId}`,
      filePath,
      name: fileNameFromPath(filePath),
      type: "",
      size: 0,
      status: "loading",
      data: null,
      aiResult: null,
      error: null
    };

    nextState.nextTabId += 1;
    nextState.openTabs.push(tab);
    nextState.activeTabId = tab.id;

    return { state: nextState, tab, reused: false };
  }

  function updateTab(state, tabId, patch) {
    const nextState = cloneState(state);
    nextState.openTabs = nextState.openTabs.map(tab => (
      tab.id === tabId ? { ...tab, ...patch } : tab
    ));
    return nextState;
  }

  function setTabReady(state, tabId, data) {
    const existing = state.openTabs.find(tab => tab.id === tabId);

    return updateTab(state, tabId, {
      name: data.name || existing?.name || "Dosya",
      type: data.type || "",
      size: data.size || 0,
      status: "ready",
      data,
      error: null
    });
  }

  function setTabError(state, tabId, error) {
    return updateTab(state, tabId, {
      status: "error",
      error: String(error),
      data: null
    });
  }

  function setActiveTab(state, tabId) {
    if (!state.openTabs.some(tab => tab.id === tabId)) return cloneState(state);

    const nextState = cloneState(state);
    nextState.activeTabId = tabId;
    return nextState;
  }

  function closeTab(state, tabId) {
    const index = state.openTabs.findIndex(tab => tab.id === tabId);
    if (index === -1) return cloneState(state);

    const nextState = cloneState(state);
    const wasActive = nextState.activeTabId === tabId;
    nextState.openTabs.splice(index, 1);

    if (!nextState.openTabs.length) {
      nextState.activeTabId = null;
    } else if (wasActive) {
      const neighbor = nextState.openTabs[index] || nextState.openTabs[index - 1];
      nextState.activeTabId = neighbor.id;
    }

    return nextState;
  }

  function setTabAIResult(state, tabId, aiResult) {
    return updateTab(state, tabId, { aiResult });
  }

  const api = {
    createTabState,
    openLoadingTab,
    setTabReady,
    setTabError,
    setActiveTab,
    closeTab,
    setTabAIResult,
    getActiveTab
  };

  if (typeof module !== "undefined" && module.exports) {
    module.exports = api;
  }

  if (root) {
    root.FilePeekTabs = api;
  }
})(typeof window !== "undefined" ? window : null);
