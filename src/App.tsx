import { lazy, Suspense, useEffect, type ReactNode } from 'react';
import { BrowserRouter, Navigate, Route, Routes, useLocation } from 'react-router-dom';
import { Box, CircularProgress, Link, Typography } from '@mui/material';
import CoffeeRoundedIcon from '@mui/icons-material/CoffeeRounded';
import TopBar from './components/app/TopBar';
import Celebration from './components/app/Celebration';
import SignInNeeded from './components/app/SignInNeeded';
import { absoluteUrl, metaFor } from './game/seo';
import { prerenderedFor } from './game/prerendered';

// Each course carries every lesson, animation and answer, so each loads as its
// own chunk the first time it is opened.
const HomePage = lazy(() => import('./components/app/HomePage'));
const FoundationsPage = lazy(() => import('./components/FoundationsPage'));
const SqlPage = lazy(() => import('./components/SqlPage'));
const SystemDesignPage = lazy(() => import('./components/SystemDesignPage'));

/** The same Buy Me a Coffee page that hamropedia.com links to. */
const SUPPORT_URL = 'https://buymeacoffee.com/manojthapa';

/** While a course loads: the page's own text from the build if there is one, else a spinner. */
const PageLoading = () => {
    const { pathname } = useLocation();
    const html = prerenderedFor(pathname);
    if (html) return <Box dangerouslySetInnerHTML={{ __html: html }} />;
    return (
        <Box sx={{ display: 'flex', justifyContent: 'center', py: 10 }}>
            <CircularProgress aria-label="Loading" />
        </Box>
    );
};

const setHead = (selector: string, attribute: string, value: string, create: () => HTMLElement) => {
    const element = document.head.querySelector(selector) ?? document.head.appendChild(create());
    element.setAttribute(attribute, value);
};

/**
 * On every change of page: the tab title, description and canonical address
 * follow the page (the build writes the same ones into each page's HTML).
 */
const PageChange = () => {
    const { pathname } = useLocation();
    useEffect(() => {
        const meta = metaFor(pathname);
        document.title = meta.title;
        setHead('meta[name="description"]', 'content', meta.description, () => Object.assign(document.createElement('meta'), { name: 'description' }));
        setHead('link[rel="canonical"]', 'href', absoluteUrl(meta.path), () => Object.assign(document.createElement('link'), { rel: 'canonical' }));
        window.scrollTo(0, 0);
    }, [pathname]);
    return null;
};

const Page = ({ children }: { children: ReactNode }) => <Suspense fallback={<PageLoading />}>{children}</Suspense>;

const App = () => (
    <BrowserRouter>
        <PageChange />
        <Box sx={{ minHeight: '100vh', bgcolor: 'background.default', display: 'flex', flexDirection: 'column' }}>
            <TopBar />
            <Box component="main" sx={{ flex: 1, minWidth: 0, pt: { xs: 3, md: 4 }, pb: 6, px: { xs: 2, sm: '5%', md: '8%' } }}>
                <Routes>
                    <Route path="/" element={<Page><HomePage /></Page>} />
                    <Route path="/foundations/*" element={<Page><FoundationsPage /></Page>} />
                    <Route path="/sql/*" element={<Page><SqlPage /></Page>} />
                    <Route path="/system-design/*" element={<Page><SystemDesignPage /></Page>} />
                    <Route path="*" element={<Navigate to="/" replace />} />
                </Routes>
            </Box>
            <Box
                component="footer"
                sx={{ py: 3, px: 2, display: 'flex', flexWrap: 'wrap', alignItems: 'center', justifyContent: 'center', gap: 1.5, borderTop: '1px solid rgba(255,255,255,0.06)' }}
            >
                <Typography variant="body2" color="text.secondary">
                    Free to use.{' '}
                    <Link href="https://github.com/iammanoj807/ai-engineer-path" target="_blank" rel="noreferrer" color="inherit">
                        Source on GitHub
                    </Link>
                </Typography>
                {/* A plain link: nothing from Buy Me a Coffee loads on this site. */}
                <Link
                    href={SUPPORT_URL}
                    target="_blank"
                    rel="noopener"
                    underline="none"
                    sx={{
                        display: 'inline-flex',
                        alignItems: 'center',
                        gap: 0.75,
                        px: 1.5,
                        py: 0.5,
                        borderRadius: 999,
                        bgcolor: '#ffdd00',
                        color: '#1a1a1a',
                        fontSize: '0.85rem',
                        fontWeight: 700,
                        '&:hover': { bgcolor: '#ffe733', color: '#000' },
                    }}
                >
                    <CoffeeRoundedIcon sx={{ fontSize: 18 }} />
                    Buy me a coffee
                </Link>
            </Box>
        </Box>
        <Celebration />
        <SignInNeeded />
    </BrowserRouter>
);

export default App;
