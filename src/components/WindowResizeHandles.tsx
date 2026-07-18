import { useEffect, useRef } from "react";

/**
 * Invisible resize handles rendered along the edges and corners of the window.
 * These call Tauri's `startResizeDragging` API to let the user resize the
 * window by dragging near any edge or corner.
 *
 * Only rendered on desktop when the window is not maximized/fullscreen.
 */

type ResizeDirection =
  | "North"
  | "South"
  | "East"
  | "West"
  | "NorthEast"
  | "NorthWest"
  | "SouthEast"
  | "SouthWest";

const EDGE_SIZE = 6; // px – width of the grab area along edges
const CORNER_SIZE = 12; // px – size of the grab area at corners

interface Handle {
  direction: ResizeDirection;
  style: React.CSSProperties;
  cursor: string;
}

const handles: Handle[] = [
  // Edges
  {
    direction: "North",
    style: { top: 0, left: CORNER_SIZE, right: CORNER_SIZE, height: EDGE_SIZE },
    cursor: "n-resize",
  },
  {
    direction: "South",
    style: { bottom: 0, left: CORNER_SIZE, right: CORNER_SIZE, height: EDGE_SIZE },
    cursor: "s-resize",
  },
  {
    direction: "West",
    style: { left: 0, top: CORNER_SIZE, bottom: CORNER_SIZE, width: EDGE_SIZE },
    cursor: "w-resize",
  },
  {
    direction: "East",
    style: { right: 0, top: CORNER_SIZE, bottom: CORNER_SIZE, width: EDGE_SIZE },
    cursor: "e-resize",
  },
  // Corners
  {
    direction: "NorthWest",
    style: { top: 0, left: 0, width: CORNER_SIZE, height: CORNER_SIZE },
    cursor: "nw-resize",
  },
  {
    direction: "NorthEast",
    style: { top: 0, right: 0, width: CORNER_SIZE, height: CORNER_SIZE },
    cursor: "ne-resize",
  },
  {
    direction: "SouthWest",
    style: { bottom: 0, left: 0, width: CORNER_SIZE, height: CORNER_SIZE },
    cursor: "sw-resize",
  },
  {
    direction: "SouthEast",
    style: { bottom: 0, right: 0, width: CORNER_SIZE, height: CORNER_SIZE },
    cursor: "se-resize",
  },
];

export default function WindowResizeHandles() {
  const windowRef = useRef<any>(null);

  useEffect(() => {
    import("@tauri-apps/api/window").then((m) => {
      windowRef.current = m.getCurrentWindow();
    });
  }, []);

  const handleMouseDown = (direction: ResizeDirection) => (e: React.MouseEvent) => {
    e.preventDefault();
    e.stopPropagation();
    windowRef.current?.startResizeDragging(direction);
  };

  return (
    <>
      {handles.map((h) => (
        <div
          key={h.direction}
          onMouseDown={handleMouseDown(h.direction)}
          style={{
            position: "absolute",
            zIndex: 9999,
            cursor: h.cursor,
            // Transparent but still captures mouse events
            background: "transparent",
            ...h.style,
          }}
        />
      ))}
    </>
  );
}
