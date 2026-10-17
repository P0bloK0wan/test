/** Original HTML5 controls. Media ownership, progress and URLs remain with the caller. */
export function mountStreamlabPlayer(video, {title = 'Vídeo', onError = () => {}} = {}) {
 if (!(video instanceof HTMLVideoElement) || !video.parentElement) return () => {};
 const nativeControls = video.controls;
 const shell = document.createElement('div'); shell.className = 'streamlab-player'; shell.tabIndex = 0;
 shell.setAttribute('role', 'region'); shell.setAttribute('aria-label', `Player de ${title}`);
 video.before(shell); shell.append(video);
 const controls = document.createElement('div'); controls.className = 'sl-controls';
 controls.innerHTML = `<div class="sl-seek-row"><span class="sl-sr">Posição do vídeo</span><input class="sl-seek" type="range" min="0" max="0" step="0.1" value="0" aria-label="Posição do vídeo" disabled><output class="sl-time">0:00 / 0:00</output></div><div class="sl-buttons"><button type="button" data-sl="play" aria-label="Reproduzir">▶</button><button type="button" data-sl="back" aria-label="Voltar 10 segundos">−10s</button><button type="button" data-sl="forward" aria-label="Avançar 10 segundos">+10s</button><button type="button" data-sl="mute" aria-label="Silenciar">Som</button><input class="sl-volume" type="range" min="0" max="1" step="0.05" value="1" aria-label="Volume"><label class="sl-speed">Velocidade<select aria-label="Velocidade de reprodução"><option value="0.5">0,5×</option><option value="0.75">0,75×</option><option value="1" selected>1×</option><option value="1.25">1,25×</option><option value="1.5">1,5×</option><option value="2">2×</option></select></label><button type="button" data-sl="pip" hidden aria-label="Abrir em janela flutuante">Janela</button><button type="button" data-sl="fullscreen" hidden aria-label="Tela cheia">⛶</button></div><p class="sl-status" role="status" aria-live="polite"></p>`;
 shell.append(controls);
 const controller = new AbortController(); const {signal} = controller;
 const find = selector => controls.querySelector(selector);
 const play = find('[data-sl="play"]'), mute = find('[data-sl="mute"]'), seek = find('.sl-seek'), volume = find('.sl-volume'), speed = find('select'), time = find('.sl-time'), status = find('.sl-status');
 const fullscreen = find('[data-sl="fullscreen"]'), pip = find('[data-sl="pip"]');
 let disposed = false, failed = false;
 const toggleMute=()=>{if(video.muted||video.volume===0){if(video.volume===0)video.volume=.5;video.muted=false;}else video.muted=true;};
 const listen = (target, type, fn) => target.addEventListener(type, fn, {signal});
 const format = seconds => {const n = Number.isFinite(seconds) ? Math.max(0, Math.floor(seconds)) : 0;return `${n >= 3600 ? `${Math.floor(n / 3600)}:` : ''}${n >= 3600 ? String(Math.floor(n / 60) % 60).padStart(2, '0') : Math.floor(n / 60)}:${String(n % 60).padStart(2, '0')}`;};
 const sync = () => {
  const duration = Number.isFinite(video.duration) && video.duration > 0 ? video.duration : 0;
  seek.disabled = !duration; seek.max = String(duration); seek.value = String(video.currentTime || 0);
  seek.setAttribute('aria-valuetext', `${format(video.currentTime)} de ${format(duration)}`);
  time.textContent = `${format(video.currentTime)} / ${format(duration)}`;
  play.textContent = video.paused ? '▶' : 'Ⅱ'; play.setAttribute('aria-label', video.paused ? 'Reproduzir' : 'Pausar');
  mute.textContent = video.muted || !video.volume ? 'Mudo' : 'Som'; mute.setAttribute('aria-label', video.muted || !video.volume ? 'Ativar som' : 'Silenciar');
  mute.setAttribute('aria-pressed', String(video.muted || !video.volume)); volume.value = String(video.muted ? 0 : video.volume); speed.value = String(video.playbackRate);
 };
 const toggle = async () => {status.textContent = '';if (video.paused) {try {await video.play();} catch {if (!disposed) status.textContent = 'Toque em reproduzir para tentar novamente.';}} else video.pause();};
 const jump = offset => {if (Number.isFinite(video.duration)) video.currentTime = Math.max(0, Math.min(video.duration, video.currentTime + offset));};
 listen(controls, 'click', async event => {
  const action = event.target.closest('[data-sl]')?.dataset.sl;
  if (action === 'play') await toggle();
  if (action === 'back') jump(-10);
  if (action === 'forward') jump(10);
  if (action === 'mute') toggleMute();
  if (action === 'fullscreen') {try {if(document.fullscreenElement === shell) await document.exitFullscreen();else if(shell.requestFullscreen) await shell.requestFullscreen();else video.webkitEnterFullscreen();} catch {status.textContent = 'Tela cheia não está disponível neste navegador.';}}
  if (action === 'pip') {try {if(document.pictureInPictureElement === video) await document.exitPictureInPicture();else await video.requestPictureInPicture();} catch {status.textContent = 'Janela flutuante indisponível para este vídeo.';}}
 });
 listen(seek, 'input', () => {if (!seek.disabled) video.currentTime = Number(seek.value);});
 listen(volume, 'input', () => {video.volume = Number(volume.value); video.muted = !video.volume;sync();});
 listen(speed, 'change', () => {video.playbackRate = Number(speed.value);});
 listen(shell, 'keydown', event => {
  if (event.target !== shell && event.target !== video) return;
  if (event.altKey || event.ctrlKey || event.metaKey) return;
  if ([' ', 'k', 'ArrowLeft', 'ArrowRight', 'm'].includes(event.key)) event.preventDefault();
  if (event.key === ' ' || event.key === 'k') void toggle();
  if (event.key === 'ArrowLeft') jump(-10);
  if (event.key === 'ArrowRight') jump(10);
  if (event.key === 'm') toggleMute();
 });
 for (const event of ['loadedmetadata', 'durationchange', 'timeupdate', 'play', 'pause', 'ended', 'volumechange', 'ratechange']) listen(video, event, sync);
 listen(document, 'fullscreenchange', () => {fullscreen.setAttribute('aria-label', document.fullscreenElement === shell ? 'Sair da tela cheia' : 'Tela cheia');});
 listen(video, 'error', event => {failed = true; video.controls = true;controls.hidden = true;onError(event);});
 fullscreen.hidden = !(document.fullscreenEnabled && shell.requestFullscreen || video.webkitEnterFullscreen);
 pip.hidden = !(document.pictureInPictureEnabled && video.requestPictureInPicture && !video.disablePictureInPicture);
 sync(); video.controls = false;
 return () => {if(disposed) return;disposed = true;controller.abort();video.controls = failed || nativeControls; shell.before(video);shell.remove();};
}
