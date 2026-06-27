import { Menu } from "./Menu";

type HomeEntryProps = {
  balance: number;
  theme: "arcade" | "neon";
  username: string;
  onUsernameChange: (name: string) => void;
  onSingle: () => void;
  onMultiplayer: () => void;
};

export function HomeEntry(props: HomeEntryProps) {
  return <Menu {...props} />;
}
