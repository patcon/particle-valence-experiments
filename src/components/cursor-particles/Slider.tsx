import { styles } from "./styles";

interface SliderProps {
  label: string;
  value: number;
  min: number;
  max: number;
  step: number;
  onChange: (value: number) => void;
  fmt?: (v: number) => string | number;
}

export function Slider({ label, value, min, max, step, onChange, fmt = (v) => v }: SliderProps) {
  return (
    <label style={styles.sliderLabel}>
      <span style={styles.sliderText}>
        {label} <b>{fmt(value)}</b>
      </span>
      <input
        type="range" min={min} max={max} step={step}
        value={value}
        onChange={(ev) => onChange(parseFloat(ev.target.value))}
        style={{ width: "100%" }}
      />
    </label>
  );
}
