"use client";

import React, { useState } from "react";
import { createClient } from "@/utils/supabase/client";

interface AddArtistPanelProps {
  isOpen: boolean;
  onClose: () => void;
  onArtistAdded: (artist: { id: number; name: string }) => void;
}

export default function AddArtistPanel({ isOpen, onClose, onArtistAdded }: AddArtistPanelProps) {
  const [isLoading, setIsLoading] = useState(false);
  const [formData, setFormData] = useState({ name: "" });
  const [error, setError] = useState<string | null>(null);
  const supabase = createClient();

  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    setFormData({ name: e.target.value });
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsLoading(true);
    setError(null);
    try {
      const { data: sessionData } = await supabase.auth.getSession();
      const accessToken = sessionData?.session?.access_token;
      const response = await fetch("/api/create-artist", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ artistData: { name: formData.name }, access_token: accessToken }),
      });
      const artist = await response.json();
      if (!response.ok) throw new Error(artist.error || "Failed to create artist");
      onArtistAdded(artist);
      onClose();
      setFormData({ name: "" });
    } catch (err: any) {
      setError(err.message || "Unknown error");
    } finally {
      setIsLoading(false);
    }
  };

  if (!isOpen) return null;

  return (
    <div className="fixed right-0 top-0 h-full w-[30%] bg-white shadow-lg p-6 overflow-y-auto z-50">
      <div className="flex justify-between items-center mb-6">
        <h2 className="text-2xl font-semibold">Add New Artist</h2>
        <button onClick={onClose} className="text-gray-500 hover:text-gray-700">✕</button>
      </div>
      <form onSubmit={handleSubmit} className="space-y-6">
        <div>
          <label htmlFor="name" className="block text-sm font-medium text-gray-700">Artist Name</label>
          <input
            type="text"
            name="name"
            id="name"
            required
            value={formData.name}
            onChange={handleInputChange}
            className="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-blue-500 focus:ring-blue-500"
            disabled={isLoading}
          />
        </div>
        {error && <div className="text-red-600 text-sm">{error}</div>}
        <div className="flex justify-end">
          <button
            type="submit"
            className="px-4 py-2 bg-blue-600 text-white rounded hover:bg-blue-700 disabled:opacity-50"
            disabled={isLoading || !formData.name.trim()}
          >
            {isLoading ? "Adding..." : "Add Artist"}
          </button>
        </div>
      </form>
    </div>
  );
} 