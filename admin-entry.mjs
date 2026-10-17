import {requireViewer} from './access.mjs';
if(await requireViewer({admin:true})){
 await import('./admin.mjs');
 document.body.removeAttribute('data-auth-pending');
}
