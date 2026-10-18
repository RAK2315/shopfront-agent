import { DeadEnd } from "@/components/ui/dead-end";

export default function NotFound() {
  return (
    <DeadEnd eyebrow="404" title="Nothing lives at this address">
      <p>The page may have moved, or the link was cut short. The shop and the live wire are one click away.</p>
    </DeadEnd>
  );
}
