import {defineConfig} from '@playwright/test';
export default defineConfig({testDir:'./e2e',timeout:30000,use:{baseURL:'http://127.0.0.1:3000',browserName:'chromium'},webServer:{command:'node server/index.mjs',url:'http://127.0.0.1:3000/health',reuseExistingServer:false,timeout:30000}});
