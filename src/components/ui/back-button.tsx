import { useRouter } from "@tanstack/react-router";
import { ArrowLeft } from "lucide-react";
import { Button } from "@/components/ui/button";

type BackButtonProps = {
  label?: string;
  fallbackTo?: string;
  className?: string;
};

export function BackButton({
  label = "Voltar",
  fallbackTo = "/admin",
  className = "mb-4",
}: BackButtonProps) {
  const router = useRouter();
  const handleClick = () => {
    if (typeof window !== "undefined" && window.history.length > 1) {
      router.history.back();
    } else {
      router.navigate({ to: fallbackTo });
    }
  };
  return (
    <Button variant="ghost" size="sm" className={className} onClick={handleClick}>
      <ArrowLeft className="size-4" /> {label}
    </Button>
  );
}
