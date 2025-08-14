import { useCallback, useEffect, useRef, useState } from "react";

interface DragScrollState {
  x: number;
  y: number;
}

export function useDragScroll(isDragging: boolean) {
  const [dragScroll, setDragScroll] = useState<DragScrollState>({ x: 0, y: 0 });
  const boardRef = useRef<HTMLDivElement>(null);

  const handleDragMove = useCallback(
    (e: MouseEvent) => {
      if (!boardRef.current || !isDragging) return;

      const board = boardRef.current;
      const rect = board.getBoundingClientRect();

      // Calculate scroll zones (20px from edges)
      const scrollZone = 20;
      const scrollSpeed = 5;

      let scrollX = 0;
      let scrollY = 0;

      // Horizontal scrolling
      if (e.clientX < rect.left + scrollZone) {
        scrollX = -scrollSpeed;
      } else if (e.clientX > rect.right - scrollZone) {
        scrollX = scrollSpeed;
      }

      // Vertical scrolling
      if (e.clientY < rect.top + scrollZone) {
        scrollY = -scrollSpeed;
      } else if (e.clientY > rect.bottom - scrollZone) {
        scrollY = scrollSpeed;
      }

      setDragScroll({ x: scrollX, y: scrollY });
    },
    [isDragging]
  );

  // Add event listeners
  useEffect(() => {
    if (isDragging) {
      window.addEventListener("mousemove", handleDragMove);
      return () => {
        window.removeEventListener("mousemove", handleDragMove);
      };
    }
  }, [isDragging, handleDragMove]);

  // Auto-scrolling during drag
  useEffect(() => {
    if (!isDragging || !boardRef.current) return;

    const board = boardRef.current;
    let animationFrame: number;

    const autoScroll = () => {
      if (dragScroll.x !== 0) {
        board.scrollLeft += dragScroll.x;
      }
      if (dragScroll.y !== 0) {
        board.scrollTop += dragScroll.y;
      }
      animationFrame = requestAnimationFrame(autoScroll);
    };

    if (isDragging) {
      animationFrame = requestAnimationFrame(autoScroll);
    }

    return () => {
      if (animationFrame) {
        cancelAnimationFrame(animationFrame);
      }
    };
  }, [isDragging, dragScroll]);

  return { boardRef, dragScroll };
}
