'use client';

/**
 * Export Report Button Component
 * Sprint 15-16: Advanced Analytics & Reporting
 */

import React, { useState } from 'react';

interface ExportReportButtonProps {
  companyId: string;
  startDate: string;
  endDate: string;
  onExport?: (format: 'pdf' | 'csv') => void;
}

export function ExportReportButton({
  companyId,
  startDate,
  endDate,
  onExport,
}: ExportReportButtonProps) {
  const [isExporting, setIsExporting] = useState(false);
  const [showMenu, setShowMenu] = useState(false);

  const handleExport = async (format: 'pdf' | 'csv') => {
    setIsExporting(true);
    setShowMenu(false);

    try {
      if (onExport) {
        await onExport(format);
      }
      // Here you would call the actual export API
      // For now, just simulate the export
      await new Promise((resolve) => setTimeout(resolve, 1500));

      // Show success message (you can integrate with a toast notification system)
      alert(`Analytics report exported as ${format.toUpperCase()} successfully!`);
    } catch (error) {
      console.error('Export failed:', error);
      alert('Failed to export report. Please try again.');
    } finally {
      setIsExporting(false);
    }
  };

  return (
    <div className="relative" data-testid="export-report-button">
      {/* Main Button */}
      <button
        onClick={() => setShowMenu(!showMenu)}
        disabled={isExporting}
        className={`inline-flex items-center px-4 py-2 border border-transparent text-sm font-medium rounded-lg shadow-sm text-white transition-all ${
          isExporting
            ? 'bg-gray-400 cursor-not-allowed'
            : 'bg-blue-600 hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500'
        }`}
        aria-label="Export analytics report"
        aria-haspopup="true"
        aria-expanded={showMenu}
      >
        {isExporting ? (
          <>
            <svg
              className="animate-spin -ml-1 mr-2 h-4 w-4 text-white"
              fill="none"
              viewBox="0 0 24 24"
            >
              <circle
                className="opacity-25"
                cx="12"
                cy="12"
                r="10"
                stroke="currentColor"
                strokeWidth="4"
              ></circle>
              <path
                className="opacity-75"
                fill="currentColor"
                d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"
              ></path>
            </svg>
            Exporting...
          </>
        ) : (
          <>
            <svg
              className="-ml-1 mr-2 h-4 w-4"
              fill="none"
              stroke="currentColor"
              viewBox="0 0 24 24"
            >
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth={2}
                d="M12 10v6m0 0l-3-3m3 3l3-3m2 8H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z"
              />
            </svg>
            Export Report
            <svg
              className="ml-2 -mr-1 h-4 w-4"
              fill="none"
              stroke="currentColor"
              viewBox="0 0 24 24"
            >
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
            </svg>
          </>
        )}
      </button>

      {/* Dropdown Menu */}
      {showMenu && !isExporting && (
        <div
          className="absolute right-0 mt-2 w-48 rounded-lg shadow-lg bg-white ring-1 ring-black ring-opacity-5 z-10"
          role="menu"
          aria-orientation="vertical"
        >
          <div className="py-1">
            <button
              onClick={() => handleExport('pdf')}
              data-testid="export-pdf"
              className="flex items-center w-full px-4 py-2 text-sm text-gray-700 hover:bg-gray-100 transition-colors"
              role="menuitem"
            >
              <svg className="mr-3 h-5 w-5 text-red-500" fill="currentColor" viewBox="0 0 20 20">
                <path d="M4 4a2 2 0 012-2h4.586A2 2 0 0112 2.586L15.414 6A2 2 0 0116 7.414V16a2 2 0 01-2 2H6a2 2 0 01-2-2V4z" />
              </svg>
              Export as PDF
            </button>
            <button
              onClick={() => handleExport('csv')}
              data-testid="export-csv"
              className="flex items-center w-full px-4 py-2 text-sm text-gray-700 hover:bg-gray-100 transition-colors"
              role="menuitem"
            >
              <svg className="mr-3 h-5 w-5 text-green-500" fill="currentColor" viewBox="0 0 20 20">
                <path d="M4 4a2 2 0 012-2h4.586A2 2 0 0112 2.586L15.414 6A2 2 0 0116 7.414V16a2 2 0 01-2 2H6a2 2 0 01-2-2V4z" />
              </svg>
              Export as CSV
            </button>
          </div>
          <div className="border-t border-gray-100 py-1">
            <div className="px-4 py-2 text-xs text-gray-500">
              Date range: {startDate} to {endDate}
            </div>
          </div>
        </div>
      )}

      {/* Overlay to close dropdown */}
      {showMenu && (
        <div className="fixed inset-0 z-0" onClick={() => setShowMenu(false)}></div>
      )}
    </div>
  );
}
