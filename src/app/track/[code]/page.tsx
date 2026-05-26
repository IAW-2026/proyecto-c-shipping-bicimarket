import { TrackingResult } from "./TrackingResult";

export default async function TrackPage({
  params,
}: {
  params: Promise<{ code: string }>;
}) {
  const { code } = await params;
  return <TrackingResult code={decodeURIComponent(code)} />;
}
