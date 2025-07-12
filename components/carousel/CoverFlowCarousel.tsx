'use client';

import React, { useState, useEffect, useRef, useCallback } from 'react';
import Image from 'next/image';
import classNames from 'classnames';

export interface CarouselItem {
  id: string;
  src: string;
  alt: string;
  title?: string;
  artist?: string;
  year?: number;
}

interface CoverFlowCarouselProps {
  items: CarouselItem[];
  initialIndex?: number;
  onItemSelect?: (item: CarouselItem, index: number) => void;
  className?: string;
  showTitle?: boolean;
}

export function CoverFlowCarousel({
  items,
  initialIndex = 0,
  onItemSelect,
  className,
  showTitle = false
}: CoverFlowCarouselProps) {
  const [currentIndex, setCurrentIndex] = useState(initialIndex);
  const containerRef = useRef<HTMLDivElement>(null);

  const handleItemClick = useCallback((index: number) => {
    if (index !== currentIndex) {
      setCurrentIndex(index);
      onItemSelect?.(items[index], index);
    }
  }, [currentIndex, items, onItemSelect]);

  const handleKeyDown = useCallback((e: KeyboardEvent) => {
    if (e.key === 'ArrowLeft' && currentIndex > 0) {
      const newIndex = currentIndex - 1;
      setCurrentIndex(newIndex);
      onItemSelect?.(items[newIndex], newIndex);
    } else if (e.key === 'ArrowRight' && currentIndex < items.length - 1) {
      const newIndex = currentIndex + 1;
      setCurrentIndex(newIndex);
      onItemSelect?.(items[newIndex], newIndex);
    }
  }, [currentIndex, items, onItemSelect]);



  useEffect(() => {
    const container = containerRef.current;
    if (!container) return;

    container.addEventListener('keydown', handleKeyDown);

    return () => {
      container.removeEventListener('keydown', handleKeyDown);
    };
  }, [handleKeyDown]);

  const getItemStyle = (index: number) => {
    const distance = index - currentIndex;
    const absDistance = Math.abs(distance);
    const isCenter = absDistance < 0.1;
    
    // Smooth interpolation functions
    const easeOutQuart = (t: number) => 1 - Math.pow(1 - t, 4);
    
    // Scale center album larger than others, all reduced by 10%
    let scale = 1;
    if (isCenter) {
      scale = 1.08; // 1.2 * 0.9
    } else {
      scale = 0.9; // 1.0 * 0.9
    }
    
    // No rotation - all albums face forward
    let rotateY = 0;
    
    // Smooth horizontal positioning
    let translateX = 0;
    if (!isCenter) {
      const baseOffset = 200;
      const exponentialSpacing = baseOffset * Math.sign(distance) * Math.pow(absDistance, 0.8);
      translateX = exponentialSpacing;
    }
    
    // Smooth depth positioning
    let translateZ = 0;
    if (!isCenter) {
      const depthCurve = easeOutQuart(Math.min(1, absDistance / 3));
      translateZ = -150 * depthCurve;
    }
    
    // Darkness overlay instead of transparency
    let opacity = 1;
    let darknessOverlay = 0;
    if (!isCenter) {
      // Fade to darker as distance increases
      darknessOverlay = Math.min(0.8, absDistance * 0.4);
    }
    
    const zIndex = Math.round(1000 - absDistance * 100);
    
    return {
      transform: `translateX(${translateX}px) translateZ(${translateZ}px) rotateY(${rotateY}deg) scale(${scale})`,
      opacity,
      zIndex,
      transition: 'all 600ms cubic-bezier(0.25, 0.46, 0.45, 0.94)',
      transformOrigin: 'center bottom',
      '--darkness-overlay': darknessOverlay,
    };
  };

      return (
      <div
        ref={containerRef}
        className={classNames(
          'relative w-full overflow-hidden bg-gradient-to-b from-gray-900 to-black',
          'flex flex-col select-none',
          className
        )}
        style={{ 
          perspective: '1200px',
          perspectiveOrigin: 'center center'
        }}
        tabIndex={0}
        role="listbox"
        aria-label="Cover flow carousel"
      >
      {showTitle && (
        <div className="text-center py-8">
          <h2 className="text-3xl font-bold text-[#0277BD] opacity-50 mb-2">Featured Albums</h2>
        </div>
      )}
      
      <div className="relative flex items-center justify-center w-full flex-1">
        {items.map((item, index) => (
          <CarouselItemComponent
            key={item.id}
            item={item}
            isActive={index === currentIndex}
            style={getItemStyle(index)}
            onClick={() => handleItemClick(index)}
          />
        ))}
      </div>
    </div>
  );
}

interface CarouselItemProps {
  item: CarouselItem;
  isActive: boolean;
  style: React.CSSProperties;
  onClick: () => void;
}

function CarouselItemComponent({ item, isActive, style, onClick }: CarouselItemProps) {
  const [flipped, setFlipped] = useState(false);
  const darknessOverlay = (style as any)['--darkness-overlay'] || 0;
  
  const handleClick = () => {
    if (isActive) {
      setFlipped((prev) => !prev);
    } else {
      onClick();
    }
  };
  
  return (
    <div
      className="absolute flex flex-col items-center cursor-pointer group"
      style={style}
      onClick={handleClick}
      role="option"
      aria-selected={isActive}
      tabIndex={-1}
    >
      <div className="relative">
        <div 
          className={classNames(
            'relative transition-transform duration-500',
            '[transform-style:preserve-3d]',
            flipped ? '[transform:rotateY(180deg)]' : ''
          )}
          style={{ minHeight: 0 }}
        >
          {/* Front - Album Cover */}
          <div className="[backface-visibility:hidden]">
            <Image
              src={item.src}
              alt={item.alt}
              width={288}
              height={288}
              className={classNames(
                'w-56 h-56 md:w-72 md:h-72 object-cover rounded-lg shadow-2xl',
                'transition-shadow duration-300',
                isActive ? 'shadow-white/20' : 'shadow-black/60',
                'group-hover:shadow-white/10'
              )}
              draggable={false}
            />
            
            {/* Darkness overlay for non-center items */}
            {darknessOverlay > 0 && (
              <div
                className="absolute inset-0 bg-black rounded-lg pointer-events-none transition-opacity duration-600"
                style={{ opacity: darknessOverlay }}
              />
            )}
          </div>
          
          {/* Back - Album Details */}
          <div className="absolute top-0 left-0 w-56 h-56 md:w-72 md:h-72 flex flex-col items-center justify-center bg-[#fafafa] [backface-visibility:hidden] [transform:rotateY(180deg)] p-4 md:p-6 rounded-lg shadow-2xl">
            <h3 className="text-xl font-bold text-gray-900 text-center mb-2 leading-tight">
              {item.title}
            </h3>
            <p className="text-lg text-gray-700 text-center mb-2">
              {item.artist}
            </p>
            {item.year && (
              <p className="text-md text-gray-600 text-center">
                {item.year}
              </p>
            )}
          </div>
        </div>
        
        {/* Reflection effect */}
        <div
          className="absolute top-full left-0 w-full h-full opacity-20 pointer-events-none"
          style={{
            background: `url(${item.src})`,
            backgroundSize: 'cover',
            backgroundPosition: 'center',
            transform: 'scaleY(-1)',
            maskImage: 'linear-gradient(to bottom, rgba(0,0,0,0.3) 0%, transparent 70%)',
            WebkitMaskImage: 'linear-gradient(to bottom, rgba(0,0,0,0.3) 0%, transparent 70%)',
          }}
        />
      </div>
      
    </div>
  );
}