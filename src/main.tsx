import React from 'react';
import ReactDOM from 'react-dom/client';
import { CssBaseline, ThemeProvider, createTheme } from '@mui/material';
import App from './App';
import { startAccount } from './services/account';
import './index.css';

// After a new deploy, a page left open asks for chunks that no longer exist.
// Reload once onto the new deploy; the time check stops a reload loop.
window.addEventListener('vite:preloadError', () => {
    if (!navigator.onLine) return;
    const key = 'aep:chunk-reload-at';
    try {
        if (Date.now() - Number(sessionStorage.getItem(key) ?? 0) < 30_000) return;
        sessionStorage.setItem(key, String(Date.now()));
    } catch {
        return;
    }
    window.location.reload();
});

startAccount();

const theme = createTheme({
    palette: {
        mode: 'dark',
        primary: { main: '#2979ff' },
        secondary: { main: '#00e5ff' },
        background: { default: '#0B0E14', paper: '#151921' },
        text: { primary: '#d7d2ce', secondary: '#b0bec5' },
    },
    typography: {
        fontFamily: '"Plus Jakarta Sans", "Inter", "Roboto", "Helvetica", "Arial", sans-serif',
        h1: { fontWeight: 700 },
        h2: { fontWeight: 600, fontSize: '2.5rem' },
        h3: { fontWeight: 600 },
        h4: { fontWeight: 600, fontSize: '1.75rem' },
        body1: { fontSize: '1.1rem', fontWeight: 400 },
    },
    components: {
        MuiButton: {
            styleOverrides: {
                root: { borderRadius: '8px', textTransform: 'none', fontWeight: 600 },
            },
        },
        MuiPaper: {
            styleOverrides: {
                root: { borderRadius: '12px', boxShadow: '0 4px 20px rgba(0,0,0,0.05)' },
            },
        },
    },
});

ReactDOM.createRoot(document.getElementById('root')!).render(
    <React.StrictMode>
        <ThemeProvider theme={theme}>
            <CssBaseline />
            <App />
        </ThemeProvider>
    </React.StrictMode>,
);
