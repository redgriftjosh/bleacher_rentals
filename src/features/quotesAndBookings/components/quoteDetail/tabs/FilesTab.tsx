"use client";

import { Upload } from "lucide-react";

export function FilesTab({ quoteId }: { quoteId: string }) {
  return (
    <div className="space-y-6">
      {/* Upload area */}
      <div>
        <div className="flex items-center justify-between mb-3">
          <h3 className="text-xs font-bold text-gray-500 uppercase tracking-wide">Project Files</h3>
          <button className="text-xs font-medium text-darkBlue border border-darkBlue rounded px-2 py-1 hover:bg-blue-50 transition cursor-pointer flex items-center gap-1">
            <Upload className="w-3 h-3" />
            Upload File
          </button>
        </div>
        <div className="border-2 border-dashed border-gray-300 rounded-lg py-12 text-center">
          <p className="text-sm text-gray-500">Drag & drop files here</p>
          <p className="text-xs text-gray-400 mt-1">PDF, DOC, PNG, JPG, XLS, CSV</p>
        </div>
      </div>

      {/* Files table */}
      <div>
        <table className="w-full text-sm">
          <thead>
            <tr className="border-b text-left text-gray-500">
              <th className="pb-2 font-medium">File Name</th>
              <th className="pb-2 font-medium">Type</th>
              <th className="pb-2 font-medium">Size</th>
              <th className="pb-2 font-medium">Uploaded By</th>
              <th className="pb-2 font-medium">Date</th>
              <th className="pb-2 font-medium">Actions</th>
            </tr>
          </thead>
          <tbody>
            <tr>
              <td colSpan={6} className="py-6 text-center text-gray-400">
                No files uploaded yet
              </td>
            </tr>
          </tbody>
        </table>
      </div>
    </div>
  );
}
