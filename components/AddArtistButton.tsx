"use client";

import React, { useState } from "react";
import AddArtistPanel from "./AddArtistPanel";

export default function AddArtistButton() {
  const [isPanelOpen, setIsPanelOpen] = useState(false);

  const handleArtistAdded = (artist: { id: number; name: string }) => {
    console.log("Artist added:", artist);
    // Optionally refresh artist list or update UI
  };

  return (
    <>
      <button
        onClick={() => setIsPanelOpen(true)}
        className="px-4 py-2 bg-blue-600 text-white rounded hover:bg-blue-700"
      >
        Add Artist
      </button>
      <AddArtistPanel
        isOpen={isPanelOpen}
        onClose={() => setIsPanelOpen(false)}
        onArtistAdded={handleArtistAdded}
      />
    </>
  );
} 