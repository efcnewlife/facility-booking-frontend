import AppLocaleSelect from "@/components/auth/AppLocaleSelect";
import { cn } from "@efcnewlife/newlife-ui";

interface AuthLocaleSelectProps {
  className?: string;
}

const AuthLocaleSelect = ({ className }: AuthLocaleSelectProps) => {
  return <AppLocaleSelect className={cn("w-full sm:w-[180px]", className)} id="auth-locale-select" />;
};

export default AuthLocaleSelect;
