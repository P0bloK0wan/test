import {requireViewer} from './access.mjs';
if(await requireViewer()){
 await import('./app.mjs');
 document.body.removeAttribute('data-auth-pending');
}
