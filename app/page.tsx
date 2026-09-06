'use client';

import {
  BookOpen,
  ChevronRight,
  CircleHelp,
  Disc3,
  FolderOpen,
  Menu,
  Pause,
  Play,
  Power,
  Radio,
  Search,
  SkipBack,
  SkipForward,
  Volume2,
  VolumeX,
  X,
} from 'lucide-react';
import { useEffect, useMemo, useRef, useState } from 'react';

type MediaItem = { id: string; name: string; path: string; src?: string; kind: 'video' | 'audio' };
type Channel = {
  id: string; number: number; name: string; callSign: string; genre: string; description: string;
  accent: string; poster?: string; folderPath?: string; episodes: MediaItem[]; source: 'demo' | 'folder';
};

const accents = ['#f09b64', '#c7d867', '#7dc8c6', '#e3bb71', '#e089a5', '#9d9fe2'];
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
const titleCase = (value: string) => value.replace(/[_./-]+/g, ' ').replace(/\s+/g, ' ').trim().replace(/\b\w/g, (letter) => letter.toUpperCase());
const cleanSummary = (summary?: string) => (summary ?? '').replace(/<[^>]*>/g, '').replace(/&amp;/g, '&').trim();

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

function channelFromFiles(folderName: string, files: { path: string; file: File }[], index: number): Channel {
  const episodes = files.map(({ path, file }, episodeIndex) => ({
    id: `${folderName}-${episodeIndex}-${file.name}`, name: titleCase(file.name.replace(/\.[^.]+$/, '')), path,
    src: URL.createObjectURL(file), kind: audioExtensions.has(extensionOf(file.name)) ? ('audio' as const) : ('video' as const),
  }));
  return { id: `folder-${folderName}-${index}`, number: 20 + index, name: titleCase(folderName), callSign: `${String(index + 1).padStart(2, '0')} / ${String(20 + index).padStart(2, '0')}`, genre: 'your library', description: `${episodes.length} local ${episodes.length === 1 ? 'file' : 'files'} from ${folderName}.`, accent: accents[index % accents.length], folderPath: folderName, episodes, source: 'folder' };
}

export default function Home() {
  const [channels, setChannels] = useState<Channel[]>(demoChannels);
  const [channelIndex, setChannelIndex] = useState(0);
  const [episodeIndex, setEpisodeIndex] = useState(0);
  const [recentlyPlayed, setRecentlyPlayed] = useState<string[]>([]);
  const [isOn, setIsOn] = useState(true);
  const [isPlaying, setIsPlaying] = useState(false);
  const [isMuted, setIsMuted] = useState(false);
  const [showGuide, setShowGuide] = useState(true);
  const [showSettings, setShowSettings] = useState(false);
  const [status, setStatus] = useState('ready for a slow afternoon');
  const [isScanning, setIsScanning] = useState(false);
  const [search, setSearch] = useState('');
  const [clock, setClock] = useState('12:42');
  const videoRef = useRef<HTMLVideoElement>(null);
  const audioRef = useRef<HTMLAudioElement>(null);
  const inputRef = useRef<HTMLInputElement>(null);
  const objectUrlsRef = useRef<string[]>([]);
  const currentChannel = channels[channelIndex] ?? channels[0];
  const currentEpisode = currentChannel?.episodes[episodeIndex % currentChannel.episodes.length];
  const visibleChannels = useMemo(() => channels.filter((channel) => channel.name.toLowerCase().includes(search.toLowerCase())), [channels, search]);

  useEffect(() => {
    const timer = window.setInterval(() => setClock(new Intl.DateTimeFormat('en-AU', { hour: '2-digit', minute: '2-digit', hour12: false }).format(new Date())), 30_000);
    return () => window.clearInterval(timer);
  }, []);

  useEffect(() => {
    const onKeyDown = (event: KeyboardEvent) => {
      if (event.key === 'ArrowUp') changeChannel(1);
      if (event.key === 'ArrowDown') changeChannel(-1);
      if (event.key === ' ') { event.preventDefault(); setIsPlaying((playing) => !playing); }
      if (event.key.toLowerCase() === 'm') setIsMuted((muted) => !muted);
    };
    window.addEventListener('keydown', onKeyDown);
    return () => window.removeEventListener('keydown', onKeyDown);
  });

  useEffect(() => {
    const media = currentEpisode?.kind === 'audio' ? audioRef.current : videoRef.current;
    if (!media || !currentEpisode?.src || !isOn) return;
    media.load();
    if (isPlaying) void media.play().catch(() => setStatus('press play to start this file'));
  }, [currentEpisode, isOn, isPlaying]);

  useEffect(() => () => objectUrlsRef.current.forEach((url) => URL.revokeObjectURL(url)), []);

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

  async function loadDirectory(directory: any, directoryName: string) {
    setIsScanning(true); setStatus('looking through your tapes…');
    try {
      const files = await collectFiles(directory); const grouped = new Map<string, { path: string; file: File }[]>();
      files.forEach((item) => { const rootFolder = item.path.split('/')[0] || directoryName; grouped.set(rootFolder, [...(grouped.get(rootFolder) ?? []), item]); });
      const channelOffset = channels.length;
      const nextChannels = Array.from(grouped.entries()).map(([folder, folderFiles], index) => { const localChannel = channelFromFiles(folder, folderFiles, channelOffset + index); objectUrlsRef.current.push(...localChannel.episodes.flatMap((episode) => episode.src ?? [])); return localChannel; });
      if (!nextChannels.length) { setStatus('no playable files found in that folder'); return; }
      const matched = await matchShows(nextChannels); setChannels((existing) => [...existing, ...matched]); setChannelIndex(channelOffset); setEpisodeIndex(0); setIsPlaying(true); setStatus(`${matched.length} new ${matched.length === 1 ? 'channel' : 'channels'} added · show details matched`);
    } catch { setStatus('folder access was cancelled'); } finally { setIsScanning(false); }
  }

  async function chooseFolder() {
    const picker = (window as Window & { showDirectoryPicker?: () => Promise<any> }).showDirectoryPicker;
    if (picker) { try { const directory = await picker(); await loadDirectory(directory, directory.name); } catch { setStatus('folder access was cancelled'); } }
    else inputRef.current?.click();
  }

  async function handleInput(event: React.ChangeEvent<HTMLInputElement>) {
    const files = Array.from(event.target.files ?? []); if (!files.length) return;
    setIsScanning(true); setStatus('looking through your tapes…');
    const grouped = new Map<string, { path: string; file: File }[]>();
    files.forEach((file) => { const path = file.webkitRelativePath || file.name; const rootFolder = path.split('/')[0] || 'my library'; grouped.set(rootFolder, [...(grouped.get(rootFolder) ?? []), { path, file }]); });
    const channelOffset = channels.length;
    const nextChannels = Array.from(grouped.entries()).map(([folder, folderFiles], index) => channelFromFiles(folder, folderFiles, channelOffset + index));
    objectUrlsRef.current.push(...nextChannels.flatMap((channel) => channel.episodes.flatMap((episode) => episode.src ?? [])));
    const matched = await matchShows(nextChannels); setChannels((existing) => [...existing, ...matched]); setChannelIndex(channelOffset); setEpisodeIndex(0); setIsPlaying(true); setIsScanning(false); setStatus(`${matched.length} new ${matched.length === 1 ? 'channel' : 'channels'} added · show details matched`); event.target.value = '';
  }

  return (
    <main className="app-shell">
      <header className="topbar">
        <div className="brand-lockup"><div className="brand-mark"><Radio size={17} strokeWidth={2.5} /></div><div><p className="brand-name">SLOW TV</p><p className="brand-subtitle">home broadcast system</p></div></div>
        <div className="status-line"><span className="status-dot" /> {isScanning ? 'scanning library' : status}</div>
        <div className="topbar-actions"><span className="live-clock">{clock}</span><button className="icon-button" aria-label="Open help" onClick={() => setShowSettings((open) => !open)}><CircleHelp size={17} /></button><button className="icon-button mobile-menu" aria-label="Toggle guide" onClick={() => setShowGuide((open) => !open)}><Menu size={18} /></button></div>
      </header>

      <div className="layout-grid">
        <input ref={inputRef} className="sr-only" type="file" multiple accept="video/*,audio/*" onChange={handleInput} {...({ webkitdirectory: 'true', directory: 'true' } as any)} />

        <section className="tv-stage" aria-label="Television player">
          <div className="tv-topline"><span>MODEL STV-90</span><span>STEREO / NTSC</span></div>
          <div className="television"><div className="antenna antenna-left" /><div className="antenna antenna-right" /><div className="tv-body">
            <div className="tv-wood-grain" /><div className="screen-bezel"><div className="screen-glass"><div className="screen-content">
              {!isOn ? <div className="off-screen"><div className="off-dot" /></div> : currentEpisode?.src ? currentEpisode.kind === 'audio' ? <div className="audio-screen"><Disc3 size={68} /><span>audio only</span><strong>{currentEpisode.name}</strong><audio ref={audioRef} src={currentEpisode.src} muted={isMuted} onEnded={nextEpisode} /></div> : <video ref={videoRef} src={currentEpisode.src} muted={isMuted} onEnded={nextEpisode} playsInline /> : <div className="demo-screen" style={{ '--channel-accent': currentChannel.accent } as React.CSSProperties}><div className="demo-haze" /><div className="demo-bloom" /><div className="demo-copy"><span>NOW BROADCASTING</span><strong>{currentChannel.name}</strong><small>{currentEpisode?.name}</small></div><div className="demo-signal">{isPlaying ? 'PLAYING' : 'PAUSED'} <i>•</i> {currentChannel.callSign}</div></div>}
              <div className="scanlines" /><div className="screen-vignette" />{isOn && <div className="screen-overlay"><span>CH {String(currentChannel?.number ?? 0).padStart(2, '0')}</span><span>{isMuted ? 'MUTE' : 'STEREO'}</span></div>}
            </div></div></div>
            <div className="speaker-panel"><div className="speaker-grille">{Array.from({ length: 42 }).map((_, index) => <i key={index} />)}</div><span>slow tv</span></div>
            <div className="control-panel"><div className="brand-stamp">SLOW<br /><b>TV</b></div><div className="knob-cluster"><button className="knob-button" aria-label="Previous channel" onClick={() => changeChannel(-1)}><span className="knob" style={{ '--knob-rotation': `${channelIndex * 32 - 22}deg` } as React.CSSProperties} /><small>CHANNEL</small></button><button className="knob-button" aria-label="Toggle mute" onClick={() => setIsMuted((muted) => !muted)}><span className="knob volume" style={{ '--knob-rotation': `${isMuted ? -70 : 18}deg` } as React.CSSProperties} /><small>VOLUME</small></button></div><button className={`power-button ${isOn ? 'active' : ''}`} aria-label={isOn ? 'Turn television off' : 'Turn television on'} onClick={() => { setIsOn((on) => !on); setIsPlaying(false); }}><Power size={14} /><span>POWER</span></button></div>
          </div></div>
          <div className="tv-controls"><div className="transport"><button aria-label="Previous episode" onClick={previousEpisode}><SkipBack size={17} /></button><button className="play-button" aria-label={isPlaying ? 'Pause' : 'Play'} onClick={() => isOn && setIsPlaying((playing) => !playing)}>{isPlaying ? <Pause size={20} fill="currentColor" /> : <Play size={20} fill="currentColor" />}</button><button aria-label="Next random episode" onClick={nextEpisode}><SkipForward size={17} /></button></div><div className="now-playing"><span className="eyebrow">NOW PLAYING</span><strong>{currentEpisode?.name ?? 'no tape selected'}</strong><span>{currentChannel?.name} · {currentChannel?.genre}</span></div><button className="mute-button" aria-label={isMuted ? 'Unmute' : 'Mute'} onClick={() => setIsMuted((muted) => !muted)}>{isMuted ? <VolumeX size={17} /> : <Volume2 size={17} />}</button></div>
          <div className="channel-ticker"><span>◀</span><b>{currentChannel?.callSign}</b><span>{currentChannel?.description}</span><span>▶</span></div>
        </section>

        {showGuide && <aside className="guide-rail"><div className="guide-header"><div><p className="eyebrow">CHANNEL GUIDE</p><h2>What’s on</h2></div><BookOpen size={18} /></div><label className="search-box"><Search size={16} /><input value={search} onChange={(event) => setSearch(event.target.value)} placeholder="Find a channel" /><kbd>/</kbd></label><div className="guide-list">{visibleChannels.map((channel) => <button key={channel.id} className={`guide-card ${channels.findIndex((item) => item.id === channel.id) === channelIndex ? 'active' : ''}`} onClick={() => selectChannel(channels.findIndex((item) => item.id === channel.id))}><span className="guide-time" style={{ color: channel.accent }}>CH {String(channel.number).padStart(2, '0')}</span><strong>{channel.name}</strong><small>{channel.episodes.length} {channel.episodes.length === 1 ? 'episode' : 'episodes'} · {channel.genre}</small><i style={{ background: channel.accent }} /></button>)}</div><div className="guide-footer"><button className="new-channel-button" onClick={chooseFolder} disabled={isScanning}><FolderOpen size={16} /><span>{isScanning ? 'Reading folder…' : 'New channel'}</span><ChevronRight size={15} /></button><div className="guide-hints"><span><span className="keycap">↑</span><span className="keycap">↓</span> tune</span><span><span className="keycap">space</span> pause</span></div></div></aside>}
      </div>

      {showSettings && <div className="modal-backdrop" onClick={() => setShowSettings(false)}><section className="settings-card" onClick={(event) => event.stopPropagation()}><div className="settings-heading"><div><p className="eyebrow">SYSTEM NOTES</p><h2>Make it yours</h2></div><button className="icon-button" onClick={() => setShowSettings(false)} aria-label="Close settings"><X size={18} /></button></div><p className="settings-copy">Slow TV treats each folder as a channel. Use <strong>New channel</strong> at the bottom of the guide to add shows, movies, or tape piles from your computer.</p><div className="settings-rule" /><div className="settings-row"><div><strong>Random playback</strong><span>Never repeat the last episode in a row.</span></div><span className="setting-pill">ON</span></div><div className="settings-row"><div><strong>Show matching</strong><span>Folder names are checked against TVMaze for show details.</span></div><span className="setting-pill soft">AUTO</span></div></section></div>}
    </main>
  );
}
