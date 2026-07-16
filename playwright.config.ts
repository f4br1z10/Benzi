import { defineConfig } from "@playwright/test";
export default defineConfig({ testDir:"./tests/e2e",timeout:180000,fullyParallel:false,workers:1,use:{baseURL:"http://localhost:3100",trace:"retain-on-failure"},webServer:{command:"npm run dev",url:"http://localhost:3100",reuseExistingServer:true,timeout:120000} });
