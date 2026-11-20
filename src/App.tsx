import { lazy, Suspense, useEffect, type ReactNode } from 'react';
import { BrowserRouter, Navigate, Route, Routes, useLocation } from 'react-router-dom';
import { Box, CircularProgress, Link, Typography } from '@mui/material';
import TopBar from './components/app/TopBar';
import Celebration from './components/app/Celebration';
import SignInNeeded from './components/app/SignInNeeded';
import { writeLastCourse } from './game/courses';
import { placeOf } from './game/addresses';
import { absoluteUrl, metaFor } from './game/seo';
import { prerenderedFor } from './game/prerendered';

// Each course carries every lesson, animation and answer, so each loads as its
// own chunk the first time it is opened.
const HomePage = lazy(() => import('./components/app/HomePage'));
const FoundationsPage = lazy(() => import('./components/FoundationsPage'));
const SqlPage = lazy(() => import('./components/SqlPage'));
const SystemDesignPage = lazy(() => import('./components/SystemDesignPage'));

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
 * follow the page (the build writes the same ones into each page's HTML), and
 * the course is remembered so the home page continues it.
 */
const PageChange = () => {
    const { pathname } = useLocation();
    useEffect(() => {
        const place = placeOf(pathname);
        if (place) writeLastCourse(place.course.id);
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
            <Box component="footer" sx={{ py: 3, px: 2, textAlign: 'center', borderTop: '1px solid rgba(255,255,255,0.06)' }}>
                <Typography variant="body2" color="text.secondary">
                    Free to use.{' '}
                    <Link href="https://github.com/iammanoj807/ai-engineer-path" target="_blank" rel="noreferrer" color="inherit">
                        Source on GitHub
                    </Link>
                </Typography>
            </Box>
        </Box>
        <Celebration />
        <SignInNeeded />
    </BrowserRouter>
);

export default App;
