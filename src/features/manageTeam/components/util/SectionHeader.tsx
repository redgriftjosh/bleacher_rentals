export default function SectionHeader({ title, subtitle }: { title: string; subtitle: string }) {
  return (
    <div>
      <h3 className="text-lg font-semibold ">{title}</h3>
      <p className="text-xs text-gray-600 mb-2">{subtitle}</p>
    </div>
  );
}
