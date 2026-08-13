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
    <div className={cn("flex flex-col items-center", wide && "w-full")}>
      <div
        className={cn(
          "inline-flex overflow-hidden rounded-full border border-booking-secondary [&_label]:text-base",
          wide ? "w-full" : "min-w-[200px]",
          checked && "bg-booking-secondary/10",
        )}
      >
        <Radio
          checked={checked}
          className={cn("w-full px-5 py-3", wide ? "justify-start" : "justify-center")}
          id={id}
          label={label}
          name={name}
          onChange={onChange}
          value={value}
        />
      </div>
      {hint ? <p className="mt-1.5 pb-3 text-center text-base font-medium text-booking-text">{hint}</p> : null}
    </div>
  );
};

export default ChoicePill;
