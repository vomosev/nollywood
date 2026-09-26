'use client';

import { useCallback, useEffect, useRef, useState } from 'react';
import EmptyState from '../ui/EmptyState';

const PROGRESS_INTERVAL_MS = 10000;

export default function VideoPlayer({ movie, onProgress }) {
  const videoRef = useRef(null);
  const lastSentRef = useRef(0);
  const [mediaError, setMediaError] = useState('');

  const streamUrl = movie && movie.stream_url ? movie.stream_url : '';
  const title = movie && movie.title ? movie.title : 'this title';

  useEffect(() => {
    lastSentRef.current = 0;
    setMediaError('');
  }, [streamUrl]);

  const handleTimeUpdate = useCallback(
    (event) => {
      if (typeof onProgress !== 'function') return;
      const node = event && event.currentTarget;
      if (!node) return;
      const seconds = Math.floor(node.currentTime || 0);
      const now = Date.now();
      if (now - lastSentRef.current < PROGRESS_INTERVAL_MS) return;
      lastSentRef.current = now;
      try {
        onProgress(seconds);
      } catch (err) {
        // Never let a progress-save failure break playback.
        console.error('Failed to record watch progress', err);
      }
    },
    [onProgress]
  );

  const handleEnded = useCallback(
    (event) => {
      if (typeof onProgress !== 'function') return;
      const node = event && event.currentTarget;
      const seconds = node ? Math.floor(node.duration || node.currentTime || 0) : 0;
      lastSentRef.current = Date.now();
      try {
        onProgress(seconds);
      } catch (err) {
        console.error('Failed to record watch progress', err);
      }
    },
    [onProgress]
  );

  const handleError = useCallback(() => {
    setMediaError('We could not start playback for this title. Please try again shortly.');
  }, []);

  useEffect(() => {
    const node = videoRef.current;
    return () => {
      if (node && typeof onProgress === 'function') {
        const seconds = Math.floor(node.currentTime || 0);
        if (seconds > 0) {
          try {
            onProgress(seconds);
          } catch (err) {
            console.error('Failed to record watch progress', err);
          }
        }
      }
    };
  }, [onProgress]);

  if (!streamUrl) {
    return (
      <div className="player">
        <div className="player__fallback">
          <EmptyState
            variant="empty"
            title="Streaming unavailable"
            message="This title is not yet licensed for streaming in your region. Add it to your watchlist and we will let you know the moment it lands."
          />
        </div>
      </div>
    );
  }

  if (mediaError) {
    return (
      <div className="player">
        <div className="player__fallback">
          <EmptyState
            variant="error"
            title="Playback problem"
            message={mediaError}
          />
        </div>
      </div>
    );
  }

  return (
    <div className="player">
      <video
        ref={videoRef}
        className="player__video"
        controls
        playsInline
        preload="metadata"
        onTimeUpdate={handleTimeUpdate}
        onEnded={handleEnded}
        onError={handleError}
        aria-label={`Streaming ${title}`}
      >
        <source src={streamUrl} />
        Your browser cannot play this stream. Try a recent version of Chrome, Firefox or Safari.
      </video>
    </div>
  );
}