import { ExamplesGallery } from "@/components/examples/examples-gallery";
import { exampleSummaries } from "@/lib/public-examples";

export const metadata = { title: "Examples · PharmaAgent OS" };
export default function ExamplesPage() {
  return <ExamplesGallery examples={exampleSummaries()} />;
}
