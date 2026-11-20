import { lazy, Suspense, useEffect, type ReactNode } from 'react';
import { HashRouter, Navigate, Route, Routes, useLocation } from 'react-router-dom';
import { Box, CircularProgress, Link, Typography } from '@mui/material';
import TopBar from './components/app/TopBar';
import Celebration from './components/app/Celebration';
import SignInNeeded from './components/app/SignInNeeded';
import { courseByRoute, writeLastCourse } from './game/courses';

// Each course carries every lesson, animation and answer, so each loads as its
// own chunk the first time it is opened.
const HomePage = lazy(() => import('./components/app/HomePage'));
const FoundationsPage = lazy(() => import('./components/FoundationsPage'));
const SqlPage = lazy(() => import('./components/SqlPage'));
const SystemDesignPage = lazy(() => import('./components/SystemDesignPage'));

const PageLoading = () => (
    <Box sx={{ display: 'flex', justifyContent: 'center', py: 10 }}>
        <CircularProgress aria-label="Loading" />
    </Box>
);

/** Remembers the course last opened, so the home page continues it. */
const RememberCourse = () => {
    const { pathname } = useLocation();
    useEffect(() => {
        const course = courseByRoute(pathname);
        if (course) writeLastCourse(course.id);
        window.scrollTo(0, 0);
    }, [pathname]);
    return null;
};

const Page = ({ children }: { children: ReactNode }) => <Suspense fallback={<PageLoading />}>{children}</Suspense>;

const App = () => (
    <HashRouter>
        <RememberCourse />
        <Box sx={{ minHeight: '100vh', bgcolor: 'background.default', display: 'flex', flexDirection: 'column' }}>
            <TopBar />
            <Box component="main" sx={{ flex: 1, minWidth: 0, pt: { xs: 3, md: 4 }, pb: 6, px: { xs: 2, sm: '5%', md: '8%' } }}>
                <Routes>
                    <Route path="/" element={<Page><HomePage /></Page>} />
                    <Route path="/foundations" element={<Page><FoundationsPage /></Page>} />
                    <Route path="/sql" element={<Page><SqlPage /></Page>} />
                    <Route path="/system-design" element={<Page><SystemDesignPage /></Page>} />
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
    </HashRouter>
);

export default App;
