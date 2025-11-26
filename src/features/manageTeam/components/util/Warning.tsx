export default function Warning() {
  return (
    <div className="bg-yellow-50 border border-yellow-200 rounded-lg p-4">
      <p className="text-sm text-yellow-800">
        <strong>⚠️ Warning:</strong> Administrators have full access to all features and can manage
        users, delete events, and modify any data in the system.
      </p>
    </div>
  );
}
