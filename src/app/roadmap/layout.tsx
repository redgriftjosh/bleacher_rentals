/**
 * Paints the roadmap's sunken surface full-bleed.
 *
 * The app shell's main element is the scroll container, so the background has to live
 * on a wrapper that fills it — putting it on the width-constrained content
 * container instead leaves a painted band with bare shell either side.
 */
export default function RoadmapLayout({ children }: { children: React.ReactNode }) {
  return <div className="min-h-full bg-rm-sunken">{children}</div>;
}
