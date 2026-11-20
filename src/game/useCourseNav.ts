import { useNavigate } from 'react-router-dom';
import type { CourseInfo } from './courses';
import { coursePath, topicPath, unitPath } from './addresses';

/** Opening a topic or a unit is a change of address, so pages share these. */
export const useCourseNav = (course: CourseInfo) => {
    const navigate = useNavigate();
    return {
        openTopic: (topicId: string) => navigate(topicPath(course, topicId)),
        openUnit: (unitId: string) => navigate(unitPath(course, unitId)),
        backToPath: (from?: string) => navigate(coursePath(course), { state: from ? { from } : undefined }),
    };
};
