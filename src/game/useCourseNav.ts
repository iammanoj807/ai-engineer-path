import { useLocation, useNavigate } from 'react-router-dom';
import type { CourseInfo } from './courses';
import { coursePath, placeOf, topicPath, unitPath } from './addresses';

/** Opening a topic or a unit is a change of address, so pages share these. */
export const useCourseNav = (course: CourseInfo) => {
    const navigate = useNavigate();
    return {
        openTopic: (topicId: string) => navigate(topicPath(course, topicId)),
        openUnit: (unitId: string) => navigate(unitPath(course, unitId)),
        backToPath: (from?: string) => navigate(coursePath(course), { state: from ? { from } : undefined }),
    };
};

/**
 * True while one lesson is open. Its page then starts with the lesson: the
 * course's own headline and introduction are for the course's front page, and
 * on a phone they would fill the first screen before the lesson began.
 */
export const useLessonOpen = (): boolean => !!placeOf(useLocation().pathname)?.topicId;
