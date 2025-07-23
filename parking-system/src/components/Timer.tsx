import { useState, useEffect } from "react";
import { Clock } from "lucide-react";

interface TimerProps {
  entryTime: string;
  className?: string;
  showFee?: boolean;
}

interface Duration {
  hours: number;
  minutes: number;
  seconds: number;
  formatted: string;
}

export function Timer({ entryTime, className = "", showFee = false }: TimerProps) {
  const [duration, setDuration] = useState<Duration>({
    hours: 0,
    minutes: 0,
    seconds: 0,
    formatted: "00:00:00"
  });
  const [estimatedFee, setEstimatedFee] = useState<string>("0.00");

  useEffect(() => {
    const calculateDuration = () => {
      const entry = new Date(entryTime);
      const now = new Date();
      const diffMs = now.getTime() - entry.getTime();

      const hours = Math.floor(diffMs / (1000 * 60 * 60));
      const minutes = Math.floor((diffMs % (1000 * 60 * 60)) / (1000 * 60));
      const seconds = Math.floor((diffMs % (1000 * 60)) / 1000);

      const formatted = `${hours.toString().padStart(2, '0')}:${minutes.toString().padStart(2, '0')}:${seconds.toString().padStart(2, '0')}`;

      setDuration({
        hours,
        minutes,
        seconds,
        formatted
      });

      // Calculate estimated fee (no minimum fee, starts from 0, R$0.05 per minute)
      const durationMinutes = diffMs / (1000 * 60);
      const fee = durationMinutes * 0.05; // R$0.05 per minute (R$3 per hour)
      setEstimatedFee(fee.toFixed(2));
    };

    // Calculate immediately
    calculateDuration();

    // Update every second
    const interval = setInterval(calculateDuration, 1000);

    return () => clearInterval(interval);
  }, [entryTime]);

  return (
    <div className={`inline-flex items-center gap-1 ${className}`}>
      <Clock className="w-3 h-3" />
      <span className="font-mono text-sm font-medium">
        {duration.formatted}
      </span>
      {showFee && (
        <span className="text-xs text-gray-500 ml-1">
          (R$ {estimatedFee})
        </span>
      )}
    </div>
  );
}