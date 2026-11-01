import test from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
const html=readFileSync(new URL('../web/index.html',import.meta.url),'utf8');
const js=readFileSync(new URL('../web/app.js',import.meta.url),'utf8');
const css=readFileSync(new URL('../web/settings-workspace.css',import.meta.url),'utf8');
test('centered settings workspace retains all sections and a single settings trigger',()=>{
 for(const id of ['settingsNav','settingsSubnav','settingsBackdrop','closeSettingsWorkspace','mainContent','search','appearance','interface','connection','security','performance','notifications','maintenance','updates','about'])assert.ok(html.includes('id="'+id+'"'),id);
 assert.match(html,/settings-workspace\.css/);
 assert.match(html,/aria-modal="true"/);
});
test('settings navigation and search move to workspace with close and keyboard support',()=>{
 assert.match(js,/workspaceTools\.append\(settingsSearch,settingsTabs\)/);
 assert.match(js,/toggleSettingsWorkspace\(workspace\.hidden\)/);
 assert.match(js,/e\.key==='Escape'/);
 assert.match(css,/#app>aside #settingsNav\{display:flex!important/);
 assert.match(css,/#app>main \.workspace-tools #settingsSubnav/);
});
