import {initAdminWizard} from './admin-wizard.mjs';
import { cloud } from './cloud-client.mjs';
import { parseGoogleDriveLink } from './drive-link.mjs';
import { initMetadataPanel } from './metadata-panel.mjs';

const $ = id => document.getElementById(id);
const esc = value => String(value ?? '').replace(/[&<>"']/g, ch => ({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[ch]));
let metadataCleanup=null;
let videoWizard=null;
let authMode = 'login';
let busy = false;
let authorized = false;
let controller = null;
let revision = 0;
let rows = [];
let pendingFiles = {videoFile:null,coverFile:null,video:null,cover:null};
const maxVideoBytes = cloud.maxVideoBytes || 50 * 1024 * 1024;

function message(text, error = false) {
  $('message').textContent = text;
  $('message').classList.toggle('error', error);
  $('message').hidden = !text;
}
function errorMessage(error) {
  if (error?.name === 'AbortError') return 'Envio cancelado. O vídeo não foi publicado.';
  const reason = error?.message || '';
  if (/invalid login credentials/i.test(reason)) return 'E-mail ou senha incorretos.';
  if (/email not confirmed/i.test(reason)) return 'Confirme seu e-mail antes de entrar.';
  if (/rate limit|too many requests/i.test(reason)) return 'Muitas tentativas. Aguarde alguns minutos e tente novamente.';
  if (/fetch|network|failed to load/i.test(reason)) return 'Falha de conexão. Verifique sua internet e tente novamente.';
  return reason ? `Não foi possível concluir: ${reason}` : 'Não foi possível concluir. Tente novamente.';
}
function check(result) { if (result?.error) throw result.error; return result?.data; }
function setBusy(value) {
  busy = value;
  for (const button of document.querySelectorAll('button:not(#metadata-panel button)')) button.disabled = value && button.id !== 'cancel-upload';
  for (const field of document.querySelectorAll('input:not(#metadata-panel input),select:not(#metadata-panel select),textarea:not(#metadata-panel textarea)')) field.disabled = value;
  updateVideoSource();
  $('auth-form').setAttribute('aria-busy', String(value));
  $('video-form').setAttribute('aria-busy', String(value));
}
function updateVideoSource() {
  const drive = $('video-source').value === 'drive';
  $('drive-fields').hidden = !drive;
  $('upload-fields').hidden = drive;
  $('drive-link').required = drive;
  $('drive-link').disabled = busy || !drive;
  $('video-file').required = !drive;
  $('video-file').disabled = busy || drive;
  $('save-button').textContent = drive ? 'Salvar rascunho com link' : 'Enviar e salvar rascunho';
}
$('video-source').addEventListener('change', updateVideoSource);
function setMode(mode) {
  authMode = mode;
  const signup = mode === 'signup', reset = mode === 'reset', recovery = mode === 'recovery';
  $('auth-title').textContent = signup ? 'Criar conta de acesso' : reset ? 'Recuperar senha' : recovery ? 'Definir nova senha' : 'Entrar como administrador';
  $('auth-description').textContent = signup ? 'Confirme o e-mail enviado para sua caixa de entrada. A conta só poderá administrar se seu e-mail estiver autorizado no servidor.' : reset ? 'Enviaremos um link para você definir uma nova senha.' : recovery ? 'Escolha uma nova senha com pelo menos 8 caracteres.' : 'Use seu e-mail autorizado e sua senha. Ter uma conta não concede permissão para publicar.';
  $('auth-submit').textContent = signup ? 'Criar conta e confirmar e-mail' : reset ? 'Enviar link de recuperação' : recovery ? 'Salvar nova senha' : 'Entrar';
  $('password-label').hidden = reset;
  $('password').required = !reset;
  $('password').autocomplete = signup || recovery ? 'new-password' : 'current-password';
  $('email-label').hidden = recovery;
  $('email').required = !recovery;
  $('password').value = '';
  for (const button of document.querySelectorAll('[data-mode]')) button.hidden = button.dataset.mode === mode || recovery;
}
async function refreshAccess() {
  if (!cloud.ready || busy) return;
  const current = ++revision;
  try {
    // Server-validated identity, never infer authorization from a cached session.
    const {data,error} = await cloud.client.auth.getUser();
    if (current !== revision) return;
    if (error && data?.user) throw error;
    const user = data?.user;
    authorized = user ? Boolean(await cloud.isAdmin()) : false;
    if(!authorized)videoWizard?.clearPreview();
    if (current !== revision) return;
    $('auth').hidden = Boolean(user) && authMode !== 'recovery';
    $('denied').hidden = !user || authorized || authMode === 'recovery';
    $('workspace').hidden = !authorized || authMode === 'recovery';
    if (authorized && authMode !== 'recovery') {if(!metadataCleanup&&typeof cloud.metadata==='function')metadataCleanup=initMetadataPanel({cloud,root:$('metadata-panel')});await refreshVideos();}
    else if(!authorized&&metadataCleanup){metadataCleanup.destroy();metadataCleanup=null;}
  } catch (error) {
    authorized = false;if(metadataCleanup){metadataCleanup.destroy();metadataCleanup=null;}
    $('workspace').hidden = true;
    $('auth').hidden = false;
    message(errorMessage(error), true);
  }
}
async function refreshVideos() {
  if (!authorized) return;
  $('video-list').textContent = 'Carregando vídeos…';
  try {
    rows = await cloud.listAdminVideos();
    $('video-list').innerHTML = rows.length ? rows.map(row => `<article class="video-row"><div><h3>${esc(row.title)}</h3><p>${row.status === 'published' ? 'Publicado no catálogo' : 'Rascunho · visível apenas no painel'}${row.created_at ? ` · ${esc(new Date(row.created_at).toLocaleDateString('pt-BR'))}` : ''}</p></div><div class="actions"><button data-publish="${esc(row.id)}">${row.status === 'published' ? 'Retirar do catálogo' : 'Publicar'}</button><button class="danger" data-delete="${esc(row.id)}">Excluir</button></div></article>`).join('') : '<p>Nenhum vídeo ainda. Envie o primeiro e salve como rascunho.</p>';
  } catch (error) {
    $('video-list').textContent = 'A lista não pôde ser carregada. Use Atualizar lista para tentar novamente.';
    message(errorMessage(error), true);
  }
}
const redirectTo = new URL('admin.html', location.href).href;
$('auth-form').addEventListener('submit', async event => {
  event.preventDefault();
  if (busy || !cloud.ready) return;
  const email = $('email').value.trim();
  const password = $('password').value;
  setBusy(true);
  message('');
  try {
    if (authMode === 'signup') {
      const data = check(await cloud.client.auth.signUp({email,password,options:{emailRedirectTo:redirectTo}}));
      if (data?.session) {
        await cloud.client.auth.signOut();
        message('Conta criada. A confirmação de e-mail deve ser habilitada pelo responsável antes de liberar o painel. Entre novamente quando a configuração estiver concluída.');
      } else message('Se o cadastro estiver disponível para este e-mail, você receberá uma mensagem de confirmação. Confira também o spam; depois volte para entrar.');
      setMode('login');
    } else if (authMode === 'reset') {
      check(await cloud.client.auth.resetPasswordForEmail(email,{redirectTo}));
      message('Se houver uma conta para este e-mail, você receberá um link para redefinir a senha. Confira também o spam.');
    } else if (authMode === 'recovery') {
      check(await cloud.client.auth.updateUser({password}));
      setMode('login');
      message('Senha atualizada com sucesso.');
    } else {
      check(await cloud.client.auth.signInWithPassword({email,password}));
      message('');
    }
  } catch (error) { message(errorMessage(error), true); }
  finally { $('password').value = ''; setBusy(false); await refreshAccess(); }
});
for (const button of document.querySelectorAll('[data-mode]')) button.addEventListener('click', () => { if (!busy) { setMode(button.dataset.mode); message(''); } });
for (const button of document.querySelectorAll('[data-signout]')) button.addEventListener('click', async () => {
  if (busy) return;
  setBusy(true);
  try { check(await cloud.client.auth.signOut()); authorized = false; rows = []; $('video-list').textContent = ''; setMode('login'); message('Você saiu da conta.'); }
  catch (error) { message(errorMessage(error), true); }
  finally { setBusy(false); await refreshAccess(); }
});
$('change-password').addEventListener('click',()=>{if(!busy&&authorized){setMode('recovery');$('auth').hidden=false;$('workspace').hidden=true;message('Defina sua nova senha.');$('password').focus();}});
$('refresh').addEventListener('click', () => { if (!busy) refreshVideos(); });
$('cancel-upload').addEventListener('click', () => { controller?.abort(); $('cancel-upload').disabled = true; $('upload-label').textContent = 'Cancelando envio…'; });
$('video-form').addEventListener('submit', async event => {
  event.preventDefault();
  if (busy || !authorized) return;
  const form = event.currentTarget;
  const values = new FormData(form);
  const video = values.get('video');
  const cover = values.get('cover');
  const drive = values.get('video_source') === 'drive';
  let normalizedDrive = null;
  if (drive) {
    try { normalizedDrive = parseGoogleDriveLink(String(values.get('drive_url') || '').trim()); }
    catch { return message('Cole um link válido de arquivo do Google Drive. Use Compartilhar → Copiar link; links de pastas não são aceitos.', true); }
  }
  if (!drive && (!(video instanceof File) || !video.size || !/\.mp4$/i.test(video.name) || (video.type && video.type !== 'video/mp4'))) return message('Escolha um arquivo MP4 válido. H.264 com áudio AAC oferece maior compatibilidade.', true);
  if (!drive && video.size > maxVideoBytes) return message(`O limite atual por vídeo é ${Math.floor(maxVideoBytes / 1024 / 1024)} MiB. Para arquivos maiores, configure um serviço de vídeo com envio retomável.`, true);
  if (cover?.size && (cover.size > 5 * 1024 * 1024 || !['image/jpeg','image/png','image/webp'].includes(cover.type))) return message('A capa deve ser JPG, PNG ou WebP de até 5 MiB.', true);
  const payload = {
    title:String(values.get('title')).trim(), synopsis:String(values.get('synopsis')).trim(),
    age:values.get('age') === 'L' ? 0 : Number(values.get('age')), minutes:Number(values.get('minutes')), year:Number(values.get('year')),
    genres:[...new Set(String(values.get('genres')).split(',').map(v => v.trim()).filter(Boolean))],
    kind:String(values.get('kind')), director:String(values.get('director')).trim(), credit:String(values.get('credit')).trim(), status:'draft',
    video_source:drive ? 'drive' : 'upload', drive_url:normalizedDrive?.shareUrl || null, video_path:null
  };
  if (!values.get('age')) return message('Selecione a classificação indicativa antes de salvar.', true);
  if (!payload.title || !payload.synopsis || !payload.credit) return message('Preencha título, descrição e créditos.', true);
  controller = new AbortController();
  const signal = controller.signal;
  setBusy(true); message('');
  $('upload-state').hidden = false; $('cancel-upload').hidden = false; $('upload-progress').value = 0;
  $('upload-label').textContent = drive ? 'Préparando cadastro do link…' : 'Preparando envio…';
  try {
    if (!await cloud.isAdmin()) throw new Error('Sua permissão de administrador não está disponível. Entre novamente.');
    if (cover?.size) {
      $('upload-label').textContent = 'Enviando capa…';
      if (pendingFiles.coverFile !== cover) { pendingFiles.coverFile = cover; pendingFiles.cover = null; }
      pendingFiles.cover ||= await cloud.uploadCover(cover);
    } else { pendingFiles.coverFile = null; pendingFiles.cover = null; }
    if (signal.aborted) throw new DOMException('Cancelado', 'AbortError');
    if (!drive) {
      if (pendingFiles.videoFile !== video) { pendingFiles.videoFile = video; pendingFiles.video = null; }
      if (!pendingFiles.video) pendingFiles.video = await cloud.uploadVideo(video,{signal,onProgress(value) {
        const percentage = typeof value === 'number' ? value : value?.percent;
        if (Number.isFinite(percentage)) { $('upload-progress').value = Math.min(100,Math.max(0,percentage)); $('upload-label').textContent = `Enviando vídeo: ${Math.round(percentage)}%`; }
        else { $('upload-progress').removeAttribute('value'); $('upload-label').textContent = 'Enviando vídeo…'; }
      }});
      if (signal.aborted) throw new DOMException('Cancelado', 'AbortError');
      payload.video_path = pendingFiles.video.path;
    }
    $('upload-label').textContent = 'Salvando rascunho…';
    payload.image_path = pendingFiles.cover?.path || null;
    await cloud.saveVideo(payload);
    pendingFiles = {videoFile:null,coverFile:null,video:null,cover:null};
    form.reset();
    message('Rascunho salvo. Confira o título na lista e toque em Publicar para disponibilizar no catálogo.');
    await refreshVideos();
  } catch (error) {
    message(`${errorMessage(error)}${pendingFiles.video || pendingFiles.cover ? ' Um arquivo já pode ter sido enviado ao armazenamento, mas o vídeo não foi publicado. Confira o painel antes de tentar novamente.' : ''}`, true);
  } finally {
    controller = null; $('upload-state').hidden = true; $('cancel-upload').hidden = true; setBusy(false);
  }
});
$('video-list').addEventListener('click', async event => {
  const button = event.target.closest('button');
  if (!button || busy || !authorized) return;
  const id = button.dataset.publish || button.dataset.delete;
  const row = rows.find(video => video.id === id);
  if (!row) return;
  const deleting = Boolean(button.dataset.delete);
  const publishing = row.status !== 'published';
  const question = deleting ? `Excluir “${row.title}”? O registro será retirado do catálogo. O arquivo do Google Drive não será apagado. Essa ação não pode ser desfeita.` : publishing ? `Publicar “${row.title}” no catálogo para os usuários do site?` : `Retirar “${row.title}” do catálogo? Ele continuará como rascunho no painel.`;
  if (!window.confirm(question)) return;
  setBusy(true); message('');
  try {
    if (!await cloud.isAdmin()) throw new Error('Sua permissão de administrador expirou.');
    if (deleting) await cloud.deleteVideo(id); else await cloud.setPublished(id,publishing);
    message(deleting ? 'Registro excluído do catálogo. O arquivo do Google Drive não foi apagado.' : publishing ? 'Vídeo publicado. O catálogo online pode receber a atualização.' : 'Vídeo retirado do catálogo e mantido como rascunho.');
    await refreshVideos();
  } catch (error) { message(errorMessage(error), true); }
  finally { setBusy(false); }
});
$('video-limit').textContent = `MP4 · até ${Math.floor(maxVideoBytes / 1024 / 1024)} MiB · H.264 / AAC recomendado`;
setMode('login');
updateVideoSource();
if (!cloud.ready) $('setup').hidden = false;
else {
  // Defer async SDK work outside the auth event callback to avoid auth lock deadlocks.
  cloud.client.auth.onAuthStateChange(event => {
    if (event === 'PASSWORD_RECOVERY') { setMode('recovery'); $('auth').hidden = false; $('workspace').hidden = true; $('denied').hidden = true; }
    else setTimeout(() => { if (authMode !== 'recovery') refreshAccess(); }, 0);
  });
  refreshAccess();
}

videoWizard=initAdminWizard({form:$('video-form'),maxVideoBytes});
