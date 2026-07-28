import type { Metadata } from "next";
import SecurityConsoleGame from "./security-console-game";

export const metadata: Metadata = {
  title: "Пульт охраны — low poly 3D",
  description:
    "Играбельный 3D-прототип симулятора охранного предприятия в уютном загородном посёлке.",
};

export default function Home() {
  return <SecurityConsoleGame />;
}
