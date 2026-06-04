"use client";

import { use } from "react";
import { useRouter } from "next/navigation";
import { ArrowLeft, Download } from "lucide-react";

export default function QuotePreviewPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = use(params);
  const router = useRouter();
  const pdfUrl = `/api/quotes/${id}/pdf`;

  return (
    <div className="h-screen flex flex-col">
      {/* Toolbar */}
      <div className="flex items-center justify-between px-4 py-2 border-b bg-white shrink-0">
        <button
          onClick={() => router.back()}
          className="flex items-center gap-2 text-sm text-gray-600 hover:text-gray-900 transition cursor-pointer"
        >
          <ArrowLeft className="w-4 h-4" />
          Back
        </button>
        <div className="flex items-center gap-3">
          <a
            href={pdfUrl}
            download
            className="flex items-center gap-2 px-3 py-1.5 text-sm font-medium text-gray-700 border border-gray-300 rounded-sm hover:bg-gray-50 transition"
          >
            <Download className="w-4 h-4" />
            Download PDF
          </a>
        </div>
      </div>

      {/* PDF embed */}
      <iframe
        src={pdfUrl}
        className="flex-1 w-full"
        title="Quote PDF Preview"
      />
    </div>
  );
}
