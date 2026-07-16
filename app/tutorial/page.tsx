import type { Metadata } from "next";
import TutorialGuide from "@/components/TutorialGuide";

export const metadata: Metadata = { title: "Tutorial" };

export default function TutorialPage() {
  return (
    <>
      <div className="page-header tutorial-page-header">
        <div>
          <span className="badge badge-emesso">Centro assistenza</span>
          <h1>Come funziona l’applicazione</h1>
          <p>Scegli un argomento e segui la guida passo dopo passo.</p>
        </div>
      </div>
      <TutorialGuide />
    </>
  );
}
