'use client';

import React from 'react';

/**
 * Apple-style Skeleton Shimmer Components for Enterprise ERP
 * Provides ultra-smooth, high-end placeholder animations while data is fetching/refreshing.
 */

export function TableSkeleton({ rows = 5, cols = 8 }) {
  return (
    <div className="w-full flex-1 flex flex-col min-h-0 bg-white/95 rounded-2xl border border-slate-200/80 overflow-hidden shadow-xs">
      {/* Header Bar Shimmer */}
      <div className="px-4 py-3 bg-slate-50/80 border-b border-slate-200/80 flex items-center justify-between">
        <div className="flex items-center space-x-2">
          <div className="w-12 h-4 rounded-md animate-shimmer" />
          <div className="w-20 h-6 rounded-lg animate-shimmer" />
          <div className="w-28 h-6 rounded-lg animate-shimmer" />
        </div>
        <div className="w-36 h-4 rounded-md animate-shimmer" />
      </div>

      {/* Table Head Shimmer */}
      <div className="border-b border-slate-200/80 bg-slate-100/60 grid grid-cols-8 gap-4 px-4 py-3">
        {Array.from({ length: cols }).map((_, i) => (
          <div
            key={i}
            className={`h-4 rounded-md animate-shimmer ${
              i === 0 ? 'w-8' : i === 1 ? 'w-28' : i === 2 ? 'w-20' : 'w-full'
            }`}
          />
        ))}
      </div>

      {/* Table Body Shimmer Rows */}
      <div className="divide-y divide-slate-100 flex-1 overflow-hidden p-2 space-y-2">
        {Array.from({ length: rows }).map((_, rIdx) => (
          <div
            key={rIdx}
            className="grid grid-cols-8 gap-4 px-4 py-3.5 items-center rounded-xl bg-slate-50/40"
          >
            <div className="w-6 h-4 rounded-md animate-shimmer" />
            <div className="w-28 h-5 rounded-md animate-shimmer" />
            <div className="w-20 h-4 rounded-md animate-shimmer" />
            <div className="w-36 h-4 rounded-md animate-shimmer" />
            <div className="w-24 h-4 rounded-md animate-shimmer" />
            <div className="w-24 h-5 rounded-md animate-shimmer justify-self-end" />
            <div className="w-20 h-6 rounded-full animate-shimmer justify-self-center" />
            <div className="w-24 h-7 rounded-xl animate-shimmer justify-self-center" />
          </div>
        ))}
      </div>
    </div>
  );
}

export function MetricCardsSkeleton({ count = 3 }) {
  return (
    <div className={`grid grid-cols-1 md:grid-cols-${count} gap-3 w-full`}>
      {Array.from({ length: count }).map((_, i) => (
        <div
          key={i}
          className="p-4 bg-white/95 backdrop-blur-md rounded-2xl border border-slate-200/80 shadow-xs space-y-3"
        >
          <div className="flex items-center justify-between">
            <div className="w-28 h-4 rounded-md animate-shimmer" />
            <div className="w-7 h-7 rounded-xl animate-shimmer" />
          </div>
          <div className="w-36 h-7 rounded-lg animate-shimmer" />
          <div className="w-48 h-3.5 rounded-md animate-shimmer" />
        </div>
      ))}
    </div>
  );
}

export function FormSkeleton() {
  return (
    <div className="flex-1 flex flex-col min-h-0 bg-white/95 backdrop-blur-md rounded-2xl border border-slate-200/80 p-5 space-y-4 shadow-xs">
      {/* Top 4 Fields Grid */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4 p-4 rounded-xl bg-slate-50/70 border border-slate-200/60">
        {Array.from({ length: 4 }).map((_, i) => (
          <div key={i} className="space-y-1.5">
            <div className="w-24 h-3.5 rounded animate-shimmer" />
            <div className="w-full h-9 rounded-xl animate-shimmer" />
          </div>
        ))}
      </div>

      {/* Search Bar Shimmer */}
      <div className="w-full h-10 rounded-xl animate-shimmer" />

      {/* Spreadsheet Table Shimmer */}
      <div className="border border-slate-200/80 rounded-xl overflow-hidden space-y-2 p-2">
        <div className="h-9 rounded-lg animate-shimmer" />
        <div className="h-10 rounded-lg animate-shimmer" />
        <div className="h-10 rounded-lg animate-shimmer" />
      </div>

      {/* Footer Summary Shimmer */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4 pt-2">
        <div className="h-24 rounded-xl animate-shimmer" />
        <div className="h-28 rounded-xl animate-shimmer" />
      </div>
    </div>
  );
}

export default {
  TableSkeleton,
  MetricCardsSkeleton,
  FormSkeleton,
};
