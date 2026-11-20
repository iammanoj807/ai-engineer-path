import { useEffect, useState } from 'react';
import {
    subscribeToFoundations,
    saveFoundationCheck,
    saveFoundationBuild,
} from '../services/progress';
import type { FoundationCheckKey, FoundationsProgress } from '../services/progress';

const EMPTY: FoundationsProgress = { checks: {}, builds: {} };

/**
 * The moving part of ML Foundations: which checks and mini-builds are ticked.
 * The content itself is static and imported by the page directly.
 *
 * Only the Foundations page needs this, so it owns its own subscription
 * rather than going through a shared context.
 */
export const useFoundations = () => {
    const [progress, setProgress] = useState<FoundationsProgress>(EMPTY);

    useEffect(() => subscribeToFoundations(setProgress), []);

    const toggleCheck = async (topicId: string, check: FoundationCheckKey) => {
        const current = progress.checks[topicId]?.[check] === true;
        await saveFoundationCheck(topicId, check, !current);
    };

    const toggleBuild = async (buildId: string) => {
        await saveFoundationBuild(buildId, progress.builds[buildId] !== true);
    };

    return { progress, toggleCheck, toggleBuild };
};
