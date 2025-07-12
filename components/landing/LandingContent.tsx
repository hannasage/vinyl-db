'use client';

import Link from 'next/link';
import { Github, Music, ArrowRight } from 'lucide-react';

export default function LandingContent() {
  return (
    <div className="relative z-20 min-h-screen flex flex-col justify-center px-6 py-12">
      {/* External Links - Above Header */}
      <div className="absolute top-8 left-1/2 transform -translate-x-1/2 sm:left-8 sm:transform-none flex flex-row gap-4 justify-center items-center">
        <Link
          href="https://github.com/yourusername/vinyl-db"
          target="_blank"
          rel="noopener noreferrer"
          className="group flex items-center gap-3 bg-white/10 backdrop-blur-sm text-white px-6 py-3 rounded-lg hover:bg-white/20 transition-all duration-300 border border-white/20"
        >
          <Github className="w-5 h-5" />
          <span>Github</span>
        </Link>
        
        <Link
          href="https://open.spotify.com/playlist/5v6rho05qMtlqC829KfDjR?si=6c24c3429da74d65"
          target="_blank"
          rel="noopener noreferrer"
          className="group flex items-center gap-3 bg-white/10 backdrop-blur-sm text-white px-6 py-3 rounded-lg hover:bg-white/20 transition-all duration-300 border border-white/20"
        >
          <Music className="w-5 h-5" />
          <span>Spotify</span>
        </Link>
      </div>

      {/* Content Background */}
      <div className="absolute inset-0 bg-gradient-to-r from-black/60 via-black/30 to-transparent pointer-events-none"></div>
      
      {/* Hero Section */}
      <div className="text-center sm:text-left max-w-2xl mb-16 mt-16 relative z-10">
        <h1 className="text-5xl md:text-7xl font-bold text-white mb-8 tracking-tight">
          some chick's
          <span className="block text-[#b19cd9]">vinyl collection</span>
        </h1>
        
        <div className="flex flex-col sm:flex-row gap-4 items-center sm:items-start">
          <Link 
            href="/catalog"
            className="group bg-gradient-to-r from-[#b19cd9] to-[#9b7bb8] text-white font-semibold px-8 py-4 rounded-lg text-lg hover:from-[#9b7bb8] hover:to-[#b19cd9] transition-all duration-300 transform hover:scale-105 hover:shadow-2xl flex items-center gap-2"
          >
            View Catalog
            <ArrowRight className="w-5 h-5 group-hover:translate-x-1 transition-transform" />
          </Link>
        </div>
      </div>

      {/* About Section */}
      <div className="max-w-xl text-center sm:text-left relative z-10">
        <h2 className="text-3xl md:text-4xl font-bold text-white mb-6">
          About the Collection
        </h2>
        <p className="text-lg text-white/80 leading-relaxed mb-8">
          This is my personal vinyl collection, managed by AI to keep track of albums, artists, and release dates. 
          Browse through the catalog to explore what's on the shelves and discover new music.
        </p>
      </div>

      {/* Footer */}
      <div className="text-center sm:text-left relative z-10">
        <p className="text-white/60 text-sm">
          Built with Next.js, Supabase, and OpenAI
        </p>
      </div>
    </div>
  );
} 