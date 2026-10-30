"use strict";

// Storage shape: { lightSenders: { "noreply@drives.ga.gov": true, ... } }
// Dark mode is the default; only light-mode senders are stored.

let lightSenders = {};
const ready = messenger.storage.local.get("lightSenders").then(r => {
  lightSenders = r.lightSenders ?? {};
});

// Last message shown in each tab: tabId -> { id, email }
const shown = new Map();

function extractAddress(author) {
  if (!author) return null;
  const m = author.match(/<([^>]+)>/);
  return (m ? m[1] : author).trim().toLowerCase();
}

function isLight(email) {
  return !!(email && lightSenders[email]);
}

// Set the mode as soon as a message is selected, before it renders.
messenger.mailTabs.onSelectedMessagesChanged.addListener(async (tab, list) => {
  if (list.messages.length !== 1) return;
  await ready;
  await messenger.darkReader.setEnabled(!isLight(extractAddress(list.messages[0].author)));
});

// Fallback for message tabs/windows, plus the "Auto" label and toggle watching.
messenger.messageDisplay.onMessageDisplayed.addListener(async (tab, message) => {
  if (!message) return;
  const email = extractAddress(message.author);
  const prev = shown.get(tab.id);
  shown.set(tab.id, { id: message.id, email });

  messenger.darkReader.watchTab(tab.id);
  await ready;
  messenger.darkReader.setNote(tab.id, isLight(email));

  // Same message re-rendering (e.g. after a manual toggle): leave the pref alone.
  if (prev?.id === message.id) return;
  await messenger.darkReader.setEnabled(!isLight(email));
});

// Record manual flips of the header toggle.
messenger.darkReader.onUserToggled.addListener(async (tabId, darkEnabled) => {
  const email = shown.get(tabId)?.email;
  if (!email) return;

  await ready;
  if (darkEnabled) {
    delete lightSenders[email];   // back to the default; no need to store
  } else {
    lightSenders[email] = true;
  }
  messenger.darkReader.setNote(tabId, !darkEnabled);
  await messenger.storage.local.set({ lightSenders });
});

messenger.tabs.onRemoved.addListener(tabId => shown.delete(tabId));

// On startup: the pref survives restarts, so set it for whatever message
// is already open (or back to dark if none is).
(async () => {
  await ready;
  const tabs = await messenger.tabs.query({ active: true });
  for (const tab of tabs) {
    const message = await messenger.messageDisplay
      .getDisplayedMessage(tab.id)
      .catch(() => null);
    if (!message) continue;
    const email = extractAddress(message.author);
    shown.set(tab.id, { id: message.id, email });
    messenger.darkReader.watchTab(tab.id);
    messenger.darkReader.setNote(tab.id, isLight(email));
    await messenger.darkReader.setEnabled(!isLight(email));
    return;
  }
  await messenger.darkReader.setEnabled(true);
})();
