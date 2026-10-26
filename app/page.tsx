import { requireChatGPTUser } from "./chatgpt-auth";
import AttendanceDashboard from "./attendance-dashboard";

export const dynamic = "force-dynamic";

export default async function Home() {
  const user = await requireChatGPTUser("/");
  return <AttendanceDashboard instructorName={user.displayName} />;
}
