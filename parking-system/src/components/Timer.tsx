import { useState, useEffect } from "react";
import { Clock } from "lucide-react";
import { formatBrazilianCurrency } from "@/utils/formatters";

interface TimerProps {
  entryTime: string;
  className?: string;
  showFee?: boolean;
  vehicleType?: 'car' | 'motorcycle';
  compact?: boolean;
}

interface Duration {
  hours: number;
  minutes: number;
  seconds: number;
  formatted: string;
}

export function Timer({ entryTime, className = "", showFee = false, vehicleType = 'car', compact = false }: TimerProps) {
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

      // Calculate estimated fee based on vehicle type (no minimum fee, starts from 0)
      const durationMinutes = diffMs / (1000 * 60);
      // Cars: R$10/hour = R$0.1667/min, Motorcycles: R$7/hour = R$0.1167/min
      const ratePerMinute = vehicleType === 'car' ? (10 / 60) : (7 / 60);
      const fee = durationMinutes * ratePerMinute;
      setEstimatedFee(formatBrazilianCurrency(fee));
    };

    // Calculate immediately
    calculateDuration();

    // Update every second
    const interval = setInterval(calculateDuration, 1000);

    return () => clearInterval(interval);
  }, [entryTime]);

  return (
    <div className={`inline-flex items-center gap-1 ${className}`}>
      <Clock className="w-3 h-3 flex-shrink-0" />
      <span className="font-mono text-xs font-medium leading-none">
        {duration.formatted}
      </span>
      {showFee && (
        <span className="text-xs text-gray-500 ml-1 leading-none">
          (R$ {estimatedFee})
        </span>
      )}
    </div>
  );
}