import { Hero } from "../components/Hero";
import { Features } from "../components/Features";
import { HowItWorks } from "../components/HowItWorks";
import { CodeExample } from "../components/CodeExample";
import { Stats } from "../components/Stats";

export function Home() {
  return (
    <main>
      <Hero />
      <Features />
      <HowItWorks />
      <CodeExample />
      <Stats />
    </main>
  );
}
