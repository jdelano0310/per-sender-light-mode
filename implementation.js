"use strict";

var { ExtensionCommon } = ChromeUtils.importESModule(
  "resource://gre/modules/ExtensionCommon.sys.mjs"
);

const PREF = "mail.dark-reader.enabled";
const XHTML = "http://www.w3.org/1999/xhtml";
const NOTE_ID = "pslm-auto-note";

// Resolve a tab to its about:message window.
// - 3-pane mail tab: chromeBrowser -> about:3pane -> messageBrowser -> about:message
// - message tab:     chromeBrowser -> about:message
// - message window:  window.messageBrowser -> about:message
function getAboutMessage(nativeTab) {
  let win =
    nativeTab.chromeBrowser?.contentWindow ??
    nativeTab.messageBrowser?.contentWindow;
  if (win?.location.href.startsWith("about:3pane")) {
    win = win.messageBrowser?.contentWindow;
  }
  return win?.location.href.startsWith("about:message") ? win : null;
}

this.darkReader = class extends ExtensionCommon.ExtensionAPI {
  getAPI(context) {
    const fires = new Set();      // active onUserToggled listeners
    const watched = new Map();    // toggle element -> { handler, unload, win }
    const notes = new Set();      // "Auto" labels we added

    function aboutMessageFor(tabId) {
      try {
        return getAboutMessage(context.extension.tabManager.get(tabId).nativeTab);
      } catch {
        return null;
      }
    }

    function unwatch(el) {
      const entry = watched.get(el);
      if (!entry) return;
      try {
        el.removeEventListener("change", entry.handler);
        entry.win.removeEventListener("unload", entry.unload);
      } catch {}
      watched.delete(el);
    }

    context.callOnClose({
      close() {
        for (const el of [...watched.keys()]) unwatch(el);
        for (const note of notes) {
          try { note.remove(); } catch {}
        }
        notes.clear();
      },
    });

    return {
      darkReader: {
        async setEnabled(enabled) {
          if (Services.prefs.getBoolPref(PREF, true) !== enabled) {
            Services.prefs.setBoolPref(PREF, enabled);
          }
        },

        async watchTab(tabId) {
          const win = aboutMessageFor(tabId);
          const el = win?.document.getElementById("disableDarkReader");
          if (!el || watched.has(el)) return;

          const handler = e => {
            if (!e.isTrusted) return; // ignore anything not from a real click
            const darkEnabled = !e.target.checked; // checked = dark mode OFF
            for (const fire of fires) fire.async(tabId, darkEnabled);
          };
          const unload = () => unwatch(el);

          el.addEventListener("change", handler);
          win.addEventListener("unload", unload, { once: true });
          watched.set(el, { handler, unload, win });
        },

        async setNote(tabId, visible) {
          const doc = aboutMessageFor(tabId)?.document;
          if (!doc) return;
          let note = doc.getElementById(NOTE_ID);
          if (!note) {
            if (!visible) return;
            const toggle = doc.getElementById("darkReaderToggle");
            if (!toggle) return;
            note = doc.createElementNS(XHTML, "span");
            note.id = NOTE_ID;
            note.textContent = "Auto";
            note.title = "Light mode remembered for this sender by Per-Sender Light Mode";
            note.style.cssText =
              "font-size: 0.85em; opacity: 0.7; margin-inline-end: 6px; align-self: center;";
            toggle.before(note);
            notes.add(note);
          }
          note.hidden = !visible;
        },

        onUserToggled: new ExtensionCommon.EventManager({
          context,
          name: "darkReader.onUserToggled",
          register(fire) {
            fires.add(fire);
            return () => fires.delete(fire);
          },
        }).api(),
      },
    };
  }
};
