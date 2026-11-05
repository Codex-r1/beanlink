import React from "react";

export default function PageSkeleton({ rows = 3 }) {
  return (
    <div className="space-y-3">
      <div className="agri-skel h-8 w-56" />
      <div className="agri-skel h-4 w-80" />
      <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-4 mt-5">
        {Array.from({ length: rows }).map((_, i) => (
          <div key={i} className="agri-skel h-40" />
        ))}
      </div>
    </div>
  );
}