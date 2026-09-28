import { defineConfig } from 'vite'
// production is on Vercel at "/"; BASE_PATH is only for serving under a sub-path
export default defineConfig({ base: process.env.BASE_PATH ?? '/' })
