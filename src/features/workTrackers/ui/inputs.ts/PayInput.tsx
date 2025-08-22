"use client";
import { useEffect, useState } from "react";
import { inputClassName } from "../../constants";

type PayInputProps = {
  payCents: number;
  setPayCents: (payCents: number) => void;
};

export default function PayInput({ payCents, setPayCents }: PayInputProps) {
  const [payInput, setPayInput] = useState<string>("");
  useEffect(() => {
    setPayInput((payCents / 100).toFixed(2));
  }, [payCents]);
  function handlePayChange(e: React.ChangeEvent<HTMLInputElement>) {
    const raw = e.target.value;

    // Allow empty input for backspacing
    if (raw === "") {
      setPayInput("");
      setPayCents(0);
      return;
    }

    // Only allow numbers with max 2 decimals
    const validFormat = /^\d*\.?\d{0,2}$/;
    if (!validFormat.test(raw)) return;

    setPayInput(raw);

    const parsed = parseFloat(raw);
    if (!isNaN(parsed)) {
      setPayCents(Math.round(parsed * 100));
    }
  }
  return (
    <input
      type="number"
      className={inputClassName}
      step="0.01"
      min="0"
      value={payInput}
      onChange={handlePayChange}
      placeholder="0.00"
    />
  );
}
