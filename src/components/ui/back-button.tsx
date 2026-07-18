import { useRouter } from "@tanstack/react-router";
import { ArrowLeft } from "lucide-react";

type BackButtonProps = {
  label?: string;
  className?: string;
};

export function BackButton({ label = "Voltar", className }: BackButtonProps) {
  const router = useRouter();
  const handleClick = () => {
    if (window.history.length > 1) {
      router.history.back();
    } else {
      router.navigate({ to: "/admin" });
    }
  };
  return (
    <button
      type="button"
      onClick={handleClick}
      className={
        className ??
        "inline-flex items-center gap-2 text-sm text-muted-foreground hover:text-foreground"
      }
    >
      <ArrowLeft className="size-4" /> {label}
    </button>
  );
}
