'use client';

import {
  BookOpen,
  ChevronRight,
  CircleHelp,
  Disc3,
  Edit3,
  FolderOpen,
  GripVertical,
  Pause,
  Play,
  Power,
  Radio,
  Search,
  SkipBack,
  SkipForward,
  Trash2,
  Volume2,
  VolumeX,
  X,
} from 'lucide-react';
import { useEffect, useMemo, useRef, useState } from 'react';

type MediaItem = { id: string; name: string; path: string; src?: string; kind: 'video' | 'audio' };
type Channel = {
  id: string; number: number; name: string; callSign: string; genre: string; description: string;
  accent: string; poster?: string; folderPath?: string; handleKey?: string; episodes: MediaItem[]; source: 'demo' | 'folder';
};
type SavedChannel = Omit<Channel, 'episodes' | 'source'> & { source: 'folder' };
type ChannelDraft = { number: number; color: string; name: string; description: string };
type ModalName = 'settings' | 'channels' | 'delete';

const accents = ['#f09b64', '#c7d867', '#7dc8c6', '#e3bb71', '#e089a5', '#9d9fe2'];
const channelPalette = ['#f09b64', '#d87d6f', '#c7d867', '#8fbe73', '#7dc8c6', '#78aeca', '#e3bb71', '#d7a36d', '#e089a5', '#9d9fe2'];
const demoChannels: Channel[] = [
  { id: 'demo-sailor', number: 5, name: 'Sailor Moon', callSign: 'SMN / 05', genre: 'anime block', description: 'Moon prism power, after school. Episode order is delightfully loose.', accent: accents[0], episodes: [
    { id: 'sm-1', name: 'A Moonlit Broadcast', path: 'Sailor Moon / 01', kind: 'video' }, { id: 'sm-2', name: 'The Arcade After Dark', path: 'Sailor Moon / 02', kind: 'video' }, { id: 'sm-3', name: 'Luna Has a Plan', path: 'Sailor Moon / 03', kind: 'video' }, { id: 'sm-4', name: 'A Very Normal School Day', path: 'Sailor Moon / 04', kind: 'video' },
  ], source: 'demo' },
  { id: 'demo-art', number: 9, name: 'Art Attack', callSign: 'ART / 09', genre: 'afternoon craft', description: 'Paint, paste, and a little bit of chaos before the news comes on.', accent: accents[1], episodes: [
    { id: 'art-1', name: 'Paper City', path: 'Art Attack / 01', kind: 'video' }, { id: 'art-2', name: 'The Giant Mural', path: 'Art Attack / 02', kind: 'video' }, { id: 'art-3', name: 'Glue, Glitter, Go', path: 'Art Attack / 03', kind: 'video' },
  ], source: 'demo' },
  { id: 'demo-dinos', number: 13, name: 'Dinosaurs', callSign: 'DNO / 13', genre: 'family sitcom', description: 'Not the mama. A warm, weird little sitcom from the other side of the TV.', accent: accents[2], episodes: [
    { id: 'dino-1', name: 'The New Neighbour', path: 'Dinosaurs / 01', kind: 'video' }, { id: 'dino-2', name: 'Baby Sinclair', path: 'Dinosaurs / 02', kind: 'video' }, { id: 'dino-3', name: 'A Day at the Museum', path: 'Dinosaurs / 03', kind: 'video' },
  ], source: 'demo' },
  { id: 'demo-movies', number: 18, name: 'Friday Movies', callSign: 'MOV / 18', genre: 'movie shelf', description: 'Long-form stories for when the lights are low and nobody is in a hurry.', accent: accents[3], episodes: [
    { id: 'movie-1', name: 'A Night at the Video Store', path: 'Friday Movies / 01', kind: 'video' }, { id: 'movie-2', name: 'The Long Weekend', path: 'Friday Movies / 02', kind: 'video' },
  ], source: 'demo' },
];

const videoExtensions = new Set(['mp4', 'm4v', 'webm', 'mov', 'ogv', 'avi', 'mkv']);
const audioExtensions = new Set(['mp3', 'wav', 'm4a', 'aac', 'flac', 'ogg']);
const extensionOf = (name: string) => name.split('.').pop()?.toLowerCase() ?? '';
const channelNeedsFolder = (channel: Channel) => channel.source === 'folder' && channel.episodes.length === 0;
const titleCase = (value: string) => value.replace(/[_./-]+/g, ' ').replace(/\s+/g, ' ').trim().replace(/\b\w/g, (letter) => letter.toUpperCase());
const cleanSummary = (summary?: string) => (summary ?? '').replace(/<[^>]*>/g, '').replace(/&amp;/g, '&').trim();
const CHANNEL_COOKIE = 'slow-tv-channel-metadata';
const CHANNEL_STORAGE = 'slow-tv-channel-metadata';
const HANDLE_DB = 'slow-tv-directory-handles';

function channelMetadata(channels: Channel[]): SavedChannel[] {
  return channels.filter((channel) => channel.source === 'folder').map(({ episodes: _episodes, source: _source, ...channel }) => ({ ...channel, source: 'folder' }));
}

function persistChannelMetadata(channels: Channel[]) {
  const metadata = JSON.stringify(channelMetadata(channels));
  try { localStorage.setItem(CHANNEL_STORAGE, metadata); } catch { /* storage is optional */ }
  try { document.cookie = `${CHANNEL_COOKIE}=${encodeURIComponent(metadata)}; max-age=31536000; path=/; samesite=lax`; } catch { /* cookies are optional */ }
}

function readChannelMetadata(): SavedChannel[] {
  try {
    const stored = localStorage.getItem(CHANNEL_STORAGE);
    if (stored) return JSON.parse(stored) as SavedChannel[];
  } catch { /* use cookie fallback */ }
  try {
    const match = document.cookie.split('; ').find((entry) => entry.startsWith(`${CHANNEL_COOKIE}=`));
    if (match) return JSON.parse(decodeURIComponent(match.slice(CHANNEL_COOKIE.length + 1))) as SavedChannel[];
  } catch { /* no saved metadata */ }
  return [];
}

function openHandleDb(): Promise<IDBDatabase | null> {
  if (typeof indexedDB === 'undefined') return Promise.resolve(null);
  return new Promise((resolve) => {
    const request = indexedDB.open(HANDLE_DB, 1);
    request.onupgradeneeded = () => request.result.createObjectStore('handles');
    request.onsuccess = () => resolve(request.result);
    request.onerror = () => resolve(null);
  });
}

async function saveDirectoryHandle(key: string, handle: any) {
  const db = await openHandleDb();
  if (!db) return;
  await new Promise<void>((resolve) => {
    const transaction = db.transaction('handles', 'readwrite');
    transaction.objectStore('handles').put(handle, key);
    transaction.oncomplete = () => { db.close(); resolve(); };
    transaction.onerror = () => { db.close(); resolve(); };
  });
}

async function getDirectoryHandle(key: string) {
  const db = await openHandleDb();
  if (!db) return null;
  return new Promise<any>((resolve) => {
    const request = db.transaction('handles', 'readonly').objectStore('handles').get(key);
    request.onsuccess = () => { db.close(); resolve(request.result ?? null); };
    request.onerror = () => { db.close(); resolve(null); };
  });
}

async function hasReadPermission(handle: any) {
  if (!handle?.queryPermission) return true;
  return (await handle.queryPermission({ mode: 'read' })) === 'granted';
}

function mergeChannels(existing: Channel[], incoming: Channel[]) {
  const merged = [...existing];
  incoming.forEach((channel) => {
    const reconnectIndex = merged.findIndex((item) => item.source === 'folder' && item.folderPath === channel.folderPath && item.episodes.length === 0);
    if (reconnectIndex >= 0) merged[reconnectIndex] = { ...channel, id: merged[reconnectIndex].id, number: merged[reconnectIndex].number };
    else merged.push(channel);
  });
  return merged;
}

async function collectFiles(directory: any, parentPath = ''): Promise<{ path: string; file: File }[]> {
  const files: { path: string; file: File }[] = [];
  for await (const entry of directory.values()) {
    const entryPath = parentPath ? `${parentPath}/${entry.name}` : entry.name;
    if (entry.kind === 'file') {
      const extension = extensionOf(entry.name);
      if (videoExtensions.has(extension) || audioExtensions.has(extension)) files.push({ path: entryPath, file: await entry.getFile() });
    } else if (entry.kind === 'directory') files.push(...(await collectFiles(entry, entryPath)));
  }
  return files;
}

function channelFromFiles(folderName: string, files: { path: string; file: File }[], index: number, handleKey?: string, overrides?: Partial<SavedChannel>): Channel {
  const episodes = files.map(({ path, file }, episodeIndex) => ({
    id: `${folderName}-${episodeIndex}-${file.name}`, name: titleCase(file.name.replace(/\.[^.]+$/, '')), path,
    src: URL.createObjectURL(file), kind: audioExtensions.has(extensionOf(file.name)) ? ('audio' as const) : ('video' as const),
  }));
  return { id: `folder-${folderName}-${index}`, number: 20 + index, name: titleCase(folderName), callSign: `${String(index + 1).padStart(2, '0')} / ${String(20 + index).padStart(2, '0')}`, genre: 'your library', description: `${episodes.length} local ${episodes.length === 1 ? 'file' : 'files'} from ${folderName}.`, accent: accents[index % accents.length], folderPath: folderName, handleKey, episodes, source: 'folder', ...overrides };
}

export default function Home() {
  const [channels, setChannels] = useState<Channel[]>(demoChannels);
  const [channelIndex, setChannelIndex] = useState(0);
  const [episodeIndex, setEpisodeIndex] = useState(0);
  const [recentlyPlayed, setRecentlyPlayed] = useState<string[]>([]);
  const [isOn, setIsOn] = useState(true);
  const [isPoweringDown, setIsPoweringDown] = useState(false);
  const [isPoweringUp, setIsPoweringUp] = useState(false);
  const [isPlaying, setIsPlaying] = useState(false);
  const [isMuted, setIsMuted] = useState(false);
  const [showSettings, setShowSettings] = useState(false);
  const [showChannelModal, setShowChannelModal] = useState(false);
  const [channelPendingDelete, setChannelPendingDelete] = useState<Channel | null>(null);
  const [closingModal, setClosingModal] = useState<ModalName | null>(null);
  const [channelEditorOpen, setChannelEditorOpen] = useState(false);
  const [draggingChannelId, setDraggingChannelId] = useState<string | null>(null);
  const [dragOverChannelId, setDragOverChannelId] = useState<string | null>(null);
  const [editingChannelId, setEditingChannelId] = useState<string | null>(null);
  const [channelDraft, setChannelDraft] = useState<ChannelDraft>({ number: 19, color: channelPalette[0], name: '', description: '' });
  const [pendingDraft, setPendingDraft] = useState<ChannelDraft | null>(null);
  const [pendingFolderChannelId, setPendingFolderChannelId] = useState<string | null>(null);
  const [toast, setToast] = useState<{ message: string; tone: 'success' | 'error' | 'info' } | null>(null);
  const [status, setStatus] = useState('ready for a slow afternoon');
  const [isScanning, setIsScanning] = useState(false);
  const [search, setSearch] = useState('');
  const [clock, setClock] = useState('12:42');
  const videoRef = useRef<HTMLVideoElement>(null);
  const audioRef = useRef<HTMLAudioElement>(null);
  const inputRef = useRef<HTMLInputElement>(null);
  const importInputRef = useRef<HTMLInputElement>(null);
  const objectUrlsRef = useRef<string[]>([]);
  const toastTimerRef = useRef<number | null>(null);
  const powerTimerRef = useRef<number | null>(null);
  const modalTimerRef = useRef<number | null>(null);
  const currentChannel = channels[channelIndex] ?? channels[0];
  const editingChannel = channels.find((channel) => channel.id === editingChannelId);
  const currentEpisode = currentChannel?.episodes[episodeIndex % currentChannel.episodes.length];
  const visibleChannels = useMemo(() => channels.filter((channel) => channel.name.toLowerCase().includes(search.toLowerCase())), [channels, search]);

  useEffect(() => {
    const timer = window.setInterval(() => setClock(new Intl.DateTimeFormat('en-AU', { hour: '2-digit', minute: '2-digit', hour12: false }).format(new Date())), 30_000);
    return () => window.clearInterval(timer);
  }, []);

  useEffect(() => {
    const media = currentEpisode?.kind === 'audio' ? audioRef.current : videoRef.current;
    if (!media || !currentEpisode?.src || !isOn) return;
    media.load();
    if (isPlaying) void media.play().catch(() => setStatus('press play to start this file'));
  }, [currentEpisode, isOn, isPlaying]);

  useEffect(() => () => objectUrlsRef.current.forEach((url) => URL.revokeObjectURL(url)), []);
  useEffect(() => () => { if (powerTimerRef.current) window.clearTimeout(powerTimerRef.current); }, []);
  useEffect(() => () => { if (modalTimerRef.current) window.clearTimeout(modalTimerRef.current); }, []);

  function showToast(message: string, tone: 'success' | 'error' | 'info' = 'success') {
    setToast({ message, tone });
    if (toastTimerRef.current) window.clearTimeout(toastTimerRef.current);
    toastTimerRef.current = window.setTimeout(() => setToast(null), 3400);
  }

  function closeModal(modal: ModalName) {
    if (closingModal) return;
    setClosingModal(modal);
    if (modalTimerRef.current) window.clearTimeout(modalTimerRef.current);
    modalTimerRef.current = window.setTimeout(() => {
      if (modal === 'settings') setShowSettings(false);
      if (modal === 'channels') setShowChannelModal(false);
      if (modal === 'delete') setChannelPendingDelete(null);
      setClosingModal(null);
      modalTimerRef.current = null;
    }, 180);
  }

  function toggleSettings() {
    if (showSettings) closeModal('settings');
    else { setClosingModal(null); setShowSettings(true); }
  }

  useEffect(() => {
    let cancelled = false;
    async function restoreSavedChannels() {
      const saved = readChannelMetadata();
      if (!saved.length) return;
      const restored = await Promise.all(saved.map(async (metadata, index) => {
        try {
          const handle = metadata.handleKey ? await getDirectoryHandle(metadata.handleKey) : null;
          if (handle && await hasReadPermission(handle)) {
            const files = await collectFiles(handle);
            const channel = channelFromFiles(metadata.folderPath ?? metadata.name, files, index, metadata.handleKey, metadata);
            objectUrlsRef.current.push(...channel.episodes.flatMap((episode) => episode.src ?? []));
            return channel;
          }
        } catch {
          // Keep the channel visible when its old folder or permission is unavailable.
        }
        return { ...metadata, episodes: [], source: 'folder' as const };
      }));
      if (!cancelled && restored.length) {
        setChannels((existing) => [...existing.filter((channel) => channel.source !== 'folder'), ...restored]);
        setStatus('saved channels ready · manage channels to reconnect any missing folders');
      }
    }
    void restoreSavedChannels();
    return () => { cancelled = true; };
  }, []);

  function selectChannel(index: number) { setChannelIndex(index); setEpisodeIndex(0); setIsPlaying(true); setStatus(`tuned to ${channels[index]?.name ?? 'channel'}`); }
  function changeChannel(direction: number) { if (channels.length) selectChannel((channelIndex + direction + channels.length) % channels.length); }
  function nextEpisode() {
    if (!currentChannel?.episodes.length) return;
    const candidates = currentChannel.episodes.filter((episode) => episode.id !== recentlyPlayed[0]);
    const pool = candidates.length ? candidates : currentChannel.episodes;
    const choice = pool[Math.floor(Math.random() * pool.length)];
    setEpisodeIndex(Math.max(currentChannel.episodes.findIndex((episode) => episode.id === choice.id), 0));
    setRecentlyPlayed((history) => [choice.id, ...history].slice(0, 12)); setIsPlaying(true); setStatus(`playing something from ${currentChannel.name}`);
  }
  function previousEpisode() { if (currentChannel?.episodes.length) { setEpisodeIndex((index) => (index - 1 + currentChannel.episodes.length) % currentChannel.episodes.length); setIsPlaying(true); } }

  useEffect(() => {
    const context = (document as Document & { modelContext?: any }).modelContext;
    if (!context?.registerTool) return;
    const lifecycle = new AbortController();
    void Promise.resolve(context.registerTool({
      name: 'tune_slow_tv_channel',
      title: 'Tune Slow TV channel',
      description: 'Change the visible Slow TV channel by its channel number.',
      inputSchema: { type: 'object', properties: { channelNumber: { type: 'number' } }, required: ['channelNumber'], additionalProperties: false },
      annotations: { readOnlyHint: false, untrustedContentHint: false },
      execute(input: { channelNumber: number }) {
        const index = channels.findIndex((channel) => channel.number === input.channelNumber);
        if (index < 0) throw new Error('Channel not found');
        selectChannel(index);
        return { channel: channels[index].name, channelNumber: channels[index].number };
      },
    }, { signal: lifecycle.signal })).catch(() => undefined);
    void Promise.resolve(context.registerTool({
      name: 'play_next_slow_tv_episode',
      title: 'Play a different Slow TV episode',
      description: 'Play a random episode on the current channel without repeating the last episode in a row.',
      inputSchema: { type: 'object', properties: {}, additionalProperties: false },
      annotations: { readOnlyHint: false, untrustedContentHint: false },
      execute() {
        nextEpisode();
        return { channel: currentChannel?.name, status: 'playing a different episode' };
      },
    }, { signal: lifecycle.signal })).catch(() => undefined);
    return () => lifecycle.abort();
  }, [channels, currentChannel, recentlyPlayed]);

  async function matchShows(nextChannels: Channel[]) {
    return Promise.all(nextChannels.map(async (channel) => {
      try {
        const response = await fetch(`https://api.tvmaze.com/singlesearch/shows?q=${encodeURIComponent(channel.name)}`);
        if (!response.ok) return channel;
        const show = await response.json();
        return { ...channel, name: show.name || channel.name, genre: show.genres?.[0]?.toLowerCase() || channel.genre, description: cleanSummary(show.summary) || channel.description, poster: show.image?.medium || channel.poster };
      } catch { return channel; }
    }));
  }

  async function loadDirectory(directory: any, directoryName: string, draft?: ChannelDraft, reconnectChannelId?: string | null) {
    setIsScanning(true); setStatus('looking through your tapes…');
    try {
      const files = await collectFiles(directory);
      const existing = reconnectChannelId ? channels.find((channel) => channel.id === reconnectChannelId) : undefined;
      const overrides = existing ? { id: existing.id, number: existing.number, name: existing.name, callSign: existing.callSign, genre: existing.genre, description: existing.description, accent: existing.accent, poster: existing.poster, folderPath: directoryName } : draft ? channelOverrides(draft) : undefined;
      const localChannel = channelFromFiles(directoryName, files, channels.length, undefined, overrides);
      const nextChannels = [{ ...localChannel, id: existing?.id ?? localChannel.id, handleKey: existing?.handleKey ?? existing?.id ?? localChannel.id }];
      await saveDirectoryHandle(nextChannels[0].handleKey, directory);
      objectUrlsRef.current.push(...nextChannels.flatMap((channel) => channel.episodes.flatMap((episode) => episode.src ?? [])));
      if (!nextChannels[0].episodes.length) { setStatus('no playable files found in that folder'); showToast('No playable media found in that folder', 'error'); return; }
      const matched = draft || existing ? nextChannels : await matchShows(nextChannels);
      const merged = existing ? channels.map((channel) => channel.id === existing.id ? matched[0] : channel) : mergeChannels(channels, matched);
      persistChannelMetadata(merged); setChannels(merged); setChannelIndex(Math.max(merged.findIndex((channel) => channel.id === matched[0]?.id), 0)); setEpisodeIndex(0); setIsPlaying(true); setStatus(existing ? `${existing.name} folder connected` : `${matched.length} new ${matched.length === 1 ? 'channel' : 'channels'} added`); showToast(existing ? `${existing.name} folder connected` : `${matched[0]?.name ?? 'Channel'} added`);
    } catch { setStatus('folder access was cancelled'); } finally { setIsScanning(false); }
  }

  async function chooseFolder(draft?: ChannelDraft, reconnectChannelId?: string | null) {
    setPendingFolderChannelId(reconnectChannelId ?? null);
    const picker = (window as Window & { showDirectoryPicker?: () => Promise<any> }).showDirectoryPicker;
    if (picker) { try { const directory = await picker(); await loadDirectory(directory, directory.name, draft, reconnectChannelId); } catch { setStatus('folder access was cancelled'); showToast('Folder selection was cancelled', 'info'); } finally { setPendingFolderChannelId(null); } }
    else { setPendingDraft(draft ?? null); inputRef.current?.click(); }
  }

  async function handleInput(event: React.ChangeEvent<HTMLInputElement>) {
    const files = Array.from(event.target.files ?? []); if (!files.length) return;
    const draft = pendingDraft; const reconnectChannelId = pendingFolderChannelId; setPendingDraft(null); setPendingFolderChannelId(null);
    setIsScanning(true); setStatus('looking through your tapes…');
    const directoryName = files[0].webkitRelativePath?.split('/')[0] || 'my library';
    const existing = reconnectChannelId ? channels.find((channel) => channel.id === reconnectChannelId) : undefined;
    const overrides = existing ? { id: existing.id, number: existing.number, name: existing.name, callSign: existing.callSign, genre: existing.genre, description: existing.description, accent: existing.accent, poster: existing.poster, folderPath: directoryName } : draft ? channelOverrides(draft) : undefined;
    const localChannel = channelFromFiles(directoryName, files.map((file) => ({ path: file.webkitRelativePath || file.name, file })), channels.length, undefined, overrides);
    const nextChannels = [{ ...localChannel, id: existing?.id ?? localChannel.id, handleKey: existing?.handleKey ?? existing?.id ?? localChannel.id }];
    objectUrlsRef.current.push(...nextChannels.flatMap((channel) => channel.episodes.flatMap((episode) => episode.src ?? [])));
    if (!nextChannels[0].episodes.length) { setIsScanning(false); setStatus('no playable files found in that folder'); showToast('No playable media found in that folder', 'error'); event.target.value = ''; return; }
    const matched = draft || existing ? nextChannels : await matchShows(nextChannels); const merged = existing ? channels.map((channel) => channel.id === existing.id ? matched[0] : channel) : mergeChannels(channels, matched); persistChannelMetadata(merged); setChannels(merged); setChannelIndex(Math.max(merged.findIndex((channel) => channel.id === matched[0]?.id), 0)); setEpisodeIndex(0); setIsPlaying(true); setIsScanning(false); setStatus(existing ? `${existing.name} folder connected` : `${matched.length} new ${matched.length === 1 ? 'channel' : 'channels'} added · show details matched`); showToast(existing ? `${existing.name} folder connected` : `${matched[0]?.name ?? 'Channel'} added`); event.target.value = '';
  }

  function exportChannels() {
    const payload = { version: 1, exportedAt: new Date().toISOString(), channels: channelMetadata(channels) };
    const url = URL.createObjectURL(new Blob([JSON.stringify(payload, null, 2)], { type: 'application/json' }));
    const link = document.createElement('a'); link.href = url; link.download = 'slow-tv-channels.json'; link.click(); URL.revokeObjectURL(url);
    setStatus('channel metadata exported'); showToast('Channel backup exported');
  }

  async function importChannels(event: React.ChangeEvent<HTMLInputElement>) {
    const file = event.target.files?.[0]; if (!file) return;
    try {
      const parsed = JSON.parse(await file.text()) as { channels?: unknown };
      const records = Array.isArray(parsed?.channels) ? parsed.channels : [];
      const usedNumbers = new Set(channels.map((channel) => channel.number));
      const imported = records.filter((channel): channel is SavedChannel => Boolean(channel && typeof channel === 'object' && typeof (channel as SavedChannel).name === 'string' && (channel as SavedChannel).name.trim())).map((channel, index) => {
        const saved = channel as SavedChannel;
        const preferredNumber = Number(saved.number);
        const availableNumber = Number.isInteger(preferredNumber) && preferredNumber >= 1 && preferredNumber <= 99 && !usedNumbers.has(preferredNumber) ? preferredNumber : Array.from({ length: 99 }, (_, numberIndex) => numberIndex + 1).find((number) => !usedNumbers.has(number)) ?? (preferredNumber || 1);
        usedNumbers.add(availableNumber);
        const folderPath = typeof saved.folderPath === 'string' && saved.folderPath.trim() ? saved.folderPath.trim() : undefined;
        return {
          id: `imported-${Date.now()}-${index}`, number: availableNumber, name: saved.name.trim(), callSign: saved.callSign || `CUSTOM / ${String(availableNumber).padStart(2, '0')}`,
          genre: saved.genre || 'your library', description: saved.description || 'Folder content is missing. Choose a folder to reconnect it.', accent: saved.accent || channelPalette[index % channelPalette.length], poster: saved.poster, folderPath,
          episodes: [], source: 'folder' as const,
        };
      });
      if (!imported.length) { setStatus('no valid channels were found in that file'); showToast('No valid channels were found in that file', 'error'); return; }
      const missingCount = imported.length;
      const merged = mergeChannels(channels, imported); persistChannelMetadata(merged); setChannels(merged); setStatus(`${imported.length} channel ${imported.length === 1 ? 'record was' : 'records were'} imported${missingCount ? ` · ${missingCount} ${missingCount === 1 ? 'folder reference is' : 'folder references are'} missing` : ' · reconnect folders from Manage channels'}`); showToast(missingCount ? `${missingCount} imported channel${missingCount === 1 ? '' : 's'} need a folder` : `${imported.length} channel ${imported.length === 1 ? 'record' : 'records'} imported`);
    } catch { setStatus('that channel file could not be imported'); showToast('That channel file could not be imported', 'error'); }
    event.target.value = '';
  }

  function nextAvailableChannelNumber() {
    const highest = Math.max(0, ...channels.map((channel) => channel.number));
    if (highest < 99 && !channels.some((channel) => channel.number === highest + 1)) return highest + 1;
    for (let number = 1; number <= 99; number += 1) if (!channels.some((channel) => channel.number === number)) return number;
    return 1;
  }

  function openNewChannelModal() {
    setEditingChannelId(null);
    setChannelDraft({ number: nextAvailableChannelNumber(), color: channelPalette[channels.length % channelPalette.length], name: '', description: '' });
    setClosingModal(null); setShowChannelModal(true); setChannelEditorOpen(true);
  }

  function openEditChannelModal(channel: Channel) {
    setEditingChannelId(channel.id);
    setChannelDraft({ number: channel.number, color: channel.accent, name: channel.name, description: channel.description });
    setClosingModal(null); setShowChannelModal(true); setChannelEditorOpen(true);
  }

  function openManageChannels() {
    setEditingChannelId(null);
    setChannelEditorOpen(false);
    setClosingModal(null); setShowChannelModal(true);
  }

  function openFolderForChannel(channel: Channel) {
    closeModal('channels');
    setStatus(`choose a folder for ${channel.name}`);
    showToast(`Choose a folder for ${channel.name}`, 'info');
    void chooseFolder(undefined, channel.id);
  }

  function openFolderForEditingChannel() {
    if (editingChannel) openFolderForChannel(editingChannel);
  }

  function reorderChannels(draggedId: string, targetId: string) {
    if (draggedId === targetId) return;
    const fromIndex = channels.findIndex((channel) => channel.id === draggedId);
    const targetIndex = channels.findIndex((channel) => channel.id === targetId);
    if (fromIndex < 0 || targetIndex < 0) return;
    const activeId = currentChannel?.id;
    const reordered = [...channels];
    const [moved] = reordered.splice(fromIndex, 1);
    reordered.splice(targetIndex, 0, moved);
    persistChannelMetadata(reordered);
    setChannels(reordered);
    setChannelIndex(Math.max(reordered.findIndex((channel) => channel.id === activeId), 0));
    setStatus('channel order updated');
    showToast('Channel order updated');
  }

  function channelOverrides(draft: ChannelDraft, clearEmptyDescription = false) {
    const description = draft.description.trim();
    return { number: draft.number, name: draft.name.trim(), accent: draft.color, callSign: `CUSTOM / ${String(draft.number).padStart(2, '0')}`, ...(description || clearEmptyDescription ? { description } : {}) };
  }

  function submitChannelEditor(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const name = channelDraft.name.trim();
    if (!name) { showToast('Give the channel a name first', 'error'); return; }
    if (!Number.isInteger(channelDraft.number) || channelDraft.number < 1 || channelDraft.number > 99) { showToast('Choose a channel number from 1 to 99', 'error'); return; }
    if (channels.some((channel) => channel.number === channelDraft.number && channel.id !== editingChannelId)) { showToast(`Channel ${channelDraft.number} is already in use`, 'error'); return; }
    if (editingChannelId) {
      const updated = channels.map((channel) => channel.id === editingChannelId ? { ...channel, ...channelOverrides(channelDraft, true) } : channel);
      persistChannelMetadata(updated); setChannels(updated); setChannelEditorOpen(false); setStatus(`${name} updated`); showToast(`${name} updated`); return;
    }
    setPendingDraft(channelDraft);
    closeModal('channels');
    setStatus('choose a folder for the new channel');
    showToast('Choose a folder for the new channel', 'info');
    void chooseFolder(channelDraft);
  }

  function removeChannel(channel: Channel) {
    const remaining = channels.filter((item) => item.id !== channel.id);
    const activeIndex = remaining.findIndex((item) => item.id === currentChannel?.id);
    persistChannelMetadata(remaining); setChannels(remaining); setChannelIndex(Math.max(activeIndex, 0)); setEpisodeIndex(0); setEditingChannelId(null); setChannelEditorOpen(false); closeModal('delete'); setStatus(`${channel.name} removed`); showToast(`${channel.name} removed`, 'info');
  }

  function removeEditingChannel() {
    if (editingChannel) setChannelPendingDelete(editingChannel);
  }

  function togglePower() {
    if (powerTimerRef.current) window.clearTimeout(powerTimerRef.current);
    if (isOn) {
      videoRef.current?.pause(); audioRef.current?.pause();
      setIsPlaying(false); setIsPoweringUp(false); setIsPoweringDown(true);
      powerTimerRef.current = window.setTimeout(() => { setIsOn(false); setIsPoweringDown(false); powerTimerRef.current = null; }, 640);
    } else {
      setIsOn(true); setIsPoweringDown(false); setIsPoweringUp(true); setIsPlaying(false);
      powerTimerRef.current = window.setTimeout(() => { setIsPoweringUp(false); powerTimerRef.current = null; }, 720);
    }
  }

  return (
    <main className="app-shell">
      <div className="layout-grid">
        <input ref={inputRef} className="sr-only" type="file" multiple accept="video/*,audio/*" onChange={handleInput} {...({ webkitdirectory: 'true', directory: 'true' } as any)} />
        <input ref={importInputRef} className="sr-only" type="file" accept="application/json,.json" onChange={importChannels} />

        <section className="tv-stage" aria-label="Television player">
          <div className="television"><div className="tv-body">
            <div className="tv-face-label"><span>MODEL STV-90</span><span>STEREO / NTSC</span></div>
            <div className="tv-wood-grain" /><div className="screen-bezel"><div className="screen-glass"><div className="screen-content">
              {!isOn ? <div className="off-screen"><div className="off-dot" /></div> : currentEpisode?.src ? currentEpisode.kind === 'audio' ? <div className="audio-screen"><Disc3 size={68} /><span>audio only</span><strong>{currentEpisode.name}</strong><audio ref={audioRef} src={currentEpisode.src} muted={isMuted} onEnded={nextEpisode} /></div> : <video ref={videoRef} src={currentEpisode.src} muted={isMuted} onEnded={nextEpisode} playsInline /> : <div className="demo-screen" style={{ '--channel-accent': currentChannel.accent } as React.CSSProperties}><div className="demo-haze" /><div className="demo-bloom" /><div className="demo-copy"><span>NOW BROADCASTING</span><strong>{currentChannel.name}</strong><small>{currentEpisode?.name}</small></div><div className="demo-signal">{isPlaying ? 'PLAYING' : 'PAUSED'} <i>•</i> {currentChannel.callSign}</div></div>}
              {isPoweringDown && <div className="power-down-effect" aria-hidden="true"><span className="power-down-line" /></div>}
              {isPoweringUp && <div className="power-up-effect" aria-hidden="true"><span className="power-up-line" /></div>}
              <div className="scanlines" /><div className="screen-vignette" />{isOn && <div className="screen-overlay"><span>CH {String(currentChannel?.number ?? 0).padStart(2, '0')}</span><span>{isMuted ? 'MUTE' : 'STEREO'}</span></div>}
            </div></div></div>
            <div className="speaker-panel"><div className="speaker-grille">{Array.from({ length: 42 }).map((_, index) => <i key={index} />)}</div><span>slow tv</span></div>
            <div className="control-panel"><div className="brand-stamp">SLOW<br /><b>TV</b></div><div className="knob-cluster"><button className="knob-button" aria-label="Previous channel" onClick={() => changeChannel(-1)}><span className="knob" style={{ '--knob-rotation': `${channelIndex * 32 - 22}deg` } as React.CSSProperties} /><small>CHANNEL</small></button><button className="knob-button" aria-label="Toggle mute" onClick={() => setIsMuted((muted) => !muted)}><span className="knob volume" style={{ '--knob-rotation': `${isMuted ? -70 : 18}deg` } as React.CSSProperties} /><small>VOLUME</small></button></div><button className={`power-button ${isOn ? 'active' : ''}`} aria-label={isOn ? 'Turn television off' : 'Turn television on'} onClick={togglePower}><Power size={14} /><span>POWER</span></button></div>
          </div></div>
          <div className="tv-meta-bar"><div className="transport"><button aria-label="Previous episode" onClick={previousEpisode}><SkipBack size={15} /></button><button className="play-button" aria-label={isPlaying ? 'Pause' : 'Play'} onClick={() => isOn && setIsPlaying((playing) => !playing)}>{isPlaying ? <Pause size={18} fill="currentColor" /> : <Play size={18} fill="currentColor" />}</button><button aria-label="Next random episode" onClick={nextEpisode}><SkipForward size={15} /></button></div><div className="now-playing"><span className="eyebrow">NOW PLAYING</span><strong>{currentEpisode?.name ?? 'no tape selected'}</strong><span>{currentChannel?.name} · {currentChannel?.genre}</span></div><div className="channel-ticker"><span>◀</span><b>{currentChannel?.callSign}</b><span>{currentChannel?.description}</span><span>▶</span></div><button className="mute-button" aria-label={isMuted ? 'Unmute' : 'Mute'} onClick={() => setIsMuted((muted) => !muted)}>{isMuted ? <VolumeX size={16} /> : <Volume2 size={16} />}</button></div>
          <button className="tv-help-button icon-button" aria-label="Open help" onClick={toggleSettings}><CircleHelp size={17} /></button>
        </section>

        <aside className="guide-rail"><div className="guide-header"><div><p className="eyebrow">CHANNEL GUIDE</p><h2>What’s on</h2></div><BookOpen size={18} /></div><label className="search-box"><Search size={16} /><input value={search} onChange={(event) => setSearch(event.target.value)} placeholder="Find a channel" /><kbd>/</kbd></label><div className="guide-list">{visibleChannels.map((channel) => <div key={channel.id} className="guide-card-shell"><button className={`guide-card ${channels.findIndex((item) => item.id === channel.id) === channelIndex ? 'active' : ''}`} onClick={() => selectChannel(channels.findIndex((item) => item.id === channel.id))}><span className="guide-time" style={{ color: channel.accent }}>CH {String(channel.number).padStart(2, '0')}</span><strong>{channel.name}</strong><small>{channelNeedsFolder(channel) ? 'content missing · reconnect folder' : `${channel.episodes.length} ${channel.episodes.length === 1 ? 'episode' : 'episodes'} · ${channel.genre}`}</small><i style={{ background: channel.accent }} /></button></div>)}</div><div className="guide-footer"><button className="manage-channels-button" onClick={openManageChannels} disabled={isScanning}><FolderOpen size={16} /><span>{isScanning ? 'Reading folder…' : 'Manage channels'}</span><ChevronRight size={15} /></button><div className="guide-identity"><div className="brand-lockup"><div className="brand-mark"><Radio size={14} strokeWidth={2.5} /></div><div><p className="brand-name">SLOW TV</p><p className="brand-subtitle">home broadcast system</p></div></div><span className="live-clock">{clock}</span></div></div></aside>
      </div>

      {showSettings && <div className={"modal-backdrop" + (closingModal === "settings" ? " modal-closing" : "")} onClick={() => closeModal("settings")}><section className="settings-card" onClick={(event) => event.stopPropagation()}><div className="settings-heading"><div><p className="eyebrow">SYSTEM NOTES</p><h2>Make it yours</h2></div><button className="icon-button" onClick={() => closeModal("settings")} aria-label="Close settings"><X size={18} /></button></div><p className="settings-copy">Slow TV never copies your media. It remembers channel metadata in the browser and stores a local permission handle so it can read the same folders again. Export your channels if you want a portable backup.</p><div className="settings-rule" /><div className="settings-row"><div><strong>Random playback</strong><span>Never repeat the last episode in a row.</span></div><span className="setting-pill">ON</span></div><div className="settings-row"><div><strong>Folder memory</strong><span>Cookie + local browser storage, with handles in IndexedDB.</span></div><span className="setting-pill soft">LOCAL</span></div></section></div>}
      {showChannelModal && <div className={"modal-backdrop" + (closingModal === "channels" ? " modal-closing" : "")} onClick={() => closeModal("channels")}><section className="channel-manager-card" onClick={(event) => event.stopPropagation()}><div className="settings-heading"><div><p className="eyebrow">CHANNEL SETTINGS</p><h2>Manage channels</h2></div><button className="icon-button" onClick={() => closeModal("channels")} aria-label="Close channel manager"><X size={18} /></button></div><p className="channel-editor-copy">Drag channels to change their order. Add a folder, reconnect a channel, or keep a portable backup of your channel metadata.</p><div className="channel-manager-list">{channels.map((channel) => <div className={"channel-manager-row" + (dragOverChannelId === channel.id ? " drag-over" : "") + (draggingChannelId === channel.id ? " dragging" : "")} key={channel.id} draggable onDragStart={(event) => { setDraggingChannelId(channel.id); event.dataTransfer.effectAllowed = "move"; event.dataTransfer.setData("text/plain", channel.id); }} onDragOver={(event) => { event.preventDefault(); event.dataTransfer.dropEffect = "move"; if (dragOverChannelId !== channel.id) setDragOverChannelId(channel.id); }} onDrop={(event) => { event.preventDefault(); const draggedId = event.dataTransfer.getData("text/plain") || draggingChannelId; if (draggedId) reorderChannels(draggedId, channel.id); setDraggingChannelId(null); setDragOverChannelId(null); }} onDragEnd={() => { setDraggingChannelId(null); setDragOverChannelId(null); }}><span className="channel-drag-handle" aria-hidden="true"><GripVertical size={15} /></span><span className="channel-manager-swatch" style={{ background: channel.accent }} /><div className="channel-manager-copy"><strong><span>CH {String(channel.number).padStart(2, "0")}</span>{channel.name}</strong><small>{channel.source === "folder" ? channel.folderPath ?? "local folder" : "demo channel"}{channelNeedsFolder(channel) ? " · CONTENT MISSING · CHOOSE FOLDER" : " · " + channel.episodes.length + " episodes"}</small></div><div className="channel-manager-row-actions"><button className="channel-manager-edit" onClick={() => openEditChannelModal(channel)} aria-label={"Edit " + channel.name}><Edit3 size={14} /> Edit</button><button className="channel-manager-delete" onClick={() => setChannelPendingDelete(channel)} aria-label={"Delete " + channel.name}><Trash2 size={14} /> Delete</button></div></div>)}</div><div className="channel-manager-actions"><button type="button" className="manage-add-button" onClick={openNewChannelModal} disabled={isScanning}><FolderOpen size={15} /> Add channel</button><div className="guide-actions"><button className="guide-text-button" onClick={() => importInputRef.current?.click()}>Import</button><button className="guide-text-button" onClick={exportChannels}>Export</button></div></div>{channelEditorOpen && <div className="channel-editor-panel"><div className="channel-editor-panel-heading"><div><p className="eyebrow">{editingChannelId ? 'EDIT CHANNEL' : 'NEW CHANNEL'}</p><h3>{editingChannelId ? 'Update channel' : 'Add a channel'}</h3></div><button type="button" className="icon-button small" onClick={() => setChannelEditorOpen(false)} aria-label="Close channel form"><X size={16} /></button></div><form onSubmit={submitChannelEditor}><div className="channel-form-grid"><label><span>Channel number</span><input type="number" min="1" max="99" value={channelDraft.number} onChange={(event) => setChannelDraft((draft) => ({ ...draft, number: Number(event.target.value) }))} /></label><label><span>Channel name</span><input autoFocus value={channelDraft.name} placeholder="e.g. Saturday cartoons" onChange={(event) => setChannelDraft((draft) => ({ ...draft, name: event.target.value }))} /></label></div><label className="channel-form-full"><span>Colour</span><div className="channel-palette">{channelPalette.map((color) => <button key={color} type="button" className={`color-swatch ${channelDraft.color === color ? 'selected' : ''}`} aria-label={`Use ${color}`} onClick={() => setChannelDraft((draft) => ({ ...draft, color }))} style={{ background: color }} />)}</div></label><label className="channel-form-full folder-path-field"><span>Content folder <em>browser reference</em></span><input className="folder-path-input" readOnly value={editingChannel?.folderPath ?? ""} placeholder={editingChannelId ? "Folder not connected — choose a folder below" : "Choose a folder after saving channel details"} /></label><label className="channel-form-full"><span>Description <em>optional</em></span><textarea rows={3} value={channelDraft.description} placeholder="A little note about what lives on this channel" onChange={(event) => setChannelDraft((draft) => ({ ...draft, description: event.target.value }))} /></label><div className="channel-editor-actions">{editingChannelId && <button type="button" className="remove-channel-button" onClick={removeEditingChannel}><Trash2 size={15} /> Remove channel</button>}{editingChannelId && <button type="button" className="folder-channel-button" onClick={openFolderForEditingChannel}><FolderOpen size={15} /> {editingChannel && channelNeedsFolder(editingChannel) ? "Choose folder" : "Change folder"}</button>}<button type="button" className="cancel-channel-button" onClick={() => setChannelEditorOpen(false)}>Cancel</button><button type="submit" className="save-channel-button">{editingChannelId ? 'Save changes' : 'Choose folder & create'}</button></div></form></div>}</section></div>}
      {channelPendingDelete && <div className={"modal-backdrop delete-modal-backdrop" + (closingModal === "delete" ? " modal-closing" : "")} onClick={() => closeModal("delete")}><section className="delete-channel-card" onClick={(event) => event.stopPropagation()}><div className="delete-channel-heading"><div className="delete-channel-icon"><Trash2 size={18} /></div><div><p className="eyebrow">CHANNEL SETTINGS</p><h2>Delete channel?</h2></div></div><p className="delete-channel-copy">Remove <strong>{channelPendingDelete.name}</strong> from your lineup? The channel entry and its saved metadata will be removed, but Slow TV will not delete or move any files in your media folder.</p><div className="delete-channel-actions"><button type="button" className="cancel-channel-button" onClick={() => closeModal("delete")}>Keep channel</button><button type="button" className="delete-confirm-button" onClick={() => removeChannel(channelPendingDelete)}><Trash2 size={15} /> Delete channel</button></div></section></div>}
      {toast && <div className={`toast toast-${toast.tone}`} role="status" aria-live="polite"><span className="toast-dot" />{toast.message}</div>}
    </main>
  );
}
