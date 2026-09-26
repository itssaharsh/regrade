import { defineConfig } from 'vite'
// BASE_PATH=/regrade/ for GitHub Pages; default "/" for local and other hosts
export default defineConfig({ base: process.env.BASE_PATH ?? '/' })
