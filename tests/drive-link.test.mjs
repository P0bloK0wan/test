import test from 'node:test';
import assert from 'node:assert/strict';
import {parseGoogleDriveLink as parse} from '../dist/drive-link.mjs';
const id='1aBcD_eF-GhIjKlMnOpQ1234567890';
test('Drive sharing variants normalize to an exact preview origin and preserve resource keys',()=>{
  for(const path of [`file/d/${id}/view?usp=sharing`,`file/d/${id}/preview`,`open?id=${id}`,`uc?export=download&id=${id}`,`download?id=${id}`]){
    const link=parse(`https://drive.google.com/${path}`);
    assert.equal(link.fileId,id);assert.equal(link.shareUrl,`https://drive.google.com/file/d/${id}/view`);assert.equal(link.embedUrl,`https://drive.google.com/file/d/${id}/preview`);
  }
  assert.equal(parse(`https://drive.google.com/file/d/${id}/view?resourcekey=0-key_ABC-1&usp=drivesdk`).embedUrl,`https://drive.google.com/file/d/${id}/preview?resourcekey=0-key_ABC-1`);
});
test('Drive parser rejects folders, credentials, scripts, hostile origins and ambiguous identifiers',()=>{
  for(const value of [null,'',`http://drive.google.com/file/d/${id}/view`,`https://drive.google.com.evil.test/file/d/${id}/view`,`https://user@drive.google.com/file/d/${id}/view`,`https://drive.google.com/drive/folders/${id}`,`javascript:alert(1)`,`https://docs.google.com/document/d/${id}/edit`,`https://drive.google.com/open?id=${id}&id=otherfile1234`,`https://drive.google.com/file/d/${id}/view?resourcekey=x%22%3E`,`https://drive.google.com/file/d/${id}/view\n`])assert.throws(()=>parse(value),TypeError);
});
