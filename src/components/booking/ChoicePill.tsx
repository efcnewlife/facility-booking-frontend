import { Radio, cn } from "@efcnewlife/newlife-ui";

interface ChoicePillProps {
  id: string;
  name: string;
  value: string;
  checked: boolean;
  label: string;
  hint?: string;
  wide?: boolean;
  onChange: (value: string) => void;
}

const ChoicePill = ({ id, name, value, checked, label, hint, wide, onChange }: ChoicePillProps) => {
  return (
    <div className="flex flex-col items-center">
      <div
        className={cn(
          "inline-flex items-center justify-center rounded-full border border-booking-secondary px-3 py-2",
          wide ? "w-[166px] justify-start" : "min-w-[120px]",
          checked && "bg-booking-secondary/10",
        )}
      >
        <Radio checked={checked} id={id} label={label} name={name} onChange={onChange} value={value} />
      </div>
      {hint ? (
        <p className="mt-1 pb-2.5 text-center text-xs font-medium text-booking-text">{hint}</p>
      ) : null}
    </div>
  );
};

export default ChoicePill;
