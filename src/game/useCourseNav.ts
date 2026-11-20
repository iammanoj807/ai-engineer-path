import { useNavigate } from 'react-router-dom';
import type { CourseInfo } from './courses';

/** Opening a topic or a unit is a change of address, so pages share these. */
export const useCourseNav = (course: CourseInfo) => {
    const navigate = useNavigate();
    return {
        openTopic: (topicId: string) => navigate({ pathname: course.route, search: `?topic=${encodeURIComponent(topicId)}` }),
        openUnit: (unitId: string) => navigate({ pathname: course.route, search: `?unit=${encodeURIComponent(unitId)}` }),
        backToPath: (from?: string) => navigate({ pathname: course.route, search: '' }, { state: from ? { from } : undefined }),
    };
};
