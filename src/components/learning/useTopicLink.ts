import { useEffect, useRef } from 'react';
import { useLocation } from 'react-router-dom';

/**
 * Opens the topic named in the address (…/sql?topic=sql1-t2). The learning
 * path links straight to a topic this way, and "Continue" after a finished
 * topic opens the next one even when its page is already showing.
 */
export const useOpenTopicFromLink = (openTopic: (topicId: string) => void, exists: (topicId: string) => boolean) => {
    const { search } = useLocation();
    const latest = useRef({ openTopic, exists });
    useEffect(() => {
        latest.current = { openTopic, exists };
    });

    useEffect(() => {
        const topicId = new URLSearchParams(search).get('topic');
        if (topicId && latest.current.exists(topicId)) latest.current.openTopic(topicId);
    }, [search]);
};
