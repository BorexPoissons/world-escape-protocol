import { useEffect, useState, useRef } from "react";

interface TypewriterTextProps {
  text: string;
  speed?: number; // ms per character — default 22ms (fast reader)
  onDone?: () => void;
  className?: string;
}

export default function TypewriterText({
  text,
  speed = 22,
  onDone,
  className,
}: TypewriterTextProps) {
  const [displayed, setDisplayed] = useState("");
  const [done, setDone] = useState(false);
  const indexRef = useRef(0);
  const timerRef = useRef<ReturnType<typeof setInterval> | null>(null);

  useEffect(() => {
    // Reset on text change
    setDisplayed("");
    setDone(false);
    indexRef.current = 0;

    timerRef.current = setInterval(() => {
      indexRef.current += 1;
      setDisplayed(text.slice(0, indexRef.current));
      if (indexRef.current >= text.length) {
        clearInterval(timerRef.current!);
        setDone(true);
        onDone?.();
      }
    }, speed);

    return () => {
      if (timerRef.current) clearInterval(timerRef.current);
    };
  }, [text, speed]);

  return (
    <span className={className}>
      <span className="whitespace-pre-line">{displayed}</span>
      {!done && (
        <span
          className="inline-block w-[2px] h-[1.1em] ml-[1px] align-middle animate-pulse"
          style={{ backgroundColor: "hsl(var(--primary))", verticalAlign: "text-bottom" }}
        />
      )}
    </span>
  );
}
