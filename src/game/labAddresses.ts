// The System Design Lab's addresses: the list of missions, and one page per
// mission, under the System Design course.
//   /system-design/lab/             the missions
//   /system-design/lab/<mission>/   one mission

export const LAB_PATH = '/system-design/lab/';

export const labMissionPath = (missionId: string) => `${LAB_PATH}${missionId}/`;

/** True for the Lab's own pages, with or without the last slash. */
export const isLabPath = (pathname: string) => pathname === LAB_PATH.slice(0, -1) || pathname.startsWith(LAB_PATH);
