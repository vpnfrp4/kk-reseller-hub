import { useEffect, useState, useRef } from "react";
import { useLocation } from "react-router-dom";

export default function RouteProgressBar() {
  const location = useLocation();
  const [progress, setProgress] = useState(0);
  const [visible, setVisible] = useState(false);
  const prevPath = useRef(location.pathname);
  const timer = useRef<ReturnType<typeof setTimeout>>();

  useEffect(() => {
    if (location.pathname === prevPath.current) return;
    prevPath.current = location.pathname;

    // Start
    setVisible(true);
    setProgress(0);

    // Quick jump to ~70%
    requestAnimationFrame(() => setProgress(70));

    // Creep to 90%
    timer.current = setTimeout(() => setProgress(90), 300);

    // Complete after a short delay
    const done = setTimeout(() => {
      setProgress(100);
      setTimeout(() => {
        setVisible(false);
        setProgress(0);
      }, 200);
    }, 500);

    return () => {
      clearTimeout(timer.current);
      clearTimeout(done);
    };
  }, [location.pathname]);

  if (!visible && progress === 0) return null;

  return (
    <div className="fixed top-0 left-0 right-0 z-[9999] h-[2.5px] pointer-events-none">
      <div
        className="h-full bg-primary shadow-[0_0_8px_hsl(var(--primary)/0.5)] rounded-r-full"
        style={{
          width: `${progress}%`,
          transition: progress === 0
            ? "none"
            : progress === 100
              ? "width 150ms ease-out, opacity 200ms ease-out"
              : "width 400ms cubic-bezier(0.4, 0, 0.2, 1)",
          opacity: progress === 100 ? 0 : 1,
        }}
      />
    </div>
  );
}
