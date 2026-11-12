import { defineConfig, loadEnv } from 'vite';
import react from '@vitejs/plugin-react';
import tailwindcss from '@tailwindcss/vite';

export default defineConfig(({ mode }) => {
    const env = loadEnv(mode, '.', 'PAYDAY_');
    return {
        plugins: [react(), tailwindcss()],
        server: {
            proxy: {
                '/api': {
                    target: env.PAYDAY_API_TARGET || 'http://127.0.0.1:3000',
                    changeOrigin: true,
                },
            },
        },
    };
});
