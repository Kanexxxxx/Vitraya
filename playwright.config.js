import {defineConfig} from '@playwright/test';

export default defineConfig({
 testDir:'./test/e2e',
 timeout:90_000,
 expect:{timeout:8_000},
 fullyParallel:false,
 workers:1,
 reporter:'list',
 use:{
  channel:'msedge',
  headless:true,
  viewport:{width:1440,height:1000},
  locale:'pt-BR',
  timezoneId:'America/Sao_Paulo',
  reducedMotion:'reduce',
  acceptDownloads:true,
  actionTimeout:10_000,
  trace:'retain-on-failure',
  screenshot:'only-on-failure',
 },
});
